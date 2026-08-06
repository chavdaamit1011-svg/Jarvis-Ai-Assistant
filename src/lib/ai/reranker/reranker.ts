import type { AiReranker, AiRerankerResult, RankedChunk, RerankerChunk, RerankerInput, RerankerResult } from './reranker-types';

const MAX_RERANK_CANDIDATES = 20;
const TOP_K = 5;

function baselineScore(chunk: RerankerChunk) {
  // Structured exact evidence intentionally outranks approximate retrieval.
  if ((chunk.exactScore ?? 0) > 0) return 1 + (chunk.exactScore ?? 0) * 0.15;
  return (chunk.vectorScore ?? 0) * 0.6 + (chunk.keywordScore ?? 0) * 0.4;
}

function toRetrievedChunk(chunk: RankedChunk): RerankerChunk {
  const copy = { ...chunk } as Partial<RankedChunk>;
  delete copy.rerankerScore;
  delete copy.rankingReason;
  return copy as RerankerChunk;
}

function deterministicFallback(input: RerankerInput): RerankerResult {
  const ranked = input.retrievedChunks.slice(0, MAX_RERANK_CANDIDATES)
    .map((chunk): RankedChunk => ({ ...chunk, rerankerScore: baselineScore(chunk), rankingReason: 'Deterministic hybrid retrieval score.' }))
    .sort((left, right) => right.rerankerScore - left.rerankerScore);
  return {
    rankedChunks: ranked.slice(0, TOP_K),
    rankingReason: 'AI reranking was unavailable; ranked by existing hybrid scores.',
    confidence: ranked.length ? 0.5 : 0,
    discardedChunks: ranked.slice(TOP_K).map(toRetrievedChunk),
  };
}

async function withTimeout<T>(work: Promise<T>, timeoutMs: number) {
  return Promise.race<T>([work, new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Reranker timed out.')), timeoutMs))]);
}

function validateAiResult(result: AiRerankerResult, chunks: RerankerChunk[]) {
  const candidateIds = new Set(chunks.map((chunk) => chunk.chunkId));
  const seen = new Set<string>();
  return result.rankings.filter((item) => candidateIds.has(item.chunkId) && !seen.has(item.chunkId) && (seen.add(item.chunkId) || true));
}

/**
 * Produces an ordered, bounded chunk list only. Callers decide how to build
 * context or answers from it.
 */
export async function rerankKnowledgeChunks(input: RerankerInput, options: { reranker?: AiReranker; timeoutMs?: number } = {}): Promise<RerankerResult> {
  if (!input.originalQuery.trim()) throw new Error('An original query is required for reranking.');
  const chunks = input.retrievedChunks.filter((chunk) => chunk.chunkId && chunk.documentId && chunk.text.trim()).slice(0, MAX_RERANK_CANDIDATES);
  if (!chunks.length) return { rankedChunks: [], rankingReason: 'No retrieved chunks were available to rank.', confidence: 0, discardedChunks: [] };
  const boundedInput = { ...input, retrievedChunks: chunks };
  const runReranker: AiReranker = options.reranker ?? (async (value) => {
    const { rerankWithGroq } = await import('./reranker-service');
    return rerankWithGroq(value);
  });

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const aiResult = await withTimeout(runReranker(boundedInput), options.timeoutMs ?? 3_000);
      const rankings = validateAiResult(aiResult, chunks);
      if (!rankings.length) throw new Error('Reranker returned no valid candidates.');
      const rankById = new Map(rankings.map((item) => [item.chunkId, item]));
      const ordered = chunks
        .filter((chunk) => rankById.has(chunk.chunkId))
        .map((chunk): RankedChunk => ({ ...chunk, rerankerScore: rankById.get(chunk.chunkId)!.score, rankingReason: rankById.get(chunk.chunkId)!.reason }))
        .sort((left, right) => right.rerankerScore - left.rerankerScore);
      const rankedChunks = ordered.slice(0, TOP_K);
      const selected = new Set(rankedChunks.map((chunk) => chunk.chunkId));
      return { rankedChunks, rankingReason: aiResult.rankingReason, confidence: aiResult.confidence, discardedChunks: chunks.filter((chunk) => !selected.has(chunk.chunkId)) };
    } catch {
      // One bounded retry; deterministic ranking below keeps retrieval usable.
    }
  }
  return deterministicFallback(boundedInput);
}
