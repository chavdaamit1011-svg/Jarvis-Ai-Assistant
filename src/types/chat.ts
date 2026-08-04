export type Role = 'user' | 'assistant' | 'system';

export type AIModelId = 'jarvis-v4' | 'ultron-prime' | 'claude-3-5' | 'deepseek-r1' | 'gpt-4o' | 'cursor-small';

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

export interface Message {
  id: string;
  role: Role;
  content: string;
  timestamp: string;
  modelId?: AIModelId;
  isStreaming?: boolean;
  isEdited?: boolean;
  likeStatus?: 'liked' | 'disliked' | null;
}

export interface ChatThread {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  pinned?: boolean;
  category: 'Today' | 'Yesterday' | 'Previous 7 Days' | 'Older';
  messages: Message[];
  modelId: AIModelId;
}

export type ThemeMode = 'dark' | 'light' | 'ultron';

export interface UserSettings {
  theme: ThemeMode;
  defaultModel: AIModelId;
  persona: PersonaMode;
  systemPrompt: string;
  soundEffects: boolean;
  streamSpeed: number; // ms per chunk
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
