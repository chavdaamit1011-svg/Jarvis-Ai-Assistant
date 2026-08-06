import { z } from 'zod';
import { EXECUTOR_CAPABILITIES } from '../executor';

export const universalPlanSchema = z.object({
  capability: z.enum(EXECUTOR_CAPABILITIES), operation: z.string().min(1).max(100),
  entities: z.array(z.object({ type: z.string().max(50), name: z.string().min(1).max(180) })).max(10),
  requestedFields: z.array(z.string().max(80)).max(10), arguments: z.record(z.string(), z.unknown()),
  responseLanguage: z.string().min(1).max(50), requiresCurrentInformation: z.boolean(), requiresKnowledge: z.boolean(),
  missingInformation: z.array(z.string().max(100)).max(10), clarificationQuestion: z.string().max(300).nullable(),
  confidence: z.number().min(0).max(1), plannerMethod: z.literal('deterministic'), normalizedQuery: z.string().max(2_000),
  plannerCandidates: z.array(z.object({ capability: z.enum(EXECUTOR_CAPABILITIES), confidence: z.number().min(0).max(1), reasons: z.array(z.string().max(120)).max(20) })).min(1).max(7), plannerReasons: z.array(z.string().max(120)).max(20),
  normalizer: z.object({ rawQuery: z.string().max(8_000), cleanedQuery: z.string().max(8_000), normalizedMeaning: z.string().max(8_000), detectedLanguage: z.string().max(100), responseLanguage: z.string().max(160), corrections: z.array(z.object({ original: z.string(), corrected: z.string(), confidence: z.number().min(0).max(1) })), requestedFields: z.array(z.string()), normalizerMethod: z.enum(['deterministic', 'ai', 'fallback']), confidence: z.number().min(0).max(1), fallbackUsed: z.boolean() }),
});
