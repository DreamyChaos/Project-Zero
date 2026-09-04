import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================
// SECURITY: Load API key server-side only. Never log the value.
// ============================================================
function loadApiKey() {
  const rootEnvPath = path.resolve(__dirname, '../../../.env.local');
  if (fs.existsSync(rootEnvPath)) {
    const content = fs.readFileSync(rootEnvPath, 'utf8');
    for (const line of content.split('\n')) {
      const match = line.match(/^\s*NVIDIA_API_KEY\s*=\s*(.+?)\s*$/);
      if (match) return match[1].replace(/^['"]|['"]$/g, '');
    }
  }
  return process.env.NVIDIA_API_KEY || '';
}

// ============================================================
// Atomic write helpers
// ============================================================
function atomicWriteFileSync(targetPath, content) {
  const tempPath = `${targetPath}.tmp.${Date.now()}`;
  fs.writeFileSync(tempPath, content, 'utf8');
  fs.renameSync(tempPath, targetPath);
}

// ============================================================
// Model filtering: exclude non-chat/non-text-generation models
// ============================================================
const EXCLUDED_ID_PATTERNS = [
  /embed/i,         // embedding models
  /rerank/i,        // reranking models
  /safety/i,        // safety/moderation
  /guard/i,         // safety guard
  /parse/i,         // document parsing
  /reward/i,        // reward models
  /diffusion/i,     // image/video diffusion
  /codegemma/i,     // specialized code-only (not chat)
  /recurrent/i,     // recurrentgemma (not standard chat)
];

const EXCLUDED_EXACT = new Set([
  'nvidia/nemotron-3-embed-1b',
  'nvidia/nemotron-4-340b-reward',
  'nvidia/llama-3.1-nemotron-safety-guard-8b-v3',
  'nvidia/nemotron-3.5-content-safety',
  'nvidia/llama-nemotron-embed-vl-1b-v2',
  'nvidia/nemotron-parse',
  'google/recurrentgemma-2b',
  'google/codegemma-1.1-7b',
  'google/codegemma-7b',
]);

function isTextChatModel(modelId) {
  if (EXCLUDED_EXACT.has(modelId)) return false;
  for (const pat of EXCLUDED_ID_PATTERNS) {
    if (pat.test(modelId)) return false;
  }
  return true;
}

// ============================================================
// Catalog discovery
// ============================================================
async function discoverModels(apiKey) {
  console.log('Querying /v1/models catalog...');
  const res = await fetch('https://integrate.api.nvidia.com/v1/models', {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) throw new Error(`/v1/models returned HTTP ${res.status}`);
  const data = await res.json();
  const all = (data.data || []).map((m) => m.id || m);
  const chat = all.filter(isTextChatModel);
  console.log(`Catalog: ${all.length} total models, ${chat.length} text/chat candidates`);
  return { all, chat };
}

// ============================================================
// Single streaming request with TTFB + TTFT measurement
// ============================================================
async function measureModel(apiKey, modelId, timeoutMs = 30000) {
  const endpoint = 'https://integrate.api.nvidia.com/v1/chat/completions';
  const requestStart = Date.now();
  let ttfbMs = null;
  let ttftMs = null;
  let outputChars = 0;
  let outputTokens = null;
  let responseText = '';
  let httpStatus = null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelId,
        messages: [{ role: 'user', content: 'Reply with exactly: OK' }],
        max_tokens: 5,
        temperature: 0,
        stream: true,
      }),
      signal: controller.signal,
    });

    // TTFB = time to response headers
    ttfbMs = Date.now() - requestStart;
    httpStatus = res.status;

    if (res.status === 429) {
      clearTimeout(timer);
      return {
        requestStatus: 'RATE_LIMITED', httpStatus: res.status,
        ttfbMs, ttftMs: null, totalMs: Date.now() - requestStart,
        outputChars: 0, outputTokens: null, responseText: '',
        timedOut: false, rateLimited: true,
        error: 'HTTP 429 Rate limit',
      };
    }

    if (res.status === 404 || res.status === 400 || res.status === 410) {
      clearTimeout(timer);
      let errBody = '';
      try { errBody = JSON.stringify(await res.json()); } catch { /* ignore */ }
      return {
        requestStatus: 'UNAVAILABLE', httpStatus: res.status,
        ttfbMs, ttftMs: null, totalMs: Date.now() - requestStart,
        outputChars: 0, outputTokens: null, responseText: '',
        timedOut: false, rateLimited: false,
        error: `HTTP ${res.status}: ${errBody}`,
      };
    }

    if (!res.ok) {
      clearTimeout(timer);
      return {
        requestStatus: 'SERVER_ERROR', httpStatus: res.status,
        ttfbMs, ttftMs: null, totalMs: Date.now() - requestStart,
        outputChars: 0, outputTokens: null, responseText: '',
        timedOut: false, rateLimited: false,
        error: `HTTP ${res.status}`,
      };
    }

    // Read SSE stream
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop(); // keep incomplete line

      for (const line of lines) {
        if (!line.startsWith('data:')) continue;
        const raw = line.slice(5).trim();
        if (raw === '[DONE]') continue;
        try {
          const chunk = JSON.parse(raw);
          const content = chunk.choices?.[0]?.delta?.content;
          if (content && ttftMs === null) {
            ttftMs = Date.now() - requestStart;
          }
          if (content) responseText += content;
          // Capture usage if present
          if (chunk.usage?.completion_tokens) {
            outputTokens = chunk.usage.completion_tokens;
          }
        } catch { /* ignore malformed SSE */ }
      }
    }

    clearTimeout(timer);
    outputChars = responseText.length;
    const totalMs = Date.now() - requestStart;

    return {
      requestStatus: responseText ? 'PASS' : 'INVALID_RESPONSE',
      httpStatus,
      ttfbMs,
      ttftMs,
      totalMs,
      outputChars,
      outputTokens,
      responseText,
      timedOut: false,
      rateLimited: false,
      error: responseText ? null : 'Empty content in stream',
    };

  } catch (err) {
    clearTimeout(timer);
    const totalMs = Date.now() - requestStart;
    if (err.name === 'AbortError') {
      return {
        requestStatus: 'TIMEOUT', httpStatus,
        ttfbMs, ttftMs: null, totalMs,
        outputChars: 0, outputTokens: null, responseText: '',
        timedOut: true, rateLimited: false,
        error: `Timed out after ${timeoutMs}ms`,
      };
    }
    return {
      requestStatus: 'FAIL', httpStatus,
      ttfbMs, ttftMs: null, totalMs,
      outputChars: 0, outputTokens: null, responseText: '',
      timedOut: false, rateLimited: false,
      error: err.message || 'Network failure',
    };
  }
}

