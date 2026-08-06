export const EXECUTOR_CAPABILITIES = [
  'knowledge',
  'general_ai',
  'utility',
  'web_search',
  'file',
  'clarification',
  'unsupported',
] as const;

export type ExecutorCapability = (typeof EXECUTOR_CAPABILITIES)[number];
export type ExecutionStatus = 'success' | 'clarification' | 'unavailable' | 'failed';
export type AnswerSource = 'knowledge_graph' | 'structured_data' | 'rag' | 'general_ai' | 'tool' | 'web' | 'file' | 'system';

/**
 * Stable boundary between the planner and the executor. The planner is the
 * only component allowed to create this data; the executor only delegates it.
 */
export type ExecutionPlan = {
  capability: ExecutorCapability;
  operation: string;
  entities: Array<{ type: string; name: string }>;
  requestedFields: string[];
  arguments: Record<string, unknown>;
  responseLanguage: string;
  requiresCurrentInformation: boolean;
  requiresKnowledge: boolean;
  missingInformation: string[];
  clarificationQuestion: string | null;
  confidence: number;
};

export type ExecutionContext = {
  requestId: string;
  conversationId?: string;
  userId?: string;
  assistantMode: string;
  abortSignal?: AbortSignal;
};

export type ExecutionResult = {
  status: ExecutionStatus;
  capability: ExecutorCapability;
  answerSource: AnswerSource;
  data: unknown;
  supportedFacts: unknown[];
  sources: unknown[];
  conflicts: unknown[];
  fallbackAllowed: boolean;
  fallbackReason: string | null;
  errorCode: string | null;
  traceMetadata: Record<string, unknown>;
};

export type CapabilityHandler = {
  capability: ExecutorCapability;
  timeout: number;
  enabled: boolean;
  canHandle: (plan: ExecutionPlan) => boolean;
  execute: (plan: ExecutionPlan, context: ExecutionContext) => Promise<ExecutionResult>;
};

export type ExecutionAdapters = Partial<Record<'knowledge' | 'general_ai' | 'file', (plan: ExecutionPlan, context: ExecutionContext) => Promise<ExecutionResult>>>;
