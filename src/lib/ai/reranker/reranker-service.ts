import 'server-only';

import { createGroq } from '@ai-sdk/groq';
import { generateText } from 'ai';
import { z } from 'zod';
import { DEFAULT_MODEL_ID } from '@/lib/ai/constants';
import type { AiReranker } from './reranker-types';

const aiRerankerSchema = z.object({
  rankings: z.array(z.object({ chunkId: z.string().min(1), score: z.number().min(0).max(1), reason: z.string().min(1).max(180) })).max(20),
  rankingReason: z.string().min(1).max(300),
  confidence: z.number().min(0).max(1),
});

function parseJson(value: string): unknown {
  return JSON.parse(value.trim().replace(/^```json\s*/i, '').replace(/```$/i, '').trim());
}

/** AI ranking only: it cannot answer the user or introduce a new chunk. */
export const rerankWithGroq: AiReranker = async (input) => {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey?.trim()) throw new Error('AI reranking is unavailable because GROQ_API_KEY is not configured.');
  const candidates = input.retrievedChunks.slice(0, 20).map((chunk) => ({
    chunkId: chunk.chunkId,
    text: chunk.text.slice(0, 1_800),
    metadata: chunk.metadata,
    retrievalScores: { vector: chunk.vectorScore, keyword: chunk.keywordScore, exact: chunk.exactScore },
    matchedQueries: chunk.matchedQueries,
  }));
  const result = await generateText({
    model: createGroq({ apiKey })(DEFAULT_MODEL_ID),
    temperature: 0.1,
    maxOutputTokens: 900,
    system: `Rank supplied knowledge chunks for relevance to the question. Return JSON only with rankings, rankingReason, and confidence.
Use only supplied chunks. Never answer the question, add facts, or create chunk IDs. Prefer direct support for the resolved entity and requested information. Exact structured matches are strong evidence.`,
    prompt: JSON.stringify({ originalQuery: input.originalQuery, resolvedQuery: input.resolvedQuery ?? input.originalQuery, entity: input.entity ?? undefined, chunks: candidates }),
  });
  return aiRerankerSchema.parse(parseJson(result.text));
};

export { aiRerankerSchema };