// ============================================================
// Markdown report generator
// ============================================================
function generateReport(payload) {
  const { results, completedModels, totalModels, startedAt, lastUpdatedAt, completed } = payload;

  const successful = results.filter((r) => r.requestStatus === 'PASS');
  const timeouts = results.filter((r) => r.requestStatus === 'TIMEOUT');
  const rateLimited = results.filter((r) => r.requestStatus === 'RATE_LIMITED');
  const serverErrors = results.filter((r) => r.requestStatus === 'SERVER_ERROR');
  const unavailable = results.filter((r) => r.requestStatus === 'UNAVAILABLE');
  const other = results.filter((r) =>
    !['PASS', 'TIMEOUT', 'RATE_LIMITED', 'SERVER_ERROR', 'UNAVAILABLE'].includes(r.requestStatus)
  );

  const ranked = [...successful].sort((a, b) => a.totalMs - b.totalMs);

  const fmtMs = (v) => (v == null ? 'N/A' : `${v}ms`);

  const tableRows = ranked.map((r, i) =>
    `| ${i + 1} | \`${r.model}\` | ✅ PASS | ${r.httpStatus} | ${fmtMs(r.ttfbMs)} | ${fmtMs(r.ttftMs)} | **${r.totalMs}ms** |`
  );

  const failRows = [
    ...timeouts.map((r) => `| — | \`${r.model}\` | ⏱ TIMEOUT | ${r.httpStatus ?? '—'} | — | — | >30s |`),
    ...rateLimited.map((r) => `| — | \`${r.model}\` | 🚫 RATE_LIMITED | ${r.httpStatus ?? '—'} | — | — | — |`),
    ...serverErrors.map((r) => `| — | \`${r.model}\` | ❌ SERVER_ERROR | ${r.httpStatus ?? '—'} | — | — | — |`),
    ...unavailable.map((r) => `| — | \`${r.model}\` | ⛔ UNAVAILABLE | ${r.httpStatus ?? '—'} | — | — | — |`),
    ...other.map((r) => `| — | \`${r.model}\` | ⚠️ ${r.requestStatus} | ${r.httpStatus ?? '—'} | — | — | — |`),
  ];

  const allRows = [...tableRows, ...failRows];

  // Speed category breakdown
  const buckets = { '<2s': [], '2-5s': [], '5-10s': [], '10-20s': [], '20-30s': [] };
  for (const r of successful) {
    if (r.totalMs < 2000) buckets['<2s'].push(r.model);
    else if (r.totalMs < 5000) buckets['2-5s'].push(r.model);
    else if (r.totalMs < 10000) buckets['5-10s'].push(r.model);
    else if (r.totalMs < 20000) buckets['10-20s'].push(r.model);
    else buckets['20-30s'].push(r.model);
  }

  const fastest = ranked[0];
  const fastestTtfb = [...successful].sort((a, b) => (a.ttfbMs ?? Infinity) - (b.ttfbMs ?? Infinity))[0];

  return `# PROJECT ZERO — NVIDIA FREE ENDPOINT SPEED SWEEP
- **Status**: ${completed ? '✅ COMPLETED' : '🔄 IN PROGRESS'}
- **Started**: ${startedAt}
- **Last updated**: ${lastUpdatedAt}
- **Progress**: ${completedModels} / ${totalModels} models

## Latency Rankings
| Rank | Model | Status | HTTP | TTFB | TTFT | Total |
|------|-------|--------|------|------|------|-------|
${allRows.join('\n')}

## Speed Categories (successful responses)
| Bucket | Models |
|--------|--------|
| < 2s   | ${buckets['<2s'].join(', ') || '—'} |
| 2–5s   | ${buckets['2-5s'].join(', ') || '—'} |
| 5–10s  | ${buckets['5-10s'].join(', ') || '—'} |
| 10–20s | ${buckets['10-20s'].join(', ') || '—'} |
| 20–30s | ${buckets['20-30s'].join(', ') || '—'} |
| > 30s  | ${[...timeouts].map((r) => r.model).join(', ') || '—'} |

## Summary
- **Fastest (total)**: ${fastest ? `\`${fastest.model}\` — ${fastest.totalMs}ms` : '—'}
- **Fastest TTFB**: ${fastestTtfb ? `\`${fastestTtfb.model}\` — ${fastestTtfb.ttfbMs}ms` : '—'}
- **Successful**: ${successful.length} / ${results.length}
- **Timeouts**: ${timeouts.length}
- **Rate limited**: ${rateLimited.length}
- **Server errors**: ${serverErrors.length}
- **Unavailable**: ${unavailable.length}

