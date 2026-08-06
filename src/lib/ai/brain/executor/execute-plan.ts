import { executionResultSchema } from './executor-result-schema';
import { ExecutorError } from './executor-errors';
import type { CapabilityRegistry } from './capability-registry';
import type { ExecutionContext, ExecutionPlan, ExecutionResult } from './executor-types';

function abortPromise(signal?: AbortSignal) {
  return new Promise<never>((_, reject) => {
    if (!signal) return;
    if (signal.aborted) reject(new ExecutorError('ABORTED', 'Execution was aborted.'));
    signal.addEventListener('abort', () => reject(new ExecutorError('ABORTED', 'Execution was aborted.')), { once: true });
  });
}

function failure(plan: ExecutionPlan, error: unknown, metadata: Record<string, unknown>): ExecutionResult {
  const code = error instanceof ExecutorError ? error.code : 'EXECUTION_FAILED';
  return { status: 'failed', capability: plan.capability, answerSource: 'system', data: null, supportedFacts: [], sources: [], conflicts: [], fallbackAllowed: false, fallbackReason: null, errorCode: code, traceMetadata: metadata };
}

export async function executePlan(plan: ExecutionPlan, context: ExecutionContext, registry: CapabilityRegistry): Promise<ExecutionResult> {
  const startedAt = Date.now();
  let handlerName: string | null = null;
  try {
    const handler = registry.get(plan.capability);
    handlerName = handler.capability;
    if (!handler.canHandle(plan)) throw new ExecutorError('HANDLER_NOT_FOUND', `The ${handler.capability} handler cannot handle this plan.`);
    const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new ExecutorError('TIMEOUT', `${handler.capability} execution timed out.`)), handler.timeout));
    const result = await Promise.race([handler.execute(plan, context), timeout, abortPromise(context.abortSignal)]);
    const metadata = { plannedCapability: plan.capability, selectedHandler: handlerName, executionStartedAt: new Date(startedAt).toISOString(), executionCompletedAt: new Date().toISOString(), durationMs: Date.now() - startedAt, status: result.status, fallbackAllowed: result.fallbackAllowed, errorCode: result.errorCode };
    const validated = executionResultSchema.safeParse({ ...result, traceMetadata: { ...result.traceMetadata, ...metadata } });
    if (!validated.success) throw new ExecutorError('INVALID_RESULT', 'Handler returned an invalid execution result.');
    return validated.data;
  } catch (error) {
    return failure(plan, error, { plannedCapability: plan.capability, selectedHandler: handlerName, executionStartedAt: new Date(startedAt).toISOString(), executionCompletedAt: new Date().toISOString(), durationMs: Date.now() - startedAt, status: 'failed', fallbackAllowed: false, errorCode: error instanceof ExecutorError ? error.code : 'EXECUTION_FAILED' });
  }
}
