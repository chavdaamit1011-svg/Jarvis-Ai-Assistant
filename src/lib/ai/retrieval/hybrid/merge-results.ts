import { candidateKey, mergeMatchedQueries } from './search-helpers';
import type { HybridCandidate } from './hybrid-types';

const WEIGHTS = { vector: 0.6, keyword: 0.25, exact: 0.15 } as const;

function finalScore(candidate: HybridCandidate) {
  // Exact structured values are not guesses; they outrank semantic/keyword
  // candidates so a matching URL, email, ID, or fact is never buried below a
  // merely similar chunk.
  if ((candidate.exactScore ?? 0) > 0) return 1 + (candidate.exactScore ?? 0) * WEIGHTS.exact;
  return (candidate.vectorScore ?? 0) * WEIGHTS.vector
    + (candidate.keywordScore ?? 0) * WEIGHTS.keyword
    + (candidate.exactScore ?? 0) * WEIGHTS.exact;
}

/** Merges the same fact/chunk from independent retrieval strategies. */
export function mergeHybridResults(groups: HybridCandidate[][]) {
  const all = groups.flat(); const byKey = new Map<string, HybridCandidate>();
  for (const candidate of all) {
    const key = candidateKey(candidate); const current = byKey.get(key);
    if (!current) {
      byKey.set(key, { ...candidate, matchedQueries: [...candidate.matchedQueries] });
      continue;
    }
    current.vectorScore = Math.max(current.vectorScore ?? 0, candidate.vectorScore ?? 0) || undefined;
    current.keywordScore = Math.max(current.keywordScore ?? 0, candidate.keywordScore ?? 0) || undefined;
    current.exactScore = Math.max(current.exactScore ?? 0, candidate.exactScore ?? 0) || undefined;
    current.queryMatchCount += candidate.queryMatchCount;
    current.matchedQueries = mergeMatchedQueries(current.matchedQueries, candidate.matchedQueries);
    current.content ||= candidate.content; current.documentTitle ||= candidate.documentTitle;
  }
  return {
    candidates: [...byKey.values()].map((candidate) => ({ ...candidate, score: finalScore(candidate) })).sort((left, right) => (right.score ?? 0) - (left.score ?? 0)),
    deduplicatedCount: all.length - byKey.size,
  };
}
