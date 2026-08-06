import type { EvaluationConflict } from './evaluation-types';

export function evaluateConflicts(conflicts: EvaluationConflict[] = []) {
  return conflicts.filter((conflict) => conflict.values.length > 1 && conflict.sources.some((source) => Boolean(source.documentId && source.chunkId)));
}
