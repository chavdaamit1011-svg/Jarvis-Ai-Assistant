import { z } from 'zod';

export const semanticQueryRewriteSchema = z.object({
  alternateQueries: z.array(z.string().trim().min(1).max(500)).min(3).max(6),
  semanticConcepts: z.array(z.string().trim().min(1).max(80)).max(12),
  confidence: z.number().min(0).max(1),
});
