import type { ExecutionContext, ExecutionPlan, ExecutionResult, CapabilityRegistry } from '../executor';
import type { Evidence } from '@/lib/ai/evidence-builder';
import type { ComposedAnswer } from '@/lib/ai/answer';
import type { AnswerValidationResult } from '@/lib/ai/answer-validator';

export type ShadowPipelineStatus = 'success' | 'clarification' | 'unavailable' | 'rejected' | 'failed';
export type EvidencePipelineInput = { userQuery: string; plan: ExecutionPlan; context: ExecutionContext; registry: CapabilityRegistry };
export type EvidencePipelineResult = { status: ShadowPipelineStatus; plan: ExecutionPlan; executionResult?: ExecutionResult; evidence?: Evidence; composedAnswer?: ComposedAnswer; validationResult?: AnswerValidationResult; finalCandidateAnswer: string; durationMs: number; failedStage?: 'executor' | 'evidence_builder' | 'answer_composer' | 'answer_validator' };
export type PipelineComparison = { oldAnswerSource: string; oldAnswerPreview: string; newAnswerSource: string; newAnswerPreview: string; plannerCapability: string; executorCapability: string; evidenceFactCount: number; evidenceSourceCount: number; validatorDecision: string; unsupportedClaimCount: number; languageMatch: boolean; answerSourceMatch: boolean; overallStatus: 'matched' | 'improved' | 'regressed' | 'different' | 'shadow_failed' };
