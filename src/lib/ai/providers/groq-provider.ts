/**
 * ============================================================================
 * Pluggable AI Architecture - Groq LPU Provider Implementation (Mock)
 * ============================================================================
 * @module lib/ai/providers/groq-provider.ts
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

export const GROQ_MODELS: Model[] = [
  {
    id: 'llama-3-3-70b-versatile',
    name: 'Llama 3.3 70B Versatile',
    provider: 'groq',
    description: 'Groq LPU accelerated 70B open weights model operating at 500 tokens/sec.',
    contextWindow: 128000,
    maxOutputTokens: 8192,
    supportsStreaming: true,
    supportsVision: false,
    supportsToolCalling: true,
  },
  {
    id: 'mixtral-8x7b-32768',
    name: 'Mixtral 8x7B MoE',
    provider: 'groq',
    description: 'High-speed Mixture of Experts architecture on Groq hardware.',
    contextWindow: 32768,
    maxOutputTokens: 4096,
    supportsStreaming: true,
    supportsVision: false,
    supportsToolCalling: true,
  },
];

export class GroqProvider implements AIProvider {
  readonly id: ProviderId = 'groq';
  readonly name = 'Groq LPU Inference Engine';
  readonly supportedModels = GROQ_MODELS;

  async *stream(options: GenerateOptions): AsyncGenerator<StreamChunk, void, unknown> {
    const mockResponse = `[Groq ${options.model.id} Ultra-Fast Stream]: Processing payload at 520 tokens/sec on Groq LPU Hardware. High-throughput response complete.`;
    const words = mockResponse.split(' ');
    let accumulated = '';

    for (let i = 0; i < words.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, 10)); // Super fast 10ms per chunk!
      const delta = (i === 0 ? '' : ' ') + words[i];
      accumulated += delta;

      yield {
        delta,
        accumulated,
        done: i === words.length - 1,
        metadata: {
          tokensUsed: { promptTokens: 12, completionTokens: i + 1, totalTokens: 13 + i },
          latencyMs: 15,
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
      content: `[Groq ${options.model.id} Mock Response]: High-throughput execution complete for "${lastUserMsg.slice(0, 30)}...". Latency: 14ms.`,
      timestamp: new Date().toISOString(),
      model: options.model,
      status: 'completed',
      metadata: {
        tokensUsed: { promptTokens: 20, completionTokens: 35, totalTokens: 55 },
        latencyMs: 14,
        finishReason: 'stop',
      },
    };
  }

  async generate(prompt: string, options?: Partial<GenerateOptions>): Promise<string> {
    return `[Groq LPU Mock Generation]: High-speed text for prompt "${prompt.slice(0, 20)}..."`;
  }

  async embed(text: string): Promise<EmbeddingResult> {
    const vector = Array.from({ length: 1024 }, () => Number((Math.random() * 2 - 1).toFixed(4)));
    return { vector, dimensions: 1024 };
  }
}
