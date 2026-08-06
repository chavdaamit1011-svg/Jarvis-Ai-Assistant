import { calculateAnswerConfidence } from './answer-confidence';
import { evaluateConflicts } from './conflict-evaluator';
import { EVALUATION_THRESHOLDS, evaluateSourceQuality } from './source-quality';
import type { EvaluationInput, KnowledgeEvaluation } from './evaluation-types';

export function evaluateKnowledge(input: EvaluationInput): KnowledgeEvaluation {
  const reasons: string[] = [];
  const conflicts = evaluateConflicts(input.conflicts);
  const rejectedFacts = input.facts.filter((fact) => !fact.directlySupportsAnswer || fact.inferred || !evaluateSourceQuality(fact.sources).hasDirectText || (input.requiresExactValue && fact.valueKind !== 'exact_value'));
  const supportedFacts = input.facts.filter((fact) => !rejectedFacts.includes(fact));
  const quality = evaluateSourceQuality(supportedFacts.flatMap((fact) => fact.sources));
  if (input.entity.ambiguous) {
    reasons.push('More than one knowledge entity matches the request.');
    return { decision: 'clarify', confidence: 0, reasons, supportedFacts: [], rejectedFacts, conflicts, sources: [], sourceCount: 0, independentDocumentCount: 0 };
  }
  if (conflicts.length) {
    reasons.push('Supported knowledge sources contain conflicting values.');
    return { decision: 'conflict', confidence: 0.5, reasons, supportedFacts, rejectedFacts, conflicts, sources: quality.sources, sourceCount: quality.sourceCount, independentDocumentCount: quality.independentDocumentCount };
  }
  const retrievalUsable = Boolean(input.retrieval?.textSupportsAnswer)
    && (input.retrieval?.relevantChunkCount ?? 0) >= EVALUATION_THRESHOLDS.minimumRelevantChunks
    && (input.retrieval?.topSimilarityScore ?? 0) >= EVALUATION_THRESHOLDS.minimumRagSimilarity;
  if (!supportedFacts.length && !retrievalUsable) {
    reasons.push(input.entity.found ? 'No directly supported knowledge fact was found.' : 'No matching knowledge entity or relevant evidence was found.');
    return { decision: input.entity.found ? 'insufficient' : 'fallback', confidence: 0, reasons, supportedFacts, rejectedFacts, conflicts, sources: quality.sources, sourceCount: quality.sourceCount, independentDocumentCount: quality.independentDocumentCount };
  }
  const confidence = calculateAnswerConfidence({ matchStrength: input.entity.matchStrength, supportedFacts, hasDirectText: quality.hasDirectText, retrievalScore: input.retrieval?.topSimilarityScore, retrievalSupportsAnswer: retrievalUsable });
  const required = input.requiresExactValue ? EVALUATION_THRESHOLDS.exactValueConfidence : EVALUATION_THRESHOLDS.answerConfidence;
  if (confidence < required) {
    reasons.push('Evidence confidence is below the configured answer threshold.');
    return { decision: 'insufficient', confidence, reasons, supportedFacts, rejectedFacts, conflicts, sources: quality.sources, sourceCount: quality.sourceCount, independentDocumentCount: quality.independentDocumentCount };
  }
  reasons.push('Facts are directly supported by ready document and chunk sources.');
  return { decision: 'answer', confidence, reasons, supportedFacts, rejectedFacts, conflicts, sources: quality.sources, sourceCount: quality.sourceCount, independentDocumentCount: quality.independentDocumentCount };
}
