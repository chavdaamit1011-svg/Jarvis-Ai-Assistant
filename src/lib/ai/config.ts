/**
 * ============================================================================
 * Jarvis AI - Provider & Environment Configuration
 * ============================================================================
 * @module lib/ai/config.ts
 */

import { DEFAULT_MODEL_ID, DEFAULT_PROVIDER, TEMPERATURE_DEFAULTS, TOKEN_LIMITS } from './constants';
import { Provider } from './types';

export interface AIConfig {
  defaultProvider: Provider;
  defaultModelId: string;
  defaultTemperature: number;
  maxOutputTokens: number;
  envKeys: {
    groqApiKey?: string;
    openaiApiKey?: string;
    geminiApiKey?: string;
  };
}

export function getAIConfig(): AIConfig {
  return {
    defaultProvider: DEFAULT_PROVIDER,
    defaultModelId: DEFAULT_MODEL_ID,
    defaultTemperature: TEMPERATURE_DEFAULTS.default,
    maxOutputTokens: TOKEN_LIMITS.defaultMaxTokens,
    envKeys: {
      groqApiKey: process.env.GROQ_API_KEY,
      openaiApiKey: process.env.OPENAI_API_KEY,
      geminiApiKey: process.env.GEMINI_API_KEY,
    },
  };
}

export function validateGroqConfig(): { isValid: boolean; error?: string } {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    return {
      isValid: false,
      error: 'GROQ_API_KEY environment variable is not configured on the server. Please add GROQ_API_KEY to your .env.local file.',
    };
  }
  return { isValid: true };
}
