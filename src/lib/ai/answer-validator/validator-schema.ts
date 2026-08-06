import { z } from 'zod';

export const answerValidationSchema = z.object({
  valid: z.boolean(), decision: z.enum(['accept', 'repair', 'reject']),
  issues: z.array(z.object({ code: z.string(), message: z.string(), severity: z.enum(['low', 'medium', 'high']) })),
  unsupportedClaims: z.array(z.string()), missingRequiredFacts: z.array(z.string()), exactValueErrors: z.array(z.string()),
  languageMismatch: z.boolean(), repairedAnswer: z.string().optional(), confidence: z.number().min(0).max(1),
});
