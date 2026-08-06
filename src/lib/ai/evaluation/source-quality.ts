import type { EvaluationSource } from './evaluation-types';

export const EVALUATION_THRESHOLDS = {
  answerConfidence: 0.7,
  exactValueConfidence: 0.82,
  minimumRagSimilarity: 0.45,
  minimumRelevantChunks: 1,
} as const;

export function evaluateSourceQuality(sources: EvaluationSource[]) {
  const usable = sources.filter((source) => source.documentId && source.chunkId && source.documentStatus !== 'failed' && Boolean(source.supportingText?.trim()));
  const uniqueChunks = [...new Map(usable.map((source) => [`${source.documentId}:${source.chunkId}`, source])).values()];
  const documents = new Set(uniqueChunks.map((source) => source.documentId));
  return { sources: uniqueChunks, sourceCount: uniqueChunks.length, independentDocumentCount: documents.size, hasDirectText: uniqueChunks.length > 0 };
}
