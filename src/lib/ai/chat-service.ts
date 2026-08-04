/**
 * ============================================================================
 * Pluggable AI Architecture - Chat Service Orchestrator
 * ============================================================================
 * @module lib/ai/chat-service.ts
 */

import { AIProvider } from './providers/provider';
import { OpenAIProvider, OPENAI_MODELS } from './providers/openai-provider';
import { GeminiProvider, GEMINI_MODELS } from './providers/gemini-provider';
import { GroqProvider, GROQ_MODELS } from './providers/groq-provider';
import { OllamaProvider, OLLAMA_MODELS } from './providers/ollama-provider';
import {
  GenerateOptions,
  Message,
  Model,
  ProviderId,
  StreamChunk,
} from './types/schema';

export class ChatService {
  private providers: Map<ProviderId, AIProvider> = new Map();
  private allModels: Model[] = [];

  constructor() {
    // Register all pluggable AI providers
    this.registerProvider(new OpenAIProvider());
    this.registerProvider(new GeminiProvider());
    this.registerProvider(new GroqProvider());
    this.registerProvider(new OllamaProvider());
  }

  /**
   * Register a new AI Provider dynamically.
   */
  public registerProvider(provider: AIProvider): void {
    this.providers.set(provider.id, provider);
    this.allModels.push(...provider.supportedModels);
  }

  /**
   * Get list of all available models across registered providers.
   */
  public getAvailableModels(): Model[] {
    return this.allModels;
  }

  /**
   * Resolve provider by model ID or provider ID.
   */
  public getProvider(providerId: ProviderId): AIProvider {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new Error(`AI Provider "${providerId}" is not registered in ChatService.`);
    }
    return provider;
  }

  /**
   * Send user message and stream back response chunks in real-time.
   */
  public async *sendMessageStream(
    options: GenerateOptions
  ): AsyncGenerator<StreamChunk, void, unknown> {
    const provider = this.getProvider(options.model.provider);
    yield* provider.stream(options);
  }

  /**
   * Send user message and return single completed response message.
   */
  public async sendMessage(options: GenerateOptions): Promise<Message> {
    const provider = this.getProvider(options.model.provider);
    return await provider.chat(options);
  }

  /**
   * Generate text embedding via appropriate provider.
   */
  public async generateEmbedding(text: string, providerId: ProviderId = 'openai') {
    const provider = this.getProvider(providerId);
    return await provider.embed(text);
  }
}

// Singleton ChatService Instance
export const chatService = new ChatService();
