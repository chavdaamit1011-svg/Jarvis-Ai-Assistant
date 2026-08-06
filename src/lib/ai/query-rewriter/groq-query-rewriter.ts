import 'server-only';

import { createGroq } from '@ai-sdk/groq';
import { generateText } from 'ai';
import { DEFAULT_MODEL_ID } from '@/lib/ai/constants';
import { semanticQueryRewriteSchema } from './query-rewriter-schema';
import type { SemanticQueryRewriter } from './query-rewriter-types';

function parseJson(text: string): unknown {
  const cleaned = text.trim().replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
  return JSON.parse(cleaned);
}

/**
 * Rewrites only the retrieval query. It has no database, retriever, or answer
 * access, so it cannot influence facts returned to the user by itself.
 */
export const rewriteWithGroq: SemanticQueryRewriter = async (input) => {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey?.trim()) throw new Error('Query rewriting is unavailable because GROQ_API_KEY is not configured.');

  const context = typeof input.conversationContext === 'string'
    ? input.conversationContext.slice(0, 600)
    : '';
  const result = await generateText({
    model: createGroq({ apiKey })(DEFAULT_MODEL_ID),
    temperature: 0.1,
    maxOutputTokens: 500,
    system: `You rewrite knowledge-retrieval queries. Return JSON only with alternateQueries, semanticConcepts, and confidence.
Generate 3 to 6 concise search-query alternatives that preserve the requested meaning. Handle paraphrases, synonyms, informal wording, spelling variations, multilingual wording, headings, and singular/plural differences.
Never answer the user. Never add a fact, entity, URL, email, number, date, technical term, or requested field that was not supplied. Preserve every exact term provided by the caller.`,
    prompt: JSON.stringify({
      originalQuery: input.originalQuery,
      resolvedEntity: input.entityName,
      requestedFields: input.requestedFields ?? [],
      exactTermsToPreserve: input.exactTerms,
      conversationContext: context || undefined,
    }),
  });

  return semanticQueryRewriteSchema.parse(parseJson(result.text));
};
