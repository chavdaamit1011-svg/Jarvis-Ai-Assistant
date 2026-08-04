'use client';

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { AIModelId, ChatThread, Message, PersonaMode, UserSettings } from '@/types/chat';
import { MOCK_CHAT_HISTORY } from '@/lib/mock-data';
import { generateId, formatTimestamp } from '@/lib/utils';

interface ChatContextType {
  chats: ChatThread[];
  activeChatId: string | null;
  activeChat: ChatThread | null;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  activeModelId: AIModelId;
  setActiveModelId: (modelId: AIModelId) => void;
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
  
  // Actions
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
const MAX_MESSAGE_LENGTH = 8000;

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [chats, setChats] = useState<ChatThread[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeModelId, setActiveModelId] = useState<AIModelId>('jarvis-v4');
  const [persona, setPersona] = useState<PersonaMode>('jarvis');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const [settings, setSettings] = useState<UserSettings>({
    theme: 'dark',
    defaultModel: 'jarvis-v4',
    persona: 'jarvis',
    systemPrompt: 'You are Jarvis AI, Tony Stark’s AI Assistant.',
    soundEffects: true,
    streamSpeed: 25,
    sendOnEnter: true,
    temperature: 0.7,
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const isRequestInFlightRef = useRef(false);

  // Initial Load from localStorage
  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      const savedChats = localStorage.getItem('jarvis_chats');
      if (savedChats) {
        try {
          const parsed = JSON.parse(savedChats);
          setChats(parsed);
          if (parsed.length > 0) {
            setActiveChatId(parsed[0].id);
          }
        } catch (e) {
          console.error('Failed to parse saved chats', e);
          setChats(MOCK_CHAT_HISTORY);
          setActiveChatId(MOCK_CHAT_HISTORY[0].id);
        }
      } else {
        setChats(MOCK_CHAT_HISTORY);
        setActiveChatId(MOCK_CHAT_HISTORY[0].id);
      }
    }, 0);

