import type { EntityMatchStrength, FactEvidence } from './evaluation-types';

export function calculateAnswerConfidence(input: { matchStrength: EntityMatchStrength; supportedFacts: FactEvidence[]; hasDirectText: boolean; retrievalScore?: number; retrievalSupportsAnswer?: boolean }) {
  const entityScore = input.matchStrength === 'full_name' ? 1 : input.matchStrength === 'alias' ? 0.88 : input.matchStrength === 'weak_similarity' ? 0.55 : 0.7;
  const factScore = input.supportedFacts.length ? Math.min(1, 0.75 + input.supportedFacts.length * 0.08) : 0;
  const sourceScore = input.hasDirectText ? 1 : 0;
  const retrievalScore = input.retrievalSupportsAnswer ? Math.max(0, Math.min(1, input.retrievalScore ?? 0)) : 0;
  const weighted = input.supportedFacts.length
    ? entityScore * 0.25 + factScore * 0.45 + sourceScore * 0.3
    : entityScore * 0.2 + retrievalScore * 0.55 + sourceScore * 0.25;
  return Math.round(weighted * 100) / 100;
}
