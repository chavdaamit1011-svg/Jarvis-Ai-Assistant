import { mergeHybridResults } from './merge-results';
import { uniqueQueries } from './search-helpers';
import type { HybridRetrievalInput, HybridRetrievalResult, HybridSearchDependencies } from './hybrid-types';

async function defaultDependencies(): Promise<HybridSearchDependencies> {
  // Keep database/embedding adapters out of unit-test imports. These modules
  // load only when the real retriever is invoked without injected adapters.
  const [{ vectorSearch }, { keywordSearch }, { exactSearch }] = await Promise.all([
    import('./vector-search'), import('./keyword-search'), import('./exact-search'),
  ]);
  return { vectorSearch, keywordSearch, exactSearch };
}

/**
 * Multi-query candidate retrieval. It does not compose an answer, call an
 * LLM, or make a relevance judgement beyond deterministic score merging.
 */
export async function retrieveHybridCandidates(input: HybridRetrievalInput, dependencies?: HybridSearchDependencies): Promise<HybridRetrievalResult> {
  const startedAt = Date.now();
  const topK = Math.min(Math.max(input.topK, 1), 20);
  const normalizedInput = { ...input, topK };
  const queries = uniqueQueries(normalizedInput).slice(0, 20);
  if (!queries.length) {
    return { candidates: [], trace: { inputQueries: [], vectorResults: [], keywordResults: [], exactResults: [], mergedCandidates: [], deduplicatedCount: 0, durationMs: Date.now() - startedAt } };
  }
  const search = dependencies ?? await defaultDependencies();
  const [vectorResults, keywordResults, exactResults] = await Promise.all([
    search.vectorSearch(normalizedInput, queries),
    search.keywordSearch(normalizedInput, queries),
    search.exactSearch(normalizedInput),
  ]);
  const merged = mergeHybridResults([vectorResults, keywordResults, exactResults]);
  const candidates = merged.candidates.slice(0, topK);
  return {
    candidates,
    trace: {
      inputQueries: queries,
      vectorResults,
      keywordResults,
      exactResults,
      mergedCandidates: candidates,
      deduplicatedCount: merged.deduplicatedCount,
      durationMs: Date.now() - startedAt,
    },
  };
}
