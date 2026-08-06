import { buildEvidence } from '@/lib/ai/evidence-builder';
import { composeAnswer } from '@/lib/ai/answer';
import { validateAnswer } from '@/lib/ai/answer-validator';
import { executePlan } from '../executor';
import type { EvidencePipelineInput, EvidencePipelineResult } from './pipeline-types';

function unavailable(language: string) { return /hinglish|hindi|gujarati/i.test(language) ? 'Uploaded knowledge mein requested information available nahi hai.' : 'Uploaded knowledge does not contain supported information for this request.'; }

export async function runEvidencePipeline(input: EvidencePipelineInput): Promise<EvidencePipelineResult> {
  const started = Date.now();
  let stage: EvidencePipelineResult['failedStage'] = 'executor';
  try {
    const executionResult = await executePlan(input.plan, input.context, input.registry);
    if (executionResult.status === 'clarification') return { status: 'clarification', plan: input.plan, executionResult, finalCandidateAnswer: String((executionResult.data as { question?: string } | null)?.question ?? 'Please clarify your request.'), durationMs: Date.now() - started };
    if (executionResult.status === 'unavailable') return { status: 'unavailable', plan: input.plan, executionResult, finalCandidateAnswer: unavailable(input.plan.responseLanguage), durationMs: Date.now() - started };
    if (executionResult.status === 'failed') return { status: 'failed', plan: input.plan, executionResult, finalCandidateAnswer: '', durationMs: Date.now() - started, failedStage: 'executor' };
    stage = 'evidence_builder'; const evidence = buildEvidence(executionResult, { requestedFields: input.plan.requestedFields });
    stage = 'answer_composer'; const composedAnswer = await composeAnswer({ userQuery: input.userQuery, plan: input.plan, evidence });
    stage = 'answer_validator'; const validationResult = validateAnswer({ plan: input.plan, evidence, composedAnswer });
    const finalCandidateAnswer = validationResult.decision === 'accept' ? composedAnswer.text : validationResult.decision === 'repair' ? validationResult.repairedAnswer ?? unavailable(input.plan.responseLanguage) : unavailable(input.plan.responseLanguage);
    return { status: validationResult.decision === 'reject' ? 'rejected' : 'success', plan: input.plan, executionResult, evidence, composedAnswer, validationResult, finalCandidateAnswer, durationMs: Date.now() - started };
  } catch {
    return { status: 'failed', plan: input.plan, finalCandidateAnswer: '', durationMs: Date.now() - started, failedStage: stage };
  }
}
