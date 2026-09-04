import fs from 'fs';
import path from 'path';

// --- Retained 6 Free Models (Nano 30b removed due to EOL) ---
export const BENCHMARK_MODELS = [
  'moonshotai/kimi-k3',
  'nvidia/nemotron-3.5-lightning-30b-a3b',
  'google/gemma-4-31b-it',
  'nvidia/nemotron-3-super-120b-a12b',
  'openai/gpt-oss-20b',
  'nvidia/nemotron-3-ultra-550b-a55b', // Control reference
];

// --- 10 Project Zero Test Prompts ---
export const BENCHMARK_TESTS = [
  {
    id: 'TEST_1',
    name: 'Simple Definition',
    prompt:
      'What is a deterministic finite automaton (DFA)? Explain it in simple terms and give one small example.',
  },
  {
    id: 'TEST_2',
    name: 'DFA/NFA Concept',
    prompt:
      'What is the difference between a DFA and an NFA? Explain the difference clearly and give one example.',
  },
  {
    id: 'TEST_3',
    name: 'Formal Mathematics',
    prompt:
      'Give the formal 5-tuple definition of a DFA and explain the role of each component.',
  },
  {
    id: 'TEST_4',
    name: 'Pumping Lemma',
    prompt:
      'Explain the pumping lemma for regular languages and demonstrate how it can be used to prove that L = {0^n1^n | n >= 0} is not regular.',
  },
  {
    id: 'TEST_5',
    name: 'CFG/CYK',
    prompt:
      'Explain how the CYK algorithm works, including its CNF requirement, dynamic-programming table construction, and acceptance condition.',
  },
  {
    id: 'TEST_6',
    name: 'PDA Reasoning',
    prompt:
      'Explain the difference between a deterministic PDA and a non-deterministic PDA. Give a language that demonstrates why nondeterminism can be useful.',
  },
  {
    id: 'TEST_7',
    name: 'Turing Machine',
    prompt:
      'Explain the difference between a Turing machine acceptor and a Turing machine transducer. Give one concrete example of each.',
  },
  {
    id: 'TEST_8',
    name: 'Undecidability',
    prompt:
      'Explain the Halting Problem and why it is undecidable. Give the core diagonalization idea without skipping the logical contradiction.',
  },
  {
    id: 'TEST_9',
    name: 'Project Zero Debugging',
    prompt:
      'A DFA has states q0 and q1, q0 is initial, q1 is accepting, and transitions q0 --a--> q1 and q0 --b--> q0. A student claims this DFA accepts every binary string ending in "a". Is the claim correct? Explain precisely.',
  },
  {
    id: 'TEST_10',
    name: 'Agentic / Structured Reasoning',
    prompt:
      'A user asks: Build a DFA over {0,1} that accepts exactly the binary strings ending in 01. Before constructing anything, explain the required states and what each state represents. Then describe the transitions needed.',
  },
];

export function loadApiKey() {
  const rootEnvPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(rootEnvPath)) {
    const content = fs.readFileSync(rootEnvPath, 'utf8');
    for (const line of content.split('\n')) {
      const match = line.match(/^\s*NVIDIA_API_KEY\s*=\s*(.+?)\s*$/);
      if (match) {
        return match[1].replace(/^['"]|['"]$/g, '');
      }
    }
  }
  return process.env.NVIDIA_API_KEY || '';
}

/**
 * Safely writes a file atomically using a temporary file and rename.
 */
export function atomicWriteFileSync(targetPath, content) {
  const tempPath = `${targetPath}.tmp.${Date.now()}`;
  fs.writeFileSync(tempPath, content, 'utf8');
  fs.renameSync(tempPath, targetPath);
}

/**
 * Executes a single HTTP request with strict timeout.
 */
export async function executeSingleRequest(
  apiKey,
  model,
  prompt,
  timeoutMs = 120000
) {
  const endpoint = 'https://integrate.api.nvidia.com/v1/chat/completions';
  const startTime = Date.now();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1024,
        temperature: 0.2,
      }),
      signal: controller.signal,
    });

    clearTimeout(timer);
    const totalMs = Date.now() - startTime;
    const httpStatus = response.status;

    if (httpStatus === 429) {
      return {
        status: 'RATE_LIMITED',
        httpStatus,
        totalMs,
        outputChars: 0,
        error: 'HTTP 429 Rate limit exceeded',
        responseText: '',
      };
    }

    if (httpStatus === 404 || httpStatus === 400 || httpStatus === 410) {
      let errBody = '';
      try {
        errBody = JSON.stringify(await response.json());
      } catch {
        // ignore
      }
      return {
        status: 'UNAVAILABLE',
        httpStatus,
        totalMs,
        outputChars: 0,
        error: `HTTP ${httpStatus}: ${errBody}`,
        responseText: '',
      };
    }

    if (!response.ok) {
      return {
        status: 'SERVER_ERROR',
        httpStatus,
        totalMs,
        outputChars: 0,
        error: `HTTP ${httpStatus}`,
        responseText: '',
      };
    }

    const json = await response.json();
    const content = json.choices?.[0]?.message?.content || '';
    const completionTokens = json.usage?.completion_tokens;

    if (!content) {
      return {
        status: 'INVALID_RESPONSE',
        httpStatus,
        totalMs,
        outputChars: 0,
        error: 'Empty response content from endpoint',
        responseText: '',
      };
    }

    return {
      status: 'PASS',
      httpStatus,
      totalMs,
      outputChars: content.length,
      outputTokens: completionTokens,
      responseText: content,
    };
  } catch (err) {
    clearTimeout(timer);
    const totalMs = Date.now() - startTime;
    if (err.name === 'AbortError') {
      return {
        status: 'TIMEOUT',
        totalMs,
        outputChars: 0,
        error: `Request timed out after ${timeoutMs}ms`,
        responseText: '',
      };
    }
    return {
      status: 'FAIL',
      totalMs,
      outputChars: 0,
      error: err.message || 'Unknown network failure',
      responseText: '',
    };
  }
}

