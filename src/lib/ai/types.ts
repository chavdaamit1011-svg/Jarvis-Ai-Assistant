/**
 * ============================================================================
 * Jarvis AI - Foundation Type Definitions
 * ============================================================================
 * @module lib/ai/types.ts
 */

export type ChatRole = 'user' | 'assistant' | 'system' | 'data';

export type Provider = 'groq' | 'openai' | 'gemini' | 'ollama';

export interface AIModel {
  id: string;
  name: string;
  provider: Provider;
  description: string;
  badge?: string;
  contextWindow: number;
  maxOutputTokens: number;
  isPopular?: boolean;
}

export interface ChatMessage {
  id: string;
  conversationId?: string;
  role: ChatRole;
  content: string;
  timestamp: string;
  modelId?: string;
  isStreaming?: boolean;
  isEdited?: boolean;
  error?: string;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  pinned?: boolean;
  category: 'Today' | 'Yesterday' | 'Previous 7 Days' | 'Older';
  messages: ChatMessage[];
  modelId: string;
}

export interface StreamChunk {
  delta: string;
  accumulated: string;
  done: boolean;
  error?: string;
}
