import type { IncomingMessage, ServerResponse } from 'http';
import { handleChatRequest } from '../../packages/ai-gateway/src/index';

export const config = {
  runtime: 'nodejs',
};

/**
 * Parses JSON body from Node.js IncomingMessage stream if not already pre-parsed by framework.
 */
async function parseRequestBody(req: IncomingMessage & { body?: unknown }): Promise<unknown> {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === 'string') {
      return req.body.trim() ? JSON.parse(req.body) : {};
    }
    return req.body;
  }

  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
    });
    req.on('end', () => {
      try {
        resolve(raw.trim() ? JSON.parse(raw) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Universal Vercel Node.js Serverless Function Handler for /api/ai/chat
 *
 * Directs traffic to canonical handleChatRequest in @project-zero/ai-gateway.
 * Keeps NVIDIA_API_KEY strictly server-side.
 */
export default async function handler(
  req: IncomingMessage & { method?: string; body?: unknown; headers?: Record<string, string | string[] | undefined> },
  res: ServerResponse & { status?: (code: number) => any; json?: (data: unknown) => any; setHeader: (name: string, value: string) => any; end: (data?: string) => any }
) {
  const method = req.method?.toUpperCase() || 'POST';

  // 1. Handle CORS Preflight
  if (method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Allow', 'POST, OPTIONS');
    if (typeof res.status === 'function') {
      res.status(204).end();
    } else {
      res.statusCode = 204;
      res.end();
    }
    return;
  }

  // 2. Reject unsupported methods
  if (method !== 'POST') {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Allow', 'POST, OPTIONS');
    const payload = JSON.stringify({
      error: {
        message: `Method Not Allowed. /api/ai/chat only accepts POST requests (received ${method}).`,
        type: 'validation_error',
        statusCode: 405,
      },
    });

    if (typeof res.status === 'function') {
      res.status(405).end(payload);
    } else {
      res.statusCode = 405;
      res.end(payload);
    }
    return;
  }

  // 3. Parse JSON Body safely
  let parsedBody: unknown;
  try {
    parsedBody = await parseRequestBody(req);
  } catch (_err) {
    res.setHeader('Content-Type', 'application/json');
    const payload = JSON.stringify({
      error: {
        message: 'Invalid JSON request payload',
        type: 'validation_error',
        statusCode: 400,
      },
    });

    if (typeof res.status === 'function') {
      res.status(400).end(payload);
    } else {
      res.statusCode = 400;
      res.end(payload);
    }
    return;
  }

  // 4. Delegate to Canonical AI Gateway
  try {
    const result = await handleChatRequest(parsedBody);
    res.setHeader('Content-Type', 'application/json');

    if (typeof res.status === 'function') {
      res.status(result.status);
      if (typeof res.json === 'function') {
        res.json(result.body);
      } else {
        res.end(JSON.stringify(result.body));
      }
    } else {
      res.statusCode = result.status;
      res.end(JSON.stringify(result.body));
    }
  } catch (err: unknown) {
    res.setHeader('Content-Type', 'application/json');
    const payload = JSON.stringify({
      error: {
        message: (err as Error).message || 'An internal error occurred processing AI chat request.',
        type: 'upstream_error',
        statusCode: 500,
      },
    });

    if (typeof res.status === 'function') {
      res.status(500).end(payload);
    } else {
      res.statusCode = 500;
      res.end(payload);
    }
  }
}
