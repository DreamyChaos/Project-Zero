import { ChatRequest, ChatResponse } from './types';
import { DEFAULT_ROUTED_MODEL, PROJECT_ZERO_GENERAL_ASSISTANT_INSTRUCTION } from './constants';
import { isModelAllowed } from './modelRegistry';
import { validateChatRequest } from './validator';
import { serializeContextForPrompt } from './serializer';
import { extractActionProposal } from './actionValidator';

export interface NvidiaProviderConfig {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  fetchFn?: typeof fetch;
}

interface NvidiaChoice {
  message?: {
    role?: string;
    content?: string | null;
  };
}

interface NvidiaChatCompletionResponse {
  id?: string;
  choices?: NvidiaChoice[];
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  error?: {
    message?: string;
    type?: string;
    code?: string | number;
  };
}

export class NvidiaProvider {
  private apiKey: string;
  private baseUrl: string;
  private model: string;
  private fetchFn: typeof fetch;

  constructor(config?: NvidiaProviderConfig) {
    const envApiKey =
      typeof process !== 'undefined' && typeof process.env?.NVIDIA_API_KEY === 'string'
        ? process.env.NVIDIA_API_KEY
        : '';
    this.apiKey = config?.apiKey !== undefined ? config.apiKey : envApiKey;
    this.baseUrl = config?.baseUrl || 'https://integrate.api.nvidia.com/v1';
    this.model = config?.model || DEFAULT_ROUTED_MODEL;
    this.fetchFn = config?.fetchFn || (typeof fetch !== 'undefined' ? fetch : (globalThis.fetch as typeof fetch));

    if (!isModelAllowed(this.model)) {
      throw new Error(`Model "${this.model}" is not authorized or enabled in Project Zero model registry.`);
    }
  }

  public getModel(): string {
    return this.model;
  }

  public async chat(rawRequest: unknown, signal?: AbortSignal): Promise<ChatResponse> {
    // 1. Validate request
    validateChatRequest(rawRequest);
    const request: ChatRequest = rawRequest;

    // 2. Validate API key presence
    if (!this.apiKey || this.apiKey.trim().length === 0) {
      throw new Error('NVIDIA_API_KEY is not configured on the gateway server.');
    }

    // 3. Prepare payload with General Assistant system instruction and sanitized application context
    let systemInstruction = PROJECT_ZERO_GENERAL_ASSISTANT_INSTRUCTION;
    if (request.context) {
      const contextStr = serializeContextForPrompt(request.context);
      systemInstruction += `\n\n=== CURRENT USER WORKSPACE & MACHINE CONTEXT ===\n${contextStr}\n================================================`;
    }

    const upstreamMessages = [
      { role: 'system', content: systemInstruction },
      ...request.messages.map((m) => ({ role: m.role, content: m.content })),
    ];

    const body = {
      model: this.model,
      messages: upstreamMessages,
      max_tokens: request.maxTokens ?? 3500,
      temperature: request.temperature ?? 0.2,
    };

    // 4. Dispatch request
    let response: Response;
    try {
      response = await this.fetchFn(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
        signal,
      });
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw err;
      }
      throw new Error(`Network/gateway connectivity error: ${(err as Error).message}`);
    }

    if (!response.ok) {
      let errorDetail = `Status ${response.status}`;
      try {
        const errorJson = (await response.json()) as NvidiaChatCompletionResponse | null;
        if (errorJson?.error?.message) {
          errorDetail = errorJson.error.message;
        }
      } catch {
        // Use status code description
      }

      if (response.status === 401 || response.status === 403) {
        throw new Error('NVIDIA authorization failed. Please check server gateway API credentials.');
      } else if (response.status === 429) {
        throw new Error('NVIDIA rate limit reached. Please wait a moment before trying again.');
      } else {
        throw new Error(`NVIDIA upstream inference error: ${errorDetail}`);
      }
    }

    // 5. Parse response
    const json = (await response.json()) as NvidiaChatCompletionResponse;
    const choice = json.choices?.[0];
    if (!choice || !choice.message || typeof choice.message.content !== 'string') {
      throw new Error('Malformed response received from NVIDIA inference endpoint.');
    }

    const rawContent = choice.message.content.trim();
    const { cleanedText, actionProposal } = extractActionProposal(rawContent);

    return {
      id: json.id || `response-${Date.now()}`,
      model: this.model,
      message: {
        role: 'assistant',
        content: cleanedText,
      },
      actionProposal,
      usage: json.usage
        ? {
            promptTokens: json.usage.prompt_tokens,
            completionTokens: json.usage.completion_tokens,
            totalTokens: json.usage.total_tokens,
          }
        : undefined,
    };
  }
}
