/**
 * ============================================================================
 * Jarvis AI - Single Client Abstraction Layer
 * ============================================================================
 * @module lib/ai/client.ts
 */

import { getAIConfig, validateGroqConfig } from './config';
import { SUPPORTED_MODELS } from './constants';
import { AIModel, ChatMessage } from './types';

export class AIClient {
  private config = getAIConfig();

  /**
   * Return supported models list.
   */
  public getModels(): AIModel[] {
    return SUPPORTED_MODELS;
  }

  /**
   * Resolve specific model by ID.
   */
  public getModel(modelId: string): AIModel | undefined {
    return SUPPORTED_MODELS.find((m) => m.id === modelId) || SUPPORTED_MODELS[0];
  }

  /**
   * Validate configuration status.
   */
  public checkHealth(): { status: 'ok' | 'error'; message?: string } {
    const groqCheck = validateGroqConfig();
    if (!groqCheck.isValid) {
      return { status: 'error', message: groqCheck.error };
    }
    return { status: 'ok' };
  }

  /**
   * Format message array payload for API route.
   */
  public prepareMessagesPayload(messages: ChatMessage[]) {
    return messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));
  }
}

export const aiClient = new AIClient();
