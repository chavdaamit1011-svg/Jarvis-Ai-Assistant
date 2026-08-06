import { parseQueryDeterministically } from '@/lib/ai/query-understanding';
import { universalPlanSchema } from './planner-schema';
import { deterministicSignals } from './deterministic-signals';
import type { PlannerInput, UniversalPlan } from './planner-types';
import { normalizeQuery } from '../normalizer';

function scoreCandidates(input: { explicitCapability: UniversalPlan['capability'] | null; namedEntity: boolean; knownEntityHint: boolean; fields: string[]; requiresCurrentInformation: boolean; ambiguous: boolean }) {
  const candidates: UniversalPlan['plannerCandidates'] = [];
  const add = (capability: UniversalPlan['capability'], confidence: number, reasons: string[]) => candidates.push({ capability, confidence: Math.max(0, Math.min(1, confidence)), reasons });
  if (input.ambiguous) { add('clarification', 1, ['AMBIGUOUS_ENTITY']); return candidates; }
  if (input.explicitCapability) { add(input.explicitCapability, 0.98, ['DETERMINISTIC_SIGNAL']); return candidates; }
  const knowledgeReasons: string[] = []; let knowledge = 0.35;
  if (input.namedEntity) { knowledge += 0.22; knowledgeReasons.push('NAMED_ENTITY_DETECTED'); }
  if (input.knownEntityHint) { knowledge += 0.18; knowledgeReasons.push('KNOWN_ENTITY_HINT'); }
  if (input.fields.length) { knowledge += 0.22; knowledgeReasons.push('REQUESTED_FIELD_DETECTED'); }
  if (!input.requiresCurrentInformation) { knowledge += 0.08; knowledgeReasons.push('NO_LIVE_DATA_REQUIRED'); }
  const generalReasons = ['GENERAL_QUESTION_BASELINE']; let general = 0.77;
  if (input.namedEntity && input.fields.length) { general -= 0.25; generalReasons.push('ENTITY_AND_FIELD_REDUCE_GENERAL_CONFIDENCE'); }
  if (input.knownEntityHint) { general -= 0.2; generalReasons.push('KNOWN_ENTITY_REDUCE_GENERAL_CONFIDENCE'); }
  add('knowledge', knowledge, knowledgeReasons); add('general_ai', general, generalReasons);
  return candidates;
}

export async function createPlan(input: PlannerInput): Promise<UniversalPlan> {
  const normalization = await normalizeQuery({ rawQuery: input.query });
  const understanding = parseQueryDeterministically(normalization.normalizedMeaning);
  const signal = deterministicSignals(normalization.normalizedMeaning);
  const hints = input.entityHints ?? [];
  const detectedFields = normalization.requestedFields.length ? normalization.requestedFields : understanding.requestedField === 'unknown' ? [] : [understanding.requestedField];
  const namedEntity = normalization.entityMentions.length > 0 || Boolean(understanding.entityName);
  const candidates = scoreCandidates({ explicitCapability: signal.capability, namedEntity, knownEntityHint: hints.length === 1, fields: detectedFields, requiresCurrentInformation: signal.requiresCurrentInformation, ambiguous: Boolean(input.entityAmbiguous) });
  const winner = [...candidates].sort((left, right) => right.confidence - left.confidence)[0];
  const capability = winner.capability;
  const plan: UniversalPlan = {
    capability, operation: signal.operation, entities: hints.length ? hints.map(({ type, name }) => ({ type, name })) : normalization.entityMentions.map((entity) => ({ type: 'unknown', name: entity.original })),
    requestedFields: detectedFields, arguments: {}, responseLanguage: input.responseLanguage ?? normalization.responseLanguage,
    requiresCurrentInformation: signal.requiresCurrentInformation, requiresKnowledge: capability === 'knowledge', missingInformation: input.entityAmbiguous ? ['entity'] : signal.missingInformation,
    clarificationQuestion: input.entityAmbiguous ? 'Please clarify which entity you mean.' : signal.clarificationQuestion,
    confidence: winner.confidence, plannerMethod: 'deterministic', normalizedQuery: normalization.normalizedMeaning, plannerCandidates: candidates, plannerReasons: winner.reasons, normalizer: normalization,
  };
  return universalPlanSchema.parse(plan);
}
