/**
 * ============================================================================
 * Pluggable AI Architecture - Common Provider Interface
 * ============================================================================
 * @module lib/ai/providers/provider.ts
 */

import {
  GenerateOptions,
  Message,
  StreamChunk,
  EmbeddingResult,
  ProviderId,
  Model,
} from '../types/schema';

export interface AIProvider {
  /** Provider Identifier */
  readonly id: ProviderId;
  
  /** Display Name */
  readonly name: string;

  /** List of supported models for this provider */
  readonly supportedModels: Model[];

  /**
   * Return a real-time streaming response (AsyncGenerator).
   */
  stream(options: GenerateOptions): AsyncGenerator<StreamChunk, void, unknown>;

  /**
   * Return a full single chat message completion.
   */
  chat(options: GenerateOptions): Promise<Message>;

  /**
   * Return simple generated text from a prompt.
   */
  generate(prompt: string, options?: Partial<GenerateOptions>): Promise<string>;

  /**
   * Return vector embeddings for a given text.
   */
  embed(text: string): Promise<EmbeddingResult>;
}
