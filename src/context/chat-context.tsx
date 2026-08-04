'use client';

import React, { createContext, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import type { AssistantMode } from '@/lib/ai/prompts';
import { loadPersistedConversations, persistConversations } from '@/lib/conversations/local-storage';
import { formatTimestamp, generateId } from '@/lib/utils';
import type { AIModelId, Conversation, Message, PersonaMode, UserSettings } from '@/types/chat';

const DEFAULT_MODEL: AIModelId = 'jarvis-v4';
const DEFAULT_MODE: AssistantMode = 'general';
const MAX_MESSAGE_LENGTH = 8000;
const MAX_API_HISTORY_MESSAGES = 30;

interface ConversationState {
  conversations: Conversation[];
  activeConversationId: string;
  hydrated: boolean;
}

type ConversationAction =
  | { type: 'hydrate'; conversations: Conversation[]; activeConversationId: string }
  | { type: 'create'; conversation: Conversation }
  | { type: 'select'; id: string }
  | { type: 'update'; id: string; update: (conversation: Conversation) => Conversation }
  | { type: 'delete'; id: string; fallbackConversation: Conversation }
  | { type: 'reset'; conversation: Conversation };

function createConversation(): Conversation {
  const now = new Date().toISOString();
  return {
    id: `chat-${generateId()}`,
    title: 'New Chat',
    messages: [],
    createdAt: now,
    updatedAt: now,
    model: DEFAULT_MODEL,
    assistantMode: DEFAULT_MODE,
    isPinned: false,
    isArchived: false,
  };
}

function conversationReducer(state: ConversationState, action: ConversationAction): ConversationState {
  switch (action.type) {
    case 'hydrate':
      return { conversations: action.conversations, activeConversationId: action.activeConversationId, hydrated: true };
    case 'create':
      return { ...state, conversations: [action.conversation, ...state.conversations], activeConversationId: action.conversation.id };
    case 'select':
      return state.conversations.some((conversation) => conversation.id === action.id)
        ? { ...state, activeConversationId: action.id }
        : state;
    case 'update':
      return {
        ...state,
        conversations: state.conversations.map((conversation) =>
          conversation.id === action.id ? action.update(conversation) : conversation
        ),
      };
    case 'delete': {
      const conversations = state.conversations.filter((conversation) => conversation.id !== action.id);
      const nextConversations = conversations.length > 0 ? conversations : [action.fallbackConversation];
      const activeConversationId =
        state.activeConversationId === action.id
          ? nextConversations[0].id
          : state.activeConversationId;
      return { ...state, conversations: nextConversations, activeConversationId };
    }
    case 'reset':
      return { ...state, conversations: [action.conversation], activeConversationId: action.conversation.id };
  }
}

function makeConversationTitle(content: string): string {
  const normalized = content.replace(/\s+/g, ' ').trim();
  const words = normalized.split(' ').filter(Boolean);
  const candidate = words.slice(0, 8).join(' ');
  const wasTruncated = words.length > 8 || candidate.length > 50;
  const shortened = candidate.slice(0, wasTruncated ? 47 : 50).trim();
  return wasTruncated ? `${shortened}…` : shortened || 'New Chat';
}

function updateConversation(conversation: Conversation, update: Partial<Conversation>): Conversation {
  return { ...conversation, ...update, updatedAt: new Date().toISOString() };
}

interface ChatContextType {
  chats: Conversation[];
  activeChatId: string;
  activeChat: Conversation;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  activeModelId: AIModelId;
  setActiveModelId: (modelId: AIModelId) => void;
  assistantMode: AssistantMode;
  setAssistantMode: (mode: AssistantMode) => void;
  persona: PersonaMode;
  setPersona: (persona: PersonaMode) => void;
  isStreaming: boolean;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  isSettingsOpen: boolean;
  setIsSettingsOpen: (open: boolean) => void;
  settings: UserSettings;
  updateSettings: (newSettings: Partial<UserSettings>) => void;
  createNewChat: (initialPrompt?: string) => string;
  selectChat: (id: string) => void;
  sendMessage: (content: string) => void;
  stopGenerating: () => void;
  regenerateMessage: (messageId: string) => void;
  editPromptAndSend: (messageId: string, newContent: string) => void;
  deleteChat: (id: string) => void;
  renameChat: (id: string, newTitle: string) => void;
  togglePinChat: (id: string) => void;
  toggleMessageLike: (messageId: string, status: 'liked' | 'disliked') => void;
  clearAllChats: () => void;
  exportChatHistory: (format: 'json' | 'markdown') => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(
    conversationReducer,
    undefined,
    (): ConversationState => {
      const conversation = createConversation();
      return { conversations: [conversation], activeConversationId: conversation.id, hydrated: false };
    }
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [persona, setPersona] = useState<PersonaMode>('jarvis');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<UserSettings>({
    theme: 'dark', defaultModel: DEFAULT_MODEL, persona: 'jarvis', systemPrompt: '',
    soundEffects: true, streamSpeed: 25, sendOnEnter: true, temperature: 0.7,
  });
  const abortControllerRef = useRef<AbortController | null>(null);
  const streamConversationIdRef = useRef<string | null>(null);
  const isRequestInFlightRef = useRef(false);

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      const persisted = loadPersistedConversations();
      const fallback = createConversation();
      const conversations = persisted?.conversations.length ? persisted.conversations : [fallback];
      const activeConversationId = conversations.some((conversation) => conversation.id === persisted?.activeConversationId)
        ? persisted!.activeConversationId!
        : conversations[0].id;
      dispatch({ type: 'hydrate', conversations, activeConversationId });
    }, 0);
    return () => window.clearTimeout(loadTimer);
  }, []);

  useEffect(() => {
    if (state.hydrated) persistConversations(state.conversations, state.activeConversationId);
  }, [state.activeConversationId, state.conversations, state.hydrated]);

  const activeChat = useMemo(
    () => state.conversations.find((conversation) => conversation.id === state.activeConversationId) ?? state.conversations[0],
    [state.activeConversationId, state.conversations]
  );

  const updateSettings = (newSettings: Partial<UserSettings>) => setSettings((previous) => ({ ...previous, ...newSettings }));
  const toggleSidebar = () => setIsSidebarOpen((previous) => !previous);

  const updateActiveConversation = (update: (conversation: Conversation) => Conversation) => {
    dispatch({ type: 'update', id: activeChat.id, update });
  };

  const setActiveModelId = (model: AIModelId) => updateActiveConversation((conversation) => updateConversation(conversation, { model }));
  const setAssistantMode = (assistantMode: AssistantMode) => updateActiveConversation((conversation) => updateConversation(conversation, { assistantMode }));

  const executeStream = async (conversation: Conversation, assistantMessageId: string, history: Message[]) => {
    if (isRequestInFlightRef.current) return;
    isRequestInFlightRef.current = true;
    setIsStreaming(true);
    streamConversationIdRef.current = conversation.id;
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const requestMessages = history
      .filter((message) => message.status !== 'error' && message.content.trim())
      .slice(-MAX_API_HISTORY_MESSAGES)
      .map(({ role, content }) => ({ role, content }));

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: requestMessages, mode: conversation.assistantMode }),
        signal: controller.signal,
      });
      if (!response.ok) {
        const responseError = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(responseError?.error ?? 'The AI service could not complete this request.');
      }
      if (!response.body) throw new Error('No stream body was received from the AI service.');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let content = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        content += decoder.decode(value, { stream: true });
        const streamedContent = content;
        dispatch({ type: 'update', id: conversation.id, update: (current) => updateConversation(current, {
          messages: current.messages.map((message) => message.id === assistantMessageId
            ? { ...message, content: streamedContent, status: 'streaming' }
            : message),
        }) });
      }
      dispatch({ type: 'update', id: conversation.id, update: (current) => updateConversation(current, {
        messages: current.messages.map((message) => message.id === assistantMessageId
          ? { ...message, status: 'complete' }
          : message),
      }) });
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      const message = error instanceof Error ? error.message : 'The AI service could not complete this request.';
      dispatch({ type: 'update', id: conversation.id, update: (current) => updateConversation(current, {
        messages: current.messages.map((item) => item.id === assistantMessageId
          ? { ...item, content: `⚠️ **AI Service Notice**: ${message}`, status: 'error', error: { message, retryable: true } }
          : item),
      }) });
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
        streamConversationIdRef.current = null;
        isRequestInFlightRef.current = false;
        setIsStreaming(false);
      }
    }
  };

  const sendToConversation = (conversation: Conversation, rawContent: string) => {
    const content = rawContent.trim();
    if (!content || content.length > MAX_MESSAGE_LENGTH || isRequestInFlightRef.current) return;
    const now = new Date().toISOString();
    const userMessage: Message = { id: `msg-${generateId()}`, role: 'user', content, createdAt: now, status: 'submitted' };
    const assistantMessage: Message = {
      id: `msg-${generateId()}`, role: 'assistant', content: '', createdAt: now, status: 'streaming', model: conversation.model,
    };
    const history = [...conversation.messages, userMessage];
    dispatch({ type: 'update', id: conversation.id, update: (current) => updateConversation(current, {
      title: current.messages.length === 0 ? makeConversationTitle(content) : current.title,
      messages: [...current.messages, userMessage, assistantMessage],
    }) });
    void executeStream(conversation, assistantMessage.id, history);
  };

  const createNewChat = (initialPrompt?: string) => {
    if (isStreaming) return activeChat.id;
    const conversation = createConversation();
    dispatch({ type: 'create', conversation });
    if (initialPrompt?.trim()) window.setTimeout(() => sendToConversation(conversation, initialPrompt), 0);
    return conversation.id;
  };

  const sendMessage = (content: string) => sendToConversation(activeChat, content);
  const selectChat = (id: string) => { if (!isStreaming) dispatch({ type: 'select', id }); };

  const stopGenerating = () => {
    const conversationId = streamConversationIdRef.current;
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    streamConversationIdRef.current = null;
    isRequestInFlightRef.current = false;
    setIsStreaming(false);
    if (conversationId) {
      dispatch({ type: 'update', id: conversationId, update: (conversation) => updateConversation(conversation, {
        messages: conversation.messages.map((message) => message.status === 'streaming' ? { ...message, status: 'stopped' } : message),
      }) });
    }
  };

  const regenerateMessage = (messageId: string) => {
    if (isStreaming) return;
    const index = activeChat.messages.findIndex((message) => message.id === messageId && message.role === 'assistant');
    if (index < 0) return;
    const original = activeChat.messages[index];
    const history = activeChat.messages.slice(0, index);
    dispatch({ type: 'update', id: activeChat.id, update: (conversation) => updateConversation(conversation, {
      messages: conversation.messages.map((message) => message.id === messageId
        ? { ...message, content: '', status: 'streaming', error: undefined }
        : message),
    }) });
    void executeStream(activeChat, original.id, history);
  };

  const editPromptAndSend = (messageId: string, content: string) => {
    if (isStreaming || !content.trim() || content.length > MAX_MESSAGE_LENGTH) return;
    const index = activeChat.messages.findIndex((message) => message.id === messageId && message.role === 'user');
    if (index < 0) return;
    const updatedUser: Message = { ...activeChat.messages[index], content: content.trim(), isEdited: true, status: 'submitted' };
    const assistant: Message = { id: `msg-${generateId()}`, role: 'assistant', content: '', createdAt: new Date().toISOString(), status: 'streaming', model: activeChat.model };
    const history = [...activeChat.messages.slice(0, index), updatedUser];
    dispatch({ type: 'update', id: activeChat.id, update: (conversation) => updateConversation(conversation, { messages: [...history, assistant] }) });
    void executeStream(activeChat, assistant.id, history);
  };

  const deleteChat = (id: string) => {
    if (isStreaming) return;
    dispatch({ type: 'delete', id, fallbackConversation: createConversation() });
  };
  const renameChat = (id: string, title: string) => {
    const trimmed = title.trim().slice(0, 50);
    if (trimmed) dispatch({ type: 'update', id, update: (conversation) => updateConversation(conversation, { title: trimmed }) });
  };
  const togglePinChat = (id: string) => dispatch({ type: 'update', id, update: (conversation) => updateConversation(conversation, { isPinned: !conversation.isPinned }) });
  const toggleMessageLike = (messageId: string, likeStatus: 'liked' | 'disliked') => updateActiveConversation((conversation) => updateConversation(conversation, {
    messages: conversation.messages.map((message) => message.id === messageId
      ? { ...message, likeStatus: message.likeStatus === likeStatus ? null : likeStatus }
      : message),
  }));
  const clearAllChats = () => dispatch({ type: 'reset', conversation: createConversation() });

  const exportChatHistory = (format: 'json' | 'markdown') => {
    const filename = `jarvis_chat_${activeChat.id}`;
    const data = format === 'json'
      ? JSON.stringify(activeChat, null, 2)
      : `# ${activeChat.title}\n\n${activeChat.messages.map((message) => `### ${message.role === 'user' ? 'User' : 'Jarvis AI'} (${formatTimestamp(message.createdAt)})\n${message.content}`).join('\n\n')}`;
    const anchor = document.createElement('a');
    anchor.href = `data:${format === 'json' ? 'text/json' : 'text/markdown'};charset=utf-8,${encodeURIComponent(data)}`;
    anchor.download = `${filename}.${format === 'json' ? 'json' : 'md'}`;
    document.body.appendChild(anchor); anchor.click(); anchor.remove();
  };

  return <ChatContext.Provider value={{
    chats: state.conversations, activeChatId: activeChat.id, activeChat,
    searchQuery, setSearchQuery, activeModelId: activeChat.model, setActiveModelId,
    assistantMode: activeChat.assistantMode, setAssistantMode, persona, setPersona,
    isStreaming, isSidebarOpen, setIsSidebarOpen, toggleSidebar, isSettingsOpen, setIsSettingsOpen,
    settings, updateSettings, createNewChat, selectChat, sendMessage, stopGenerating,
    regenerateMessage, editPromptAndSend, deleteChat, renameChat, togglePinChat,
    toggleMessageLike, clearAllChats, exportChatHistory,
  }}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) throw new Error('useChat must be used within a ChatProvider.');
  return context;
}
