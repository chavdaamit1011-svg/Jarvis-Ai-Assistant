/**
 * ============================================================================
 * Pluggable AI Architecture - Google Gemini Provider Implementation (Mock)
 * ============================================================================
 * @module lib/ai/providers/gemini-provider.ts
 */

import { AIProvider } from './provider';
import {
  GenerateOptions,
  Message,
  StreamChunk,
  EmbeddingResult,
  ProviderId,
  Model,
} from '../types/schema';

export const GEMINI_MODELS: Model[] = [
  {
    id: 'gemini-1-5-pro',
    name: 'Gemini 1.5 Pro',
    provider: 'gemini',
    description: 'Google multimodal reasoning model with 2M token context window.',
    contextWindow: 2000000,
    maxOutputTokens: 8192,
    supportsStreaming: true,
    supportsVision: true,
    supportsToolCalling: true,
  },
  {
    id: 'gemini-1-5-flash',
    name: 'Gemini 1.5 Flash',
    provider: 'gemini',
    description: 'Ultra-fast lightweight Google AI model.',
    contextWindow: 1000000,
    maxOutputTokens: 8192,
    supportsStreaming: true,
    supportsVision: true,
    supportsToolCalling: true,
  },
];

export class GeminiProvider implements AIProvider {
  readonly id: ProviderId = 'gemini';
  readonly name = 'Google Gemini Core';
  readonly supportedModels = GEMINI_MODELS;

  async *stream(options: GenerateOptions): AsyncGenerator<StreamChunk, void, unknown> {
    const mockResponse = `[Gemini ${options.model.id} Mock Stream]: Greetings from Google Gemini Neural Engine. Processing input with 2 Million token context capacity.`;
    const words = mockResponse.split(' ');
    let accumulated = '';

    for (let i = 0; i < words.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, 25));
      const delta = (i === 0 ? '' : ' ') + words[i];
      accumulated += delta;

      yield {
        delta,
        accumulated,
        done: i === words.length - 1,
        metadata: {
          tokensUsed: { promptTokens: 18, completionTokens: i + 1, totalTokens: 19 + i },
          latencyMs: 95,
        },
      };
    }
  }

  async chat(options: GenerateOptions): Promise<Message> {
    const lastUserMsg = options.messages[options.messages.length - 1]?.content || '';
    return {
      id: 'msg-' + Math.random().toString(36).substring(2, 9),
      conversationId: options.messages[0]?.conversationId || 'conv-default',
      role: 'assistant',
      content: `[Gemini ${options.model.id} Mock Response]: Processed prompt "${lastUserMsg.slice(0, 30)}...". Context window nominal.`,
      timestamp: new Date().toISOString(),
      model: options.model,
      status: 'completed',
      metadata: {
        tokensUsed: { promptTokens: 30, completionTokens: 50, totalTokens: 80 },
        latencyMs: 110,
        finishReason: 'stop',
      },
    };
  }

  async generate(prompt: string, options?: Partial<GenerateOptions>): Promise<string> {
    return `[Gemini Mock Generation]: Generated Gemini response for prompt "${prompt.slice(0, 20)}..."`;
  }

  async embed(text: string): Promise<EmbeddingResult> {
    const vector = Array.from({ length: 768 }, () => Number((Math.random() * 2 - 1).toFixed(4)));
    return { vector, dimensions: 768 };
  }
}
