/**
 * ============================================================================
 * Pluggable AI Architecture - Schema & Type Definitions
 * ============================================================================
 * @module lib/ai/types/schema.ts
 */

export type Role = 'user' | 'assistant' | 'system' | 'tool';

export type ProviderId = 'openai' | 'gemini' | 'groq' | 'ollama';

export interface Model {
  id: string;
  name: string;
  provider: ProviderId;
  description: string;
  contextWindow: number;
  maxOutputTokens: number;
  supportsStreaming: boolean;
  supportsVision: boolean;
  supportsToolCalling: boolean;
}

export interface Attachment {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  url?: string;
  contentBase64?: string;
}

export interface Metadata {
  tokensUsed?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason?: 'stop' | 'length' | 'tool-calls' | 'content-filter';
  latencyMs?: number;
  customSystemPrompt?: string;
  temperature?: number;
  topP?: number;
}

export interface StreamingStatus {
  isStreaming: boolean;
  chunkCount: number;
  completedAt?: string;
  error?: string;
}

export type MessageStatus = 'sending' | 'streaming' | 'completed' | 'failed';

export interface Message {
  id: string;
  conversationId: string;
  role: Role;
  content: string;
  timestamp: string;
  model: Model;
  metadata?: Metadata;
  attachments?: Attachment[];
  streaming?: StreamingStatus;
  status: MessageStatus;
  isEdited?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  isArchived: boolean;
  isPinned: boolean;
  model: Model;
  messages: Message[];
  tags?: string[];
  systemInstructions?: string;
}

export interface GenerateOptions {
  model: Model;
  messages: Message[];
  temperature?: number;
  maxTokens?: number;
  systemInstructions?: string;
  attachments?: Attachment[];
}

export interface StreamChunk {
  delta: string;
  accumulated: string;
  done: boolean;
  metadata?: Metadata;
}

export interface EmbeddingResult {
  vector: number[];
  dimensions: number;
}
