import type { HybridCandidate, HybridRetrievalInput } from './hybrid-types';

export function uniqueQueries(input: HybridRetrievalInput) {
  return [...new Set([input.primaryQuery, ...input.alternateQueries, ...input.semanticConcepts].map((value) => value.trim()).filter(Boolean))];
}

export function candidateKey(candidate: HybridCandidate) {
  if (candidate.factId) return `fact:${candidate.factId}`;
  if (candidate.chunkId) return `chunk:${candidate.chunkId}`;
  if (candidate.entityId) return `entity:${candidate.entityId}`;
  return `content:${candidate.documentId ?? ''}:${candidate.content ?? ''}`;
}

export function requestedFieldMatches(candidate: HybridCandidate, fields: string[] | undefined) {
  if (!fields?.length || !candidate.predicate) return true;
  const predicate = candidate.predicate.toLowerCase().replace(/[_\s-]/g, '');
  return fields.some((field) => predicate.includes(field.toLowerCase().replace(/[_\s-]/g, '')));
}

export function mergeMatchedQueries(left: string[], right: string[]) {
  return [...new Set([...left, ...right])];
}
