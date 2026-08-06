import { z } from 'zod';

export const contextResolutionSchema = z.object({
  standaloneQuery: z.string().min(1).max(8_000), referencedEntities: z.array(z.object({ type: z.string(), name: z.string(), id: z.string().optional() })).max(20),
  resolvedReferences: z.array(z.object({ original: z.string(), entity: z.object({ type: z.string(), name: z.string(), id: z.string().optional() }).nullable(), confidence: z.number().min(0).max(1) })).max(20),
  informationNeed: z.string().min(1).max(100), requestedAttributes: z.array(z.string().max(80)).max(20), conversationDependencies: z.array(z.string().max(120)).max(20),
  requiresClarification: z.boolean(), clarificationQuestion: z.string().max(300).nullable(), confidence: z.number().min(0).max(1), responseLanguage: z.string().min(1).max(160),
});
