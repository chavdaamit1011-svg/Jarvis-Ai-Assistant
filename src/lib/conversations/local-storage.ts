import { ASSISTANT_MODES } from '@/lib/ai/prompts';
import { AI_MODEL_IDS, type AIModelId, type Conversation, type Message, type MessageStatus } from '@/types/chat';

export const CONVERSATIONS_STORAGE_KEY = 'jarvis.conversations.v1';
export const ACTIVE_CONVERSATION_STORAGE_KEY = 'jarvis.activeConversation.v1';

const MESSAGE_STATUSES: MessageStatus[] = ['submitted', 'streaming', 'complete', 'stopped', 'error'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseMessage(value: unknown): Message | null {
  if (!isRecord(value) || (value.role !== 'user' && value.role !== 'assistant')) return null;
  if (typeof value.id !== 'string' || typeof value.content !== 'string' || typeof value.createdAt !== 'string') return null;

  const status = MESSAGE_STATUSES.includes(value.status as MessageStatus)
    ? (value.status as MessageStatus)
    : 'complete';

  return {
    id: value.id,
    role: value.role,
    content: value.content,
    createdAt: value.createdAt,
    status: status === 'streaming' ? 'stopped' : status,
    ...(isRecord(value.error) && typeof value.error.message === 'string'
      ? { error: { message: value.error.message, retryable: value.error.retryable === true, ...(typeof value.error.code === 'string' ? { code: value.error.code } : {}) } }
      : {}),
    ...(typeof value.model === 'string' ? { model: value.model as AIModelId } : {}),
    ...(value.isEdited === true ? { isEdited: true } : {}),
    ...(value.likeStatus === 'liked' || value.likeStatus === 'disliked' ? { likeStatus: value.likeStatus } : {}),
  };
}

function parseConversation(value: unknown): Conversation | null {
  if (!isRecord(value) || !Array.isArray(value.messages)) return null;
  if (
    typeof value.id !== 'string' ||
    typeof value.title !== 'string' ||
    typeof value.createdAt !== 'string' ||
    typeof value.updatedAt !== 'string' ||
    !AI_MODEL_IDS.includes(value.model as AIModelId) ||
    !ASSISTANT_MODES.includes(value.assistantMode as (typeof ASSISTANT_MODES)[number])
  ) {
    return null;
  }

  const messages = value.messages.map(parseMessage);
  if (messages.some((message) => message === null)) return null;

  return {
    id: value.id,
    title: value.title,
    messages: messages as Message[],
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    model: value.model as AIModelId,
    assistantMode: value.assistantMode as Conversation['assistantMode'],
    isPinned: value.isPinned === true,
    isArchived: value.isArchived === true,
  };
}

export function loadPersistedConversations(): { conversations: Conversation[]; activeConversationId: string | null } | null {
  if (typeof window === 'undefined') return null;

  try {
    const rawConversations = window.localStorage.getItem(CONVERSATIONS_STORAGE_KEY);
    if (!rawConversations) return null;

    const parsed = JSON.parse(rawConversations);
    if (!Array.isArray(parsed)) return null;

    const conversations = parsed.map(parseConversation);
    if (conversations.some((conversation) => conversation === null)) return null;

    const activeConversationId = window.localStorage.getItem(ACTIVE_CONVERSATION_STORAGE_KEY);
    return { conversations: conversations as Conversation[], activeConversationId };
  } catch {
    return null;
  }
}

export function persistConversations(conversations: Conversation[], activeConversationId: string): void {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(CONVERSATIONS_STORAGE_KEY, JSON.stringify(conversations));
    window.localStorage.setItem(ACTIVE_CONVERSATION_STORAGE_KEY, activeConversationId);
  } catch (error) {
    console.error('Unable to persist local conversations.', error);
  }
}
