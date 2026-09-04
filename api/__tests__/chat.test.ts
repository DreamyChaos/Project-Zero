import { describe, it, expect, vi } from 'vitest';
import { EventEmitter } from 'events';
import handler from '../ai/chat';
import * as aiGateway from '../../packages/ai-gateway/src/index';

function createMockReq(options: {
  method?: string;
  body?: unknown;
  rawBody?: string;
}) {
  const req = new EventEmitter() as any;
  req.method = options.method || 'POST';
  req.headers = { 'content-type': 'application/json' };
  req.body = options.body;

  if (options.rawBody !== undefined) {
    req.body = undefined;
    process.nextTick(() => {
      req.emit('data', Buffer.from(options.rawBody!));
      req.emit('end');
    });
  }

  return req;
}

function createMockRes() {
  const res: any = {
    statusCode: 200,
    headers: {} as Record<string, string>,
    body: '',
    setHeader(name: string, value: string) {
      this.headers[name.toLowerCase()] = value;
      return this;
    },
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(data: unknown) {
      this.body = JSON.stringify(data);
      return this;
    },
    end(data?: string) {
      if (data) {
        this.body = data;
      }
      return this;
    },
  };
  return res;
}

describe('Vercel Node.js Serverless Function Adapter (api/ai/chat.ts)', () => {
  it('1. returns 204 for OPTIONS preflight request with appropriate CORS headers', async () => {
    const req = createMockReq({ method: 'OPTIONS' });
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(204);
    expect(res.headers['access-control-allow-methods']).toContain('POST');
    expect(res.headers['access-control-allow-origin']).toBe('*');
  });

  it('2. returns 405 for unsupported HTTP methods (GET, PUT, DELETE)', async () => {
    const req = createMockReq({ method: 'GET' });
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(405);
    expect(res.headers['allow']).toContain('POST');
    const parsed = JSON.parse(res.body);
    expect(parsed.error.message).toContain('Method Not Allowed');
  });

  it('3. processes valid POST request, delegates to handleChatRequest and preserves actionProposal', async () => {
    const mockHandleChat = vi.spyOn(aiGateway, 'handleChatRequest').mockResolvedValueOnce({
      status: 200,
      body: {
        id: 'resp-vercel-1',
        model: 'nvidia/nemotron-3-super-120b-a12b',
        message: { role: 'assistant', content: 'Here is your DFA.' },
        actionProposal: {
          version: '1.0.0',
          summary: 'DFA ending in 01',
          actions: [
            { id: 'act_1', type: 'CREATE_STATE', parameters: { label: 'q0', isInitial: true } },
            { id: 'act_2', type: 'CREATE_STATE', parameters: { label: 'q1', isAccepting: true } },
          ],
        },
      },
    });

    const payload = {
      messages: [{ role: 'user', content: 'Create a DFA over {0,1}' }],
    };

    const req = createMockReq({ method: 'POST', body: payload });
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    const parsed = JSON.parse(res.body);
    expect(parsed.model).toBe('nvidia/nemotron-3-super-120b-a12b');
    expect(parsed.actionProposal?.actions.length).toBe(2);
    expect(mockHandleChat).toHaveBeenCalledWith(payload);
  });

  it('4. handles streamed raw body when req.body is undefined', async () => {
    const payload = { messages: [{ role: 'user', content: 'Stream test' }] };
    vi.spyOn(aiGateway, 'handleChatRequest').mockResolvedValueOnce({
      status: 200,
      body: {
        id: 'resp-stream',
        model: 'nvidia/nemotron-3-super-120b-a12b',
        message: { role: 'assistant', content: 'Streamed body received' },
      },
    });

    const req = createMockReq({ method: 'POST', rawBody: JSON.stringify(payload) });
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    const parsed = JSON.parse(res.body);
    expect(parsed.message.content).toBe('Streamed body received');
  });

  it('5. returns 400 for malformed non-JSON payload without crashing', async () => {
    const req = createMockReq({ method: 'POST', rawBody: 'malformed non-json {{{' });
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
    const parsed = JSON.parse(res.body);
    expect(parsed.error.type).toBe('validation_error');
  });

  it('6. preserves gateway error responses and status codes', async () => {
    vi.spyOn(aiGateway, 'handleChatRequest').mockResolvedValueOnce({
      status: 400,
      body: {
        error: {
          message: 'Field "messages" must be a non-empty array.',
          type: 'validation_error',
          statusCode: 400,
        },
      },
    });

    const req = createMockReq({ method: 'POST', body: { messages: [] } });
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
    const parsed = JSON.parse(res.body);
    expect(parsed.error.type).toBe('validation_error');
  });
});
