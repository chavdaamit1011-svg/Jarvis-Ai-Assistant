import { createDefaultCapabilityRegistry, type ExecutionContext, type ExecutionPlan, type ExecutionResult } from './executor';
import { createPlan } from './planner';
import { runEvidencePipeline } from './pipeline';
import { resolveConversationContext, type ContextMessage, type ContextResolution } from './context-resolver';

export type OldFlowSnapshot = { capability: string; answerSource?: string; entity: string | null; requestedFields: string[]; fallbackUsed?: boolean };
export type ShadowComparison = { requestId: string; oldFlow: OldFlowSnapshot; newBrain: { capability: string; operation: string; entities: Array<{ type: string; name: string }>; requestedFields: string[]; executorStatus: string; answerSource: string; fallbackAllowed: boolean; plannerCandidates: Awaited<ReturnType<typeof createPlan>>['plannerCandidates']; plannerReasons: string[]; confidence: number }; normalizer: Awaited<ReturnType<typeof createPlan>>['normalizer']; context: { recentContextSummary: string[]; previousActiveEntity: string | null; resolvedReferences: ContextResolution['resolvedReferences']; standaloneQuery: string; informationNeed: string; requestedAttributes: string[]; contextConfidence: number; failed: boolean }; pipeline: Awaited<ReturnType<typeof runEvidencePipeline>>; comparison: { entityMatch: boolean; requestedFieldsMatch: boolean; capabilityMatch: boolean; contextUsed: boolean; comparisonStatus: 'matched' | 'different' | 'context_failed'; answerSourceMatch: boolean | null; overallMatch: boolean } };

function metadataResult(plan: ExecutionPlan, answerSource: ExecutionResult['answerSource']): ExecutionResult {
  return { status: 'success', capability: plan.capability, answerSource, data: { shadow: true }, supportedFacts: [], sources: [], conflicts: [], fallbackAllowed: false, fallbackReason: null, errorCode: null, traceMetadata: { metadataOnly: true } };
}

export async function runShadowComparison(input: { query: string; context: ExecutionContext; oldFlow: OldFlowSnapshot; entityHints: Array<{ type: string; name: string; id?: string }>; entityAmbiguous: boolean; responseLanguage: string; recentMessages?: ContextMessage[]; timeoutMs?: number; contextTimeoutMs?: number; contextResolver?: (value: Parameters<typeof resolveConversationContext>[0]) => ContextResolution | Promise<ContextResolution> }): Promise<ShadowComparison> {
  const started = Date.now();
  const recentMessages = (input.recentMessages ?? []).slice(-6);
  const previousUser = [...recentMessages].reverse().find((message) => message.role === 'user');
  const previousPlan = previousUser ? await createPlan({ query: previousUser.content, responseLanguage: input.responseLanguage }) : null;
  const activeEntities = input.entityHints.length ? input.entityHints : previousPlan?.entities ?? [];
  let contextResult: ContextResolution | null = null; let contextFailed = false;
  try {
    const resolver = input.contextResolver ?? resolveConversationContext;
    contextResult = await Promise.race([Promise.resolve(resolver({ currentQuery: input.query, recentMessages, activeEntities, previousPlan })), new Promise<never>((_, reject) => setTimeout(() => reject(new Error('context resolver timeout')), input.contextTimeoutMs ?? 400))]);
  } catch { contextFailed = true; }
  const standaloneQuery = contextResult?.standaloneQuery ?? input.query;
  const contextEntities = contextResult?.referencedEntities.length ? contextResult.referencedEntities : activeEntities;
  const plan = await createPlan({ query: standaloneQuery, entityHints: contextEntities, entityAmbiguous: input.entityAmbiguous || Boolean(contextResult?.requiresClarification), responseLanguage: input.responseLanguage });
  const registry = createDefaultCapabilityRegistry({ knowledge: async (value) => metadataResult(value, 'knowledge_graph'), general_ai: async (value) => metadataResult(value, 'general_ai') });
  const timeoutMs = input.timeoutMs ?? 1_500;
  const timed = Promise.race([runEvidencePipeline({ userQuery: input.query, plan, context: input.context, registry }), new Promise<Awaited<ReturnType<typeof runEvidencePipeline>>>((resolve) => setTimeout(() => resolve({ status: 'failed', plan, finalCandidateAnswer: '', durationMs: timeoutMs, failedStage: 'executor' }), timeoutMs))]);
  const pipeline = await timed;
  const result = pipeline.executionResult ?? { status: 'failed', capability: plan.capability, answerSource: 'system', data: null, supportedFacts: [], sources: [], conflicts: [], fallbackAllowed: false, fallbackReason: null, errorCode: 'SHADOW_TIMEOUT', traceMetadata: {} };
  const oldFields = [...input.oldFlow.requestedFields].sort(); const newFields = [...plan.requestedFields].sort();
  const baseComparison = { capabilityMatch: input.oldFlow.capability === plan.capability, entityMatch: input.oldFlow.entity === null ? plan.entities.length === 0 : plan.entities.some((entity) => entity.name === input.oldFlow.entity), requestedFieldsMatch: oldFields.join('|') === newFields.join('|'), answerSourceMatch: input.oldFlow.answerSource ? input.oldFlow.answerSource.replaceAll('-', '_') === result.answerSource : null };
  const overallMatch = baseComparison.capabilityMatch && baseComparison.requestedFieldsMatch && Date.now() - started >= 0;
  const context = { recentContextSummary: recentMessages.map((message) => `${message.role}:${message.content.slice(0, 120)}`), previousActiveEntity: activeEntities.length === 1 ? activeEntities[0].name : null, resolvedReferences: contextResult?.resolvedReferences ?? [], standaloneQuery, informationNeed: contextResult?.informationNeed ?? 'independent_request', requestedAttributes: contextResult?.requestedAttributes ?? [], contextConfidence: contextResult?.confidence ?? 0, failed: contextFailed };
  return { requestId: input.context.requestId, oldFlow: input.oldFlow, newBrain: { capability: plan.capability, operation: plan.operation, entities: plan.entities, requestedFields: plan.requestedFields, executorStatus: result.status, answerSource: result.answerSource, fallbackAllowed: result.fallbackAllowed, plannerCandidates: plan.plannerCandidates, plannerReasons: plan.plannerReasons, confidence: plan.confidence }, normalizer: plan.normalizer, context, pipeline, comparison: { ...baseComparison, contextUsed: Boolean(contextResult?.conversationDependencies.length), comparisonStatus: contextFailed ? 'context_failed' : overallMatch ? 'matched' : 'different', overallMatch } };
}
