import { parseQueryDeterministically } from '@/lib/ai/query-understanding';
import { universalPlanSchema } from './planner-schema';
import { deterministicSignals } from './deterministic-signals';
import type { PlannerInput, UniversalPlan } from './planner-types';

export async function createPlan(input: PlannerInput): Promise<UniversalPlan> {
  const understanding = parseQueryDeterministically(input.query);
  const signal = deterministicSignals(input.query);
  const hints = input.entityHints ?? [];
  const capability = input.entityAmbiguous ? 'clarification' : signal.capability ?? (hints.length === 1 ? 'knowledge' : 'general_ai');
  const plan: UniversalPlan = {
    capability, operation: signal.operation, entities: hints.length ? hints.map(({ type, name }) => ({ type, name })) : understanding.entityName ? [{ type: understanding.entityType, name: understanding.entityName }] : [],
    requestedFields: understanding.requestedField === 'unknown' ? [] : [understanding.requestedField], arguments: {}, responseLanguage: input.responseLanguage ?? understanding.language ?? 'und',
    requiresCurrentInformation: signal.requiresCurrentInformation, requiresKnowledge: capability === 'knowledge', missingInformation: input.entityAmbiguous ? ['entity'] : signal.missingInformation,
    clarificationQuestion: input.entityAmbiguous ? 'Please clarify which entity you mean.' : signal.clarificationQuestion,
    confidence: input.entityAmbiguous || signal.capability ? 0.95 : hints.length === 1 ? 0.9 : understanding.confidence,
    plannerMethod: 'deterministic', normalizedQuery: understanding.normalizedQuery,
  };
  return universalPlanSchema.parse(plan);
}
