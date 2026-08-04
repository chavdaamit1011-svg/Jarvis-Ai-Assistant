/**
 * ============================================================================
 * Jarvis AI - Foundation Constants & Defaults
 * ============================================================================
 * @module lib/ai/constants.ts
 */

import { AIModel } from './types';

export const DEFAULT_PROVIDER = 'groq';
// Keep the server-selected Groq model in one place. The client never chooses a
// provider model, which prevents arbitrary model IDs from reaching the API.
export const DEFAULT_MODEL_ID = 'llama-3.3-70b-versatile';

export const SUPPORTED_MODELS: AIModel[] = [
  {
    id: 'llama-3.3-70b-versatile',
    name: 'Llama 3.3 70B (Groq)',
    provider: 'groq',
    description: 'Groq ultra-fast LPU inference model for complex reasoning and code.',
    badge: 'Core Groq',
    contextWindow: 128000,
    maxOutputTokens: 8192,
    isPopular: true,
  },
  {
    id: 'llama-3.1-8b-instant',
    name: 'Llama 3.1 8B Instant',
    provider: 'groq',
    description: 'Ultra-lightweight Groq model for lightning fast responses.',
    badge: 'Fastest',
    contextWindow: 128000,
    maxOutputTokens: 4096,
  },
  {
    id: 'mixtral-8x7b-32768',
    name: 'Mixtral 8x7B MoE',
    provider: 'groq',
    description: 'Mixture-of-Experts architecture on Groq hardware.',
    badge: 'MoE',
    contextWindow: 32768,
    maxOutputTokens: 4096,
  },
];

export const CHAT_LIMITS = {
  maxMessageLength: 8000,
  maxHistoryItems: 50,
  titleTruncateLength: 32,
};

export const TOKEN_LIMITS = {
  defaultMaxTokens: 4096,
  maxContextTokens: 128000,
};

export const TEMPERATURE_DEFAULTS = {
  precise: 0.2,
  default: 0.7,
  creative: 0.9,
};
