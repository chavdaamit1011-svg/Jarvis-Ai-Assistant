export const ASSISTANT_MODES = [
  'general',
  'coding',
  'research',
  'marketing',
  'medical-information',
] as const;

export type AssistantMode = (typeof ASSISTANT_MODES)[number];

export type ResponseStyle = 'concise' | 'balanced' | 'detailed';

export interface UserContext {
  displayName?: string;
  expertise?: 'beginner' | 'intermediate' | 'advanced';
  goal?: string;
}

export interface PromptConfiguration {
  mode: AssistantMode;
  preferredLanguage: string;
  responseStyle: ResponseStyle;
  userContext?: UserContext;
}

export const PROMPT_METADATA = {
  promptVersion: '1.0.0',
} as const;

export type PromptMetadata = typeof PROMPT_METADATA;
