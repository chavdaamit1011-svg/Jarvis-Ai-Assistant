import type { AssistantMode } from '@/lib/ai/prompts';

export type Role = 'user' | 'assistant';

export const AI_MODEL_IDS = ['jarvis-v4', 'ultron-prime', 'claude-3-5', 'deepseek-r1', 'gpt-4o', 'cursor-small'] as const;
export type AIModelId = (typeof AI_MODEL_IDS)[number];

export type MessageStatus = 'submitted' | 'streaming' | 'complete' | 'stopped' | 'error';

export interface MessageError {
  code?: string;
  message: string;
  retryable: boolean;
}

export interface KnowledgeSource {
  documentTitle: string;
  chunkIndex: number;
  score: number;
}

export type AnswerSource = 'knowledge-graph' | 'rag' | 'general-ai' | 'structured-data' | 'clarification' | 'web-search-required';

export interface AnswerMetadata {
  answerSource: AnswerSource;
  usedFallback: boolean;
  confidence?: number;
  evaluationDecision?: 'answer' | 'clarify' | 'fallback' | 'conflict' | 'insufficient';
  entitiesUsed?: string[];
  factsUsed?: string[];
  relationshipsUsed?: string[];
  conflicts?: Array<{ field: string; values: unknown[] }>;
}

/** Local, text-only representation compatible with this app's AI SDK text stream. */
export interface Message {
  id: string;
  role: Role;
  content: string;
  createdAt: string;
  status: MessageStatus;
  error?: MessageError;
  model?: AIModelId;
  isEdited?: boolean;
  likeStatus?: 'liked' | 'disliked' | null;
  sources?: KnowledgeSource[];
  answerMetadata?: AnswerMetadata;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
  model: AIModelId;
  assistantMode: AssistantMode;
  isPinned: boolean;
  isArchived: boolean;
}

/** @deprecated Use Conversation. Kept as an alias while existing UI components migrate. */
export type ChatThread = Conversation;

export interface AIModel {
  id: AIModelId;
  name: string;
  provider: string;
  description: string;
  badge?: string;
  speed: 'Ultra Fast' | 'Fast' | 'Deep Reasoning';
  contextLength: string;
  isPopular?: boolean;
}

export type PersonaMode = 'jarvis' | 'ultron' | 'friday' | 'edith';
export type ThemeMode = 'dark' | 'light' | 'ultron';

export interface UserSettings {
  theme: ThemeMode;
  defaultModel: AIModelId;
  persona: PersonaMode;
  systemPrompt: string;
  soundEffects: boolean;
  streamSpeed: number;
  sendOnEnter: boolean;
  temperature: number;
}

export interface SuggestedPrompt {
  id: string;
  iconName: string;
  title: string;
  subtitle: string;
  promptText: string;
  category: string;
}
