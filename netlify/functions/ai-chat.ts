import { handleChatRequest } from '../../packages/ai-gateway/src/index';

/**
 * Netlify Serverless Function Adapter for Project Zero AI Gateway
 * Route: POST /api/ai/chat -> /.netlify/functions/ai-chat
 *
 * Invokes the canonical handleChatRequest from @project-zero/ai-gateway.
 * Keeps NVIDIA_API_KEY exclusively in the server runtime.
 */

// Modern Web Request handler (Netlify Functions v2)
export default async function (req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({
        error: {
          message: 'Method Not Allowed. /api/ai/chat only accepts POST requests.',
          type: 'validation_error',
          statusCode: 405,
        },
      }),
      {
        status: 405,
        headers: {
          'Content-Type': 'application/json',
          Allow: 'POST, OPTIONS',
        },
      }
    );
  }

  try {
    const rawBody = await req.text();
    const parsed = rawBody ? JSON.parse(rawBody) : {};
    const result = await handleChatRequest(parsed);

    return new Response(JSON.stringify(result.body), {
      status: result.status,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (err: unknown) {
    return new Response(
      JSON.stringify({
        error: {
          message: (err as Error).message || 'Invalid JSON request payload',
          type: 'validation_error',
          statusCode: 400,
        },
      }),
      {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
}

// AWS Lambda / Netlify Handler v1 compatibility interface
export interface NetlifyHandlerEvent {
  httpMethod?: string;
  body?: string | null;
  headers?: Record<string, string>;
}

export interface NetlifyHandlerResponse {
  statusCode: number;
  headers?: Record<string, string>;
  body: string;
}

export const handler = async (event: NetlifyHandlerEvent): Promise<NetlifyHandlerResponse> => {
  const method = event.httpMethod || 'POST';

  if (method === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: '',
    };
  }

  if (method !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Content-Type': 'application/json',
        Allow: 'POST, OPTIONS',
      },
      body: JSON.stringify({
        error: {
          message: 'Method Not Allowed. /api/ai/chat only accepts POST requests.',
          type: 'validation_error',
          statusCode: 405,
        },
      }),
    };
  }

  try {
    const parsed = event.body ? JSON.parse(event.body) : {};
    const result = await handleChatRequest(parsed);

    return {
      statusCode: result.status,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(result.body),
    };
  } catch (err: unknown) {
    return {
      statusCode: 400,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        error: {
          message: (err as Error).message || 'Invalid JSON request payload',
          type: 'validation_error',
          statusCode: 400,
        },
      }),
    };
  }
};
