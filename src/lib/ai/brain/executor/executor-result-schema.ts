import { z } from 'zod';
import { EXECUTOR_CAPABILITIES } from './executor-types';

export const executionResultSchema = z.object({
  status: z.enum(['success', 'clarification', 'unavailable', 'failed']),
  capability: z.enum(EXECUTOR_CAPABILITIES),
  answerSource: z.enum(['knowledge_graph', 'structured_data', 'rag', 'general_ai', 'tool', 'web', 'file', 'system']),
  data: z.unknown(),
  supportedFacts: z.array(z.unknown()),
  sources: z.array(z.unknown()),
  conflicts: z.array(z.unknown()),
  fallbackAllowed: z.boolean(),
  fallbackReason: z.string().nullable(),
  errorCode: z.string().nullable(),
  traceMetadata: z.record(z.string(), z.unknown()),
});
