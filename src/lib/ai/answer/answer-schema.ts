import { z } from 'zod';

export const composedAnswerSchema = z.object({
  text: z.string().min(1).max(20_000), answerSource: z.string().min(1).max(80),
  usedFacts: z.array(z.string()), usedUrls: z.array(z.string()), citations: z.array(z.unknown()),
  confidence: z.number().min(0).max(1), warnings: z.array(z.string()), language: z.string().min(1).max(80),
});
