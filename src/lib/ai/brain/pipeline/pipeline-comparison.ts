import type { EvidencePipelineResult, PipelineComparison } from './pipeline-types';

function normalizeSource(value: string) { return value.replaceAll('-', '_'); }
function preview(value: string) { return value.replace(/\s+/g, ' ').trim().slice(0, 280); }

export function compareEvidencePipeline(input: { oldAnswerSource: string; oldAnswerPreview: string; pipeline: EvidencePipelineResult }): PipelineComparison {
  const { pipeline } = input;
  const validation = pipeline.validationResult;
  const newAnswerSource = pipeline.composedAnswer?.answerSource ?? pipeline.executionResult?.answerSource ?? 'system';
  const answerSourceMatch = normalizeSource(input.oldAnswerSource) === normalizeSource(newAnswerSource);
  const languageMatch = !validation?.languageMismatch;
  const oldLooksUnsupported = /\b(?:may have|probably|likely|microservices?|machine learning|image classification|nlp)\b/i.test(input.oldAnswerPreview);
  const overallStatus: PipelineComparison['overallStatus'] = pipeline.status === 'failed' ? 'shadow_failed' : oldLooksUnsupported && pipeline.status === 'success' ? 'improved' : pipeline.status === 'rejected' && input.oldAnswerPreview ? 'regressed' : answerSourceMatch && languageMatch && pipeline.status === 'success' ? 'matched' : 'different';
  return { oldAnswerSource: input.oldAnswerSource, oldAnswerPreview: preview(input.oldAnswerPreview), newAnswerSource, newAnswerPreview: preview(pipeline.finalCandidateAnswer), plannerCapability: pipeline.plan.capability, executorCapability: pipeline.executionResult?.capability ?? pipeline.plan.capability, evidenceFactCount: pipeline.evidence?.facts.length ?? 0, evidenceSourceCount: pipeline.evidence?.citations.length ?? 0, validatorDecision: validation?.decision ?? pipeline.status, unsupportedClaimCount: validation?.unsupportedClaims.length ?? 0, languageMatch, answerSourceMatch, overallStatus };
}

export function isEvidenceShadowModeEnabled(value = process.env.AI_BRAIN_SHADOW_MODE) { return value === 'true'; }
