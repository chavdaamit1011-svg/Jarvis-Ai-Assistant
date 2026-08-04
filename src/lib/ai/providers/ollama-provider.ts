/**
 * ============================================================================
 * Pluggable AI Architecture - Ollama Local Provider Implementation (Mock)
 * ============================================================================
 * @module lib/ai/providers/ollama-provider.ts
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

export const OLLAMA_MODELS: Model[] = [
  {
    id: 'deepseek-r1-local',
    name: 'DeepSeek R1 (Ollama Local)',
    provider: 'ollama',
    description: 'Local self-hosted DeepSeek R1 reasoning core running on http://localhost:11434.',
    contextWindow: 65536,
    maxOutputTokens: 4096,
    supportsStreaming: true,
    supportsVision: false,
    supportsToolCalling: true,
  },
  {
    id: 'llama3-2-local',
    name: 'Llama 3.2 3B (Ollama Local)',
    provider: 'ollama',
    description: 'Lightweight zero-cost local LLM running offline.',
    contextWindow: 128000,
    maxOutputTokens: 4096,
    supportsStreaming: true,
    supportsVision: false,
    supportsToolCalling: true,
  },
];

export class OllamaProvider implements AIProvider {
  readonly id: ProviderId = 'ollama';
  readonly name = 'Ollama Local Host Engine';
  readonly supportedModels = OLLAMA_MODELS;

  async *stream(options: GenerateOptions): AsyncGenerator<StreamChunk, void, unknown> {
    const mockResponse = `[Ollama Local ${options.model.id} Stream]: Processing prompt offline via local hardware (http://localhost:11434). Zero external API calls executed.`;
    const words = mockResponse.split(' ');
    let accumulated = '';

    for (let i = 0; i < words.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, 35));
      const delta = (i === 0 ? '' : ' ') + words[i];
      accumulated += delta;

      yield {
        delta,
        accumulated,
        done: i === words.length - 1,
        metadata: {
          tokensUsed: { promptTokens: 16, completionTokens: i + 1, totalTokens: 17 + i },
          latencyMs: 40,
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
      content: `[Ollama ${options.model.id} Mock Response]: Completed offline prompt "${lastUserMsg.slice(0, 30)}...". Privacy guaranteed.`,
      timestamp: new Date().toISOString(),
      model: options.model,
      status: 'completed',
      metadata: {
        tokensUsed: { promptTokens: 22, completionTokens: 40, totalTokens: 62 },
        latencyMs: 45,
        finishReason: 'stop',
      },
    };
  }

  async generate(prompt: string, options?: Partial<GenerateOptions>): Promise<string> {
    return `[Ollama Offline Mock Generation]: Generated offline output for prompt "${prompt.slice(0, 20)}..."`;
  }

  async embed(text: string): Promise<EmbeddingResult> {
    const vector = Array.from({ length: 4096 }, () => Number((Math.random() * 2 - 1).toFixed(4)));
    return { vector, dimensions: 4096 };
  }
}
