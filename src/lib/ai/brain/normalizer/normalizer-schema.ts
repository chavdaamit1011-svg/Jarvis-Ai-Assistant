import { z } from 'zod';

export const universalNormalizationSchema = z.object({
  rawQuery: z.string().min(1).max(8_000), cleanedQuery: z.string().min(1).max(8_000), normalizedMeaning: z.string().min(1).max(8_000),
  detectedLanguage: z.string().min(1).max(100), responseLanguage: z.string().min(1).max(160),
  entityMentions: z.array(z.object({ original: z.string().min(1).max(180), normalized: z.string().min(1).max(180) })).max(20),
  requestedFields: z.array(z.string().min(1).max(80)).max(20), temporalExpressions: z.array(z.string().max(120)).max(20), numericExpressions: z.array(z.string().max(120)).max(30),
  corrections: z.array(z.object({ original: z.string().min(1).max(120), corrected: z.string().min(1).max(120), confidence: z.number().min(0).max(1) })).max(30),
  confidence: z.number().min(0).max(1), normalizerMethod: z.enum(['deterministic', 'ai', 'fallback']), fallbackUsed: z.boolean(),
});