/**
 * Executes a benchmark test with at most one retry for transient errors.
 */
export async function runTestWithRetry(apiKey, model, prompt) {
  let attempts = 1;
  let firstAttempt = await executeSingleRequest(apiKey, model, prompt, 120000);
  const firstHttpStatus = firstAttempt.httpStatus;

  // Single retry for transient errors (429, 502, 503, 504, or TIMEOUT)
  const isTransient =
    firstAttempt.status === 'RATE_LIMITED' ||
    firstAttempt.status === 'SERVER_ERROR' ||
    firstAttempt.status === 'TIMEOUT';

  if (isTransient) {
    attempts++;
    const backoffMs = firstAttempt.status === 'RATE_LIMITED' ? 5000 : 2000;
    console.log(`  -> Transient issue (${firstAttempt.status}). Retrying once after ${backoffMs}ms...`);
    await new Promise((r) => setTimeout(r, backoffMs));

    const secondAttempt = await executeSingleRequest(apiKey, model, prompt, 120000);
    return {
      status: secondAttempt.status,
      attemptCount: attempts,
      firstHttpStatus,
      finalHttpStatus: secondAttempt.httpStatus,
      ttfbMs: 'NOT_AVAILABLE',
      totalMs: firstAttempt.totalMs + secondAttempt.totalMs,
      outputChars: secondAttempt.outputChars,
      outputTokens: secondAttempt.outputTokens,
      error: secondAttempt.error,
      responseText: secondAttempt.responseText,
    };
  }

  return {
    status: firstAttempt.status,
    attemptCount: attempts,
    firstHttpStatus,
    finalHttpStatus: firstAttempt.httpStatus,
    ttfbMs: 'NOT_AVAILABLE',
    totalMs: firstAttempt.totalMs,
    outputChars: firstAttempt.outputChars,
    outputTokens: firstAttempt.outputTokens,
    error: firstAttempt.error,
    responseText: firstAttempt.responseText,
  };
}

/**
 * Formats markdown report based on current benchmark payload.
 */
export function generateMarkdownReport(payload) {
  const modelStats = payload.models.map((model) => {
    const modelResults = payload.results.filter((r) => r.model === model);
    const passed = modelResults.filter((r) => r.status === 'PASS');
    const successRate =
      modelResults.length > 0
        ? `${((passed.length / modelResults.length) * 100).toFixed(1)}%`
        : '0.0%';
    const avgTotalMs =
      passed.length > 0
        ? Math.round(passed.reduce((acc, cur) => acc + cur.totalMs, 0) / passed.length)
        : 0;
    const avgChars =
      passed.length > 0
        ? Math.round(passed.reduce((acc, cur) => acc + cur.outputChars, 0) / passed.length)
        : 0;

    return {
      model,
      completed: modelResults.length,
      passed: passed.length,
      successRate,
      avgTotalMs,
      avgChars,
    };
  });

  return `# PROJECT ZERO FREE NVIDIA MODEL BENCHMARK REPORT
- **Timestamp**: ${payload.timestamp}
- **Progress**: ${payload.completedTests} / ${payload.totalExpectedTests} completed
- **Status**: ${payload.completed ? 'COMPLETED' : 'IN_PROGRESS'}
- **Started At**: ${payload.startedAt}
- **Last Updated At**: ${payload.lastUpdatedAt}

## Model Summary
| Model | Tests Run | Passed | Pass Rate | Avg Latency (ms) | Avg Output (chars) |
|---|---|---|---|---|---|
${modelStats.map((s) => `| \`${s.model}\` | ${s.completed}/${payload.testsPerModel} | ${s.passed} | ${s.successRate} | ${s.avgTotalMs}ms | ${s.avgChars} |`).join('\n')}

