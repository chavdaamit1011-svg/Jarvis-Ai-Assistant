/**
 * ============================================================================
 * Pluggable AI Architecture - OpenAI Provider Implementation (Mock)
 * ============================================================================
 * @module lib/ai/providers/openai-provider.ts
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

export const OPENAI_MODELS: Model[] = [
  {
    id: 'gpt-4o',
    name: 'GPT-4o Omnis',
    provider: 'openai',
    description: 'OpenAI flagship multimodal reasoning model.',
    contextWindow: 128000,
    maxOutputTokens: 4096,
    supportsStreaming: true,
    supportsVision: true,
    supportsToolCalling: true,
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'openai',
    description: 'Fast, lightweight model for everyday tasks.',
    contextWindow: 128000,
    maxOutputTokens: 4096,
    supportsStreaming: true,
    supportsVision: true,
    supportsToolCalling: true,
  },
];

export class OpenAIProvider implements AIProvider {
  readonly id: ProviderId = 'openai';
  readonly name = 'OpenAI Core API';
  readonly supportedModels = OPENAI_MODELS;

  async *stream(options: GenerateOptions): AsyncGenerator<StreamChunk, void, unknown> {
    const mockResponse = `[OpenAI ${options.model.id} Mock Stream]: I have processed your request through OpenAI architecture. Here is your structured analysis and code logic.`;
    const words = mockResponse.split(' ');
    let accumulated = '';

    for (let i = 0; i < words.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, 30));
      const delta = (i === 0 ? '' : ' ') + words[i];
      accumulated += delta;

      yield {
        delta,
        accumulated,
        done: i === words.length - 1,
        metadata: {
          tokensUsed: { promptTokens: 15, completionTokens: i + 1, totalTokens: 16 + i },
          latencyMs: 120,
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
      content: `[OpenAI ${options.model.id} Mock Response]: Analyzed query "${lastUserMsg.slice(0, 30)}...". All systems nominal.`,
      timestamp: new Date().toISOString(),
      model: options.model,
      status: 'completed',
      metadata: {
        tokensUsed: { promptTokens: 24, completionTokens: 42, totalTokens: 66 },
        latencyMs: 140,
        finishReason: 'stop',
      },
    };
  }

  async generate(prompt: string, options?: Partial<GenerateOptions>): Promise<string> {
    return `[OpenAI Mock Generation]: Generated text for prompt "${prompt.slice(0, 20)}..."`;
  }

  async embed(text: string): Promise<EmbeddingResult> {
    // Return 1536-dimensional mock embedding vector
    const vector = Array.from({ length: 1536 }, () => Number((Math.random() * 2 - 1).toFixed(4)));
    return { vector, dimensions: 1536 };
  }
}
