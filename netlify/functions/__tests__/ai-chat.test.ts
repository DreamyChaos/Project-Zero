import { describe, it, expect, vi } from 'vitest';
import netlifyFunctionV2, { handler as netlifyHandlerV1 } from '../ai-chat';
import * as aiGateway from '../../../packages/ai-gateway/src/index';

describe('Netlify Serverless AI Gateway Function Adapter', () => {
  it('1. returns 204 for OPTIONS preflight request', async () => {
    // V2 Test
    const req = new Request('https://projectzero.netlify.app/api/ai/chat', {
      method: 'OPTIONS',
    });
    const res = await netlifyFunctionV2(req);
    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Methods')).toContain('POST');

    // V1 Test
    const resV1 = await netlifyHandlerV1({ httpMethod: 'OPTIONS' });
    expect(resV1.statusCode).toBe(204);
  });

  it('2. returns 405 for unsupported HTTP methods (GET, PUT, DELETE)', async () => {
    // V2 Test
    const req = new Request('https://projectzero.netlify.app/api/ai/chat', {
      method: 'GET',
    });
    const res = await netlifyFunctionV2(req);
    expect(res.status).toBe(405);
    const body = await res.json();
    expect(body.error.message).toContain('Method Not Allowed');

    // V1 Test
    const resV1 = await netlifyHandlerV1({ httpMethod: 'GET' });
    expect(resV1.statusCode).toBe(405);
  });

  it('3. processes valid POST request and invokes handleChatRequest', async () => {
    const mockHandleChat = vi.spyOn(aiGateway, 'handleChatRequest').mockResolvedValueOnce({
      status: 200,
      body: {
        id: 'resp-123',
        model: 'nvidia/nemotron-3-super-120b-a12b',
        message: { role: 'assistant', content: 'Here is your DFA.' },
        actionProposal: {
          version: '1.0.0',
          summary: 'DFA ending in 01',
          actions: [
            { id: 'a1', type: 'CREATE_STATE', parameters: { label: 'q0' } },
          ],
        },
      },
    });

    const payload = {
      messages: [{ role: 'user', content: 'Create a DFA' }],
    };

    // V2 Execution
    const req = new Request('https://projectzero.netlify.app/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const res = await netlifyFunctionV2(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.model).toBe('nvidia/nemotron-3-super-120b-a12b');
    expect(data.actionProposal?.actions.length).toBe(1);
    expect(mockHandleChat).toHaveBeenCalledWith(payload);
  });

  it('4. preserves 400 validation errors from handleChatRequest', async () => {
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

    const req = new Request('https://projectzero.netlify.app/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [] }),
    });

    const res = await netlifyFunctionV2(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error.type).toBe('validation_error');
  });

  it('5. handles malformed non-JSON payloads gracefully with 400', async () => {
    const req = new Request('https://projectzero.netlify.app/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'this is not valid json {{{',
    });

    const res = await netlifyFunctionV2(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error.type).toBe('validation_error');
  });

  it('6. preserves Netlify V1 handler contract with full payload and status', async () => {
    vi.spyOn(aiGateway, 'handleChatRequest').mockResolvedValueOnce({
      status: 200,
      body: {
        id: 'resp-v1',
        model: 'nvidia/nemotron-3-ultra-550b-a55b',
        message: { role: 'assistant', content: 'V1 response' },
      },
    });

    const resV1 = await netlifyHandlerV1({
      httpMethod: 'POST',
      body: JSON.stringify({ messages: [{ role: 'user', content: 'Hello' }] }),
    });

    expect(resV1.statusCode).toBe(200);
    const parsed = JSON.parse(resV1.body);
    expect(parsed.model).toBe('nvidia/nemotron-3-ultra-550b-a55b');
    expect(parsed.message.content).toBe('V1 response');
  });
});
