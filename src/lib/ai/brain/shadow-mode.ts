import { createDefaultCapabilityRegistry, type ExecutionContext, type ExecutionPlan, type ExecutionResult } from './executor';
import { createPlan } from './planner';
import { runEvidencePipeline } from './pipeline';

export type OldFlowSnapshot = { capability: string; answerSource?: string; entity: string | null; requestedFields: string[]; fallbackUsed?: boolean };
export type ShadowComparison = { requestId: string; oldFlow: OldFlowSnapshot; newBrain: { capability: string; operation: string; entities: Array<{ type: string; name: string }>; requestedFields: string[]; executorStatus: string; answerSource: string; fallbackAllowed: boolean }; normalizer: Awaited<ReturnType<typeof createPlan>>['normalizer']; pipeline: Awaited<ReturnType<typeof runEvidencePipeline>>; comparison: { capabilityMatch: boolean; entityMatch: boolean; requestedFieldsMatch: boolean; answerSourceMatch: boolean | null; overallMatch: boolean } };

function metadataResult(plan: ExecutionPlan, answerSource: ExecutionResult['answerSource']): ExecutionResult {
  return { status: 'success', capability: plan.capability, answerSource, data: { shadow: true }, supportedFacts: [], sources: [], conflicts: [], fallbackAllowed: false, fallbackReason: null, errorCode: null, traceMetadata: { metadataOnly: true } };
}

export async function runShadowComparison(input: { query: string; context: ExecutionContext; oldFlow: OldFlowSnapshot; entityHints: Array<{ type: string; name: string; id?: string }>; entityAmbiguous: boolean; responseLanguage: string; timeoutMs?: number }): Promise<ShadowComparison> {
  const started = Date.now();
  const plan = await createPlan({ query: input.query, entityHints: input.entityHints, entityAmbiguous: input.entityAmbiguous, responseLanguage: input.responseLanguage });
  const registry = createDefaultCapabilityRegistry({ knowledge: async (value) => metadataResult(value, 'knowledge_graph'), general_ai: async (value) => metadataResult(value, 'general_ai') });
  const timeoutMs = input.timeoutMs ?? 1_500;
  const timed = Promise.race([runEvidencePipeline({ userQuery: input.query, plan, context: input.context, registry }), new Promise<Awaited<ReturnType<typeof runEvidencePipeline>>>((resolve) => setTimeout(() => resolve({ status: 'failed', plan, finalCandidateAnswer: '', durationMs: timeoutMs, failedStage: 'executor' }), timeoutMs))]);
  const pipeline = await timed;
  const result = pipeline.executionResult ?? { status: 'failed', capability: plan.capability, answerSource: 'system', data: null, supportedFacts: [], sources: [], conflicts: [], fallbackAllowed: false, fallbackReason: null, errorCode: 'SHADOW_TIMEOUT', traceMetadata: {} };
  const oldFields = [...input.oldFlow.requestedFields].sort(); const newFields = [...plan.requestedFields].sort();
  const comparison = { capabilityMatch: input.oldFlow.capability === plan.capability, entityMatch: input.oldFlow.entity === null ? plan.entities.length === 0 : plan.entities.some((entity) => entity.name === input.oldFlow.entity), requestedFieldsMatch: oldFields.join('|') === newFields.join('|'), answerSourceMatch: input.oldFlow.answerSource ? input.oldFlow.answerSource.replaceAll('-', '_') === result.answerSource : null, overallMatch: input.oldFlow.capability === plan.capability && oldFields.join('|') === newFields.join('|') };
  return { requestId: input.context.requestId, oldFlow: input.oldFlow, newBrain: { capability: plan.capability, operation: plan.operation, entities: plan.entities, requestedFields: plan.requestedFields, executorStatus: result.status, answerSource: result.answerSource, fallbackAllowed: result.fallbackAllowed }, normalizer: plan.normalizer, pipeline, comparison: { ...comparison, overallMatch: comparison.overallMatch && Date.now() - started >= 0 } };
}