    return () => window.clearTimeout(loadTimer);
  }, []);

  // Save to localStorage
  useEffect(() => {
    if (chats.length > 0) {
      localStorage.setItem('jarvis_chats', JSON.stringify(chats));
    }
  }, [chats]);

  const activeChat = chats.find((c) => c.id === activeChatId) || null;

  const updateSettings = (newSettings: Partial<UserSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  const createNewChat = (initialPrompt?: string): string => {
    const newId = 'chat-' + generateId();
    const newChat: ChatThread = {
      id: newId,
      title: initialPrompt ? initialPrompt.slice(0, 30) + '...' : 'New Protocol',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      pinned: false,
      category: 'Today',
      modelId: activeModelId,
      messages: [],
    };

    setChats((prev) => [newChat, ...prev]);
    setActiveChatId(newId);

    if (initialPrompt) {
      setTimeout(() => sendMessageInternal(newId, initialPrompt), 100);
    }
    return newId;
  };

  const selectChat = (id: string) => {
    setActiveChatId(id);
  };

  const toggleSidebar = () => setIsSidebarOpen((prev) => !prev);

  const sendMessage = (content: string) => {
    const trimmedContent = content.trim();
    if (!trimmedContent || trimmedContent.length > MAX_MESSAGE_LENGTH || isStreaming || isRequestInFlightRef.current) return;

    let targetChatId = activeChatId;
    if (!targetChatId || !chats.some((c) => c.id === targetChatId)) {
      targetChatId = createNewChat();
    }

    sendMessageInternal(targetChatId, trimmedContent);
  };

  const sendMessageInternal = (chatId: string, content: string) => {
    if (!content.trim() || content.length > MAX_MESSAGE_LENGTH) return;

    const userMsg: Message = {
      id: 'msg-' + generateId(),
      role: 'user',
      content,
      timestamp: formatTimestamp(),
    };

    const assistantMsgId = 'msg-' + generateId();
    const assistantMsg: Message = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: formatTimestamp(),
      modelId: activeModelId,
      isStreaming: true,
    };

    // Calculate full history for API payload
    const existingMessages = chats.find((c) => c.id === chatId)?.messages || [];
    const fullHistory = [...existingMessages, userMsg];

    // Update state
    setChats((prevChats) =>
      prevChats.map((chat) => {
        if (chat.id === chatId) {
          const isFirst = chat.messages.length === 0;
          return {
            ...chat,
            title: isFirst ? content.slice(0, 32) + (content.length > 32 ? '...' : '') : chat.title,
            updatedAt: new Date().toISOString(),
            messages: [...chat.messages, userMsg, assistantMsg],
          };
        }
        return chat;
      })
    );

    // Trigger Real Streaming Response from /api/chat
    executeStream(chatId, assistantMsgId, fullHistory);
  };

  const executeStream = async (chatId: string, assistantMsgId: string, messageHistory: Message[]) => {
    if (isRequestInFlightRef.current) return;

    isRequestInFlightRef.current = true;
    setIsStreaming(true);
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const payloadMessages = messageHistory.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: payloadMessages,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        let errorText = 'Connection error with AI API.';
        try {
          const errJson = await response.json();
          errorText = errJson.error || errorText;
        } catch {
          errorText = await response.text();
        }
        throw new Error(errorText);
      }

      if (!response.body) {
        throw new Error('No stream body received from server endpoint.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        accumulatedContent += chunk;

        const currentContent = accumulatedContent;
        setChats((prevChats) =>
          prevChats.map((chat) => {
            if (chat.id === chatId) {
              return {
                ...chat,
                messages: chat.messages.map((msg) => {
                  if (msg.id === assistantMsgId) {
                    return {
                      ...msg,
                      content: currentContent,
                      isStreaming: true,
                    };
                  }
                  return msg;
                }),
              };
            }
            return chat;
          })
        );
      }

      // Complete stream
      setChats((prevChats) =>
        prevChats.map((chat) => {
          if (chat.id === chatId) {
            return {
              ...chat,
              messages: chat.messages.map((msg) =>
                msg.id === assistantMsgId ? { ...msg, isStreaming: false } : msg
              ),
            };
          }
          return chat;
        })
      );
    } catch (error: unknown) {
      const err = error as Error;
      if (err instanceof DOMException && err.name === 'AbortError') {
        console.log('Stream generation cancelled by user.');
      } else {
        console.error('AI Stream Error:', err);
        const errorContent = `⚠️ **AI Service Notice**: ${err.message || 'Failed to communicate with AI provider.'}`;

        setChats((prevChats) =>
          prevChats.map((chat) => {
            if (chat.id === chatId) {
              return {
                ...chat,
                messages: chat.messages.map((msg) =>
                  msg.id === assistantMsgId
                    ? { ...msg, content: errorContent, isStreaming: false }
                    : msg
                ),
              };
            }
            return chat;
          })
        );
      }
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
        isRequestInFlightRef.current = false;
        setIsStreaming(false);
      }
    }
  };

  const stopGenerating = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    isRequestInFlightRef.current = false;
    setIsStreaming(false);

    if (activeChatId) {
      setChats((prev) =>
        prev.map((c) => {
          if (c.id === activeChatId) {
            return {
              ...c,
              messages: c.messages.map((m) => (m.isStreaming ? { ...m, isStreaming: false } : m)),
            };
          }
          return c;
        })
      );
    }
  };

  const regenerateMessage = (messageId: string) => {
    if (!activeChat || isStreaming) return;

    const msgIndex = activeChat.messages.findIndex((m) => m.id === messageId);
    if (msgIndex === -1) return;

    const historyUpToTarget = activeChat.messages.slice(0, msgIndex);

    setChats((prev) =>
      prev.map((c) => {
        if (c.id === activeChat.id) {
          return {
            ...c,
            messages: c.messages.map((m) =>
              m.id === messageId ? { ...m, content: '', isStreaming: true } : m
            ),
          };
        }
        return c;
      })
    );

    executeStream(activeChat.id, messageId, historyUpToTarget);
  };

  const editPromptAndSend = (messageId: string, newContent: string) => {
    if (!activeChat || isStreaming || !newContent.trim() || newContent.length > MAX_MESSAGE_LENGTH) return;

    const msgIndex = activeChat.messages.findIndex((m) => m.id === messageId);
    if (msgIndex === -1) return;

    const updatedHistory = activeChat.messages.slice(0, msgIndex);

    const editedUserMsg: Message = {
      id: messageId,
      role: 'user',
      content: newContent,
      timestamp: formatTimestamp(),
      isEdited: true,
    };

    const newAssistantMsgId = 'msg-' + generateId();
    const newAssistantMsg: Message = {
      id: newAssistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: formatTimestamp(),
      modelId: activeModelId,
      isStreaming: true,
    };

    setChats((prev) =>
      prev.map((c) => {
        if (c.id === activeChat.id) {
          return {
            ...c,
            messages: [...updatedHistory, editedUserMsg, newAssistantMsg],
          };
        }
        return c;
      })
    );

    executeStream(activeChat.id, newAssistantMsgId, [...updatedHistory, editedUserMsg]);
  };

  const deleteChat = (id: string) => {
    setChats((prev) => prev.filter((c) => c.id !== id));
    if (activeChatId === id) {
      const remaining = chats.filter((c) => c.id !== id);
      setActiveChatId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  const renameChat = (id: string, newTitle: string) => {
    setChats((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title: newTitle } : c))
    );
  };

  const togglePinChat = (id: string) => {
    setChats((prev) =>
      prev.map((c) => (c.id === id ? { ...c, pinned: !c.pinned } : c))
    );
  };

  const toggleMessageLike = (messageId: string, status: 'liked' | 'disliked') => {
    if (!activeChatId) return;
    setChats((prev) =>
      prev.map((c) => {
        if (c.id === activeChatId) {
          return {
            ...c,
            messages: c.messages.map((m) =>
              m.id === messageId
                ? { ...m, likeStatus: m.likeStatus === status ? null : status }
                : m
            ),
          };
        }
        return c;
      })
    );
  };

  const clearAllChats = () => {
    setChats([]);
    setActiveChatId(null);
    localStorage.removeItem('jarvis_chats');
  };

  const exportChatHistory = (format: 'json' | 'markdown') => {
    if (!activeChat) return;

    let dataStr = '';
    let filename = `jarvis_chat_${activeChat.id}`;

    if (format === 'json') {
      dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(activeChat, null, 2));
      filename += '.json';
    } else {
      let md = `# ${activeChat.title}\n\n*Exported from Jarvis AI Engine*\n\n---\n\n`;
      activeChat.messages.forEach((m) => {
        md += `### ${m.role === 'user' ? 'User' : 'Jarvis AI'} (${m.timestamp})\n${m.content}\n\n`;
      });
      dataStr = 'data:text/markdown;charset=utf-8,' + encodeURIComponent(md);
      filename += '.md';
    }

    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', filename);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <ChatContext.Provider
      value={{
        chats,
        activeChatId,
        activeChat,
        searchQuery,
        setSearchQuery,
        activeModelId,
        setActiveModelId,
        persona,
        setPersona,
        isStreaming,
        isSidebarOpen,
        setIsSidebarOpen,
        toggleSidebar,
        isSettingsOpen,
        setIsSettingsOpen,
        settings,
        updateSettings,

        createNewChat,
        selectChat,
        sendMessage,
        stopGenerating,
        regenerateMessage,
        editPromptAndSend,
        deleteChat,
        renameChat,
        togglePinChat,
        toggleMessageLike,
        clearAllChats,
        exportChatHistory,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) throw new Error('useChat must be used within ChatProvider');
  return context;
}