## Raw Results
${results.map((r) => `### \`${r.model}\`
- Status: **${r.requestStatus}** | HTTP: ${r.httpStatus ?? 'N/A'}
- TTFB: ${fmtMs(r.ttfbMs)} | TTFT: ${fmtMs(r.ttftMs)} | Total: ${fmtMs(r.totalMs)}
- Output: ${r.outputChars} chars | Tokens: ${r.outputTokens ?? 'N/A'}
${r.error ? `- Error: ${r.error}` : `- Response: \`${r.responseText}\``}
`).join('\n')}

---
*Production model remains: \`nvidia/nemotron-3-ultra-550b-a55b\` — UNCHANGED*
`;
}

// ============================================================
// Main speed sweep
// ============================================================
async function runSpeedSweep() {
  console.log('\n=== PROJECT ZERO — NVIDIA FREE ENDPOINT SPEED SWEEP ===\n');

  const apiKey = loadApiKey();
  if (!apiKey) {
    console.error('ERROR: NVIDIA_API_KEY not found in .env.local or process.env.');
    process.exit(1);
  }

  // Discover models from NVIDIA catalog
  const { all: allCatalog, chat: chatModels } = await discoverModels(apiKey);
  console.log(`\nText/chat models to sweep (${chatModels.length}):`);
  chatModels.forEach((m, i) => console.log(`  ${i + 1}. ${m}`));

  // Set up run directory
  const startedAt = new Date().toISOString();
  const runId = startedAt.replace(/[:.]/g, '-');
  const outputDir = path.resolve(__dirname, 'results', runId);
  fs.mkdirSync(outputDir, { recursive: true });

  const jsonPath = path.join(outputDir, 'results.json');
  const reportPath = path.join(outputDir, 'report.md');

  const payload = {
    sweepVersion: '2.0.0',
    type: 'SPEED_SWEEP',
    startedAt,
    lastUpdatedAt: startedAt,
    catalogTotal: allCatalog.length,
    totalModels: chatModels.length,
    completedModels: 0,
    completed: false,
    prompt: 'Reply with exactly: OK',
    maxTokens: 5,
    timeoutMs: 30000,
    results: [],
  };

  // Initial manifest write
  atomicWriteFileSync(jsonPath, JSON.stringify(payload, null, 2));
  atomicWriteFileSync(reportPath, generateReport(payload));

  // Sequential sweep — one request per model, no retries
  for (const modelId of chatModels) {
    console.log(`\n→ Testing: ${modelId}`);
    const result = await measureModel(apiKey, modelId, 30000);
    console.log(`  Status: ${result.requestStatus} | TTFB: ${result.ttfbMs ?? 'N/A'}ms | TTFT: ${result.ttftMs ?? 'N/A'}ms | Total: ${result.totalMs}ms`);

    payload.results.push({
      model: modelId,
      catalogListed: true,
      freeEndpoint: true,
      ...result,
    });
    payload.completedModels++;
    payload.lastUpdatedAt = new Date().toISOString();
    if (payload.completedModels === payload.totalModels) {
      payload.completed = true;
    }

    // Atomic persistence after every single model
    atomicWriteFileSync(jsonPath, JSON.stringify(payload, null, 2));
    atomicWriteFileSync(reportPath, generateReport(payload));

    // Modest inter-request delay (1 second)
    await new Promise((r) => setTimeout(r, 1000));
  }

  console.log(`\n=== SPEED SWEEP COMPLETE ===`);
  console.log(`Results: ${outputDir}`);
  console.log(`JSON:    ${jsonPath}`);
  console.log(`Report:  ${reportPath}`);

  // Print final summary to stdout
  const successful = payload.results.filter((r) => r.requestStatus === 'PASS');
  const ranked = [...successful].sort((a, b) => a.totalMs - b.totalMs);
  console.log(`\n--- FINAL LATENCY RANKING ---`);
  ranked.forEach((r, i) =>
    console.log(`  #${i + 1} ${r.model} — TTFB: ${r.ttfbMs}ms | TTFT: ${r.ttftMs ?? 'N/A'}ms | Total: ${r.totalMs}ms`)
  );
  console.log(`\nTimeouts:     ${payload.results.filter((r) => r.requestStatus === 'TIMEOUT').map((r) => r.model).join(', ') || 'none'}`);
  console.log(`Rate limited: ${payload.results.filter((r) => r.requestStatus === 'RATE_LIMITED').map((r) => r.model).join(', ') || 'none'}`);
  console.log(`Unavailable:  ${payload.results.filter((r) => r.requestStatus === 'UNAVAILABLE').map((r) => r.model).join(', ') || 'none'}`);
}

// Guard: only run if called directly
if (process.argv[1] && process.argv[1].endsWith('speed-sweep.mjs')) {
  runSpeedSweep().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}