## Detailed Responses (${payload.results.length} recorded)
${payload.results.map((r) => `### [${r.model}] - ${r.testId}: ${r.testName}
- **Status**: ${r.status} (Attempts: ${r.attemptCount}, HTTP: ${r.finalHttpStatus ?? r.firstHttpStatus ?? 'N/A'})
- **Latency**: ${r.totalMs}ms
- **Output**: ${r.outputChars} chars (${r.outputTokens ? `${r.outputTokens} tokens` : 'N/A'})
${r.error ? `\n> Error: ${r.error}\n` : ''}
\`\`\`markdown
${r.responseText ? r.responseText.slice(0, 500) + (r.responseText.length > 500 ? '\n...(truncated)' : '') : '(No response text)'}
\`\`\`
`).join('\n\n')}
`;
}

/**
 * Main execution loop with incremental atomic persistence after EVERY test.
 */
export async function runBenchmark() {
  console.log('=== STARTING HARDENED PROJECT ZERO FREE NVIDIA MODEL BENCHMARK ===\n');

  const apiKey = loadApiKey();
  if (!apiKey) {
    console.error('ERROR: NVIDIA_API_KEY could not be found in .env.local or process.env.');
    process.exit(1);
  }

  const startTimeIso = new Date().toISOString();
  const runId = startTimeIso.replace(/[:.]/g, '-');
  const outputDir = path.resolve(
    process.cwd(),
    'scripts/benchmarks/project-zero-free-model-benchmark/results',
    runId
  );
  fs.mkdirSync(outputDir, { recursive: true });

  const totalExpectedTests = BENCHMARK_MODELS.length * BENCHMARK_TESTS.length;
  const payload = {
    benchmarkVersion: '1.0.0',
    timestamp: startTimeIso,
    models: BENCHMARK_MODELS,
    testsPerModel: BENCHMARK_TESTS.length,
    totalExpectedTests,
    completedTests: 0,
    completed: false,
    startedAt: startTimeIso,
    lastUpdatedAt: startTimeIso,
    results: [],
  };

  const jsonPath = path.join(outputDir, 'results.json');
  const reportPath = path.join(outputDir, 'report.md');

  // Initial atomic save of empty manifest
  atomicWriteFileSync(jsonPath, JSON.stringify(payload, null, 2));
  atomicWriteFileSync(reportPath, generateMarkdownReport(payload));

  for (const model of BENCHMARK_MODELS) {
    console.log(`\n========================================`);
    console.log(`EVALUATING MODEL: ${model}`);
    console.log(`========================================`);

    for (const test of BENCHMARK_TESTS) {
      console.log(`Running [${test.id}] ${test.name} on ${model}...`);
      const testResultData = await runTestWithRetry(apiKey, model, test.prompt);

      const fullResult = {
        model,
        testId: test.id,
        testName: test.name,
        ...testResultData,
      };

      console.log(`  -> ${fullResult.status} | Total: ${fullResult.totalMs}ms | Chars: ${fullResult.outputChars}`);

      // 1. Append result
      payload.results.push(fullResult);
      payload.completedTests = payload.results.length;
      payload.lastUpdatedAt = new Date().toISOString();
      if (payload.completedTests === totalExpectedTests) {
        payload.completed = true;
      }

      // 2. Incremental Atomic Persistence after every single test
      atomicWriteFileSync(jsonPath, JSON.stringify(payload, null, 2));
      atomicWriteFileSync(reportPath, generateMarkdownReport(payload));

      // Sequential throttle (500ms)
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  console.log(`\n=== BENCHMARK FINISHED ===`);
  console.log(`Final results saved to: ${outputDir}`);
}

// Run if called directly
if (process.argv[1] && (process.argv[1].endsWith('run.ts') || process.argv[1].endsWith('run.mjs'))) {
  runBenchmark().catch((err) => {
    console.error('Fatal benchmark error:', err);
    process.exit(1);
  });
}
