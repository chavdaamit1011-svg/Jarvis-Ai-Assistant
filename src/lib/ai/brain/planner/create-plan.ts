import { parseQueryDeterministically } from '@/lib/ai/query-understanding';
import { universalPlanSchema } from './planner-schema';
import { deterministicSignals } from './deterministic-signals';
import type { PlannerInput, UniversalPlan } from './planner-types';
import { normalizeQuery } from '../normalizer';

type SemanticShape = Pick<UniversalPlan, 'concept' | 'operation' | 'filters' | 'projection' | 'outputMode' | 'references'>;

type VerificationClaim = { text: string; expectedValue: string | number | null; valueKind: 'scalar' | 'count' | 'relationship' | 'status' | 'date' | 'unknown' };

function verificationClaim(query: string, concept: string): VerificationClaim | null {
  const cleaned = query.trim().replace(/[?]+$/u, '');
  if (!/^(?:is|are|was|were|does|do|did|has|have|can|kya)\b/i.test(cleaned)) return null;
  const date = cleaned.match(/\b\d{1,2}\s+[\p{L}]+\s+\d{4}\b/iu)?.[0];
  const numeric = cleaned.match(/\b\d+(?:\.\d+)?\b/u)?.[0];
  const status = cleaned.match(/\b(?:active|current|pursuing|attending|completed|inactive)\b/i)?.[0];
  const relationalObject = cleaned.match(/\b(?:own(?:s)?|built|created|uses?|works? (?:at|with|on)|worked on)\s+(.+)$/i)?.[1]?.trim();
  const prepositionalObject = cleaned.match(/\b(?:in|at|as|of)\s+([\p{L}\p{N}][\p{L}\p{N} .&'/-]*)$/iu)?.[1]?.trim();
  const expectedValue = date ?? (concept === 'projects' && numeric ? Number(numeric) : null) ?? status ?? relationalObject ?? prepositionalObject ?? null;
  const valueKind: VerificationClaim['valueKind'] = date ? 'date'
    : concept === 'projects' && numeric ? 'count'
      : status ? 'status'
        : relationalObject ? 'relationship'
          : expectedValue ? 'scalar' : 'unknown';
  return { text: cleaned, expectedValue, valueKind };
}

/**
 * Produces a portable query shape from normalized meaning.  This deliberately
 * describes request semantics only; it never knows document titles, people,
 * project names, or database fields.  Entity and relationship matching remain
 * the responsibility of the retrieval layer.
 */
function deriveSemanticShape(query: string, requestedFields: string[]): SemanticShape {
  const normalized = query.toLocaleLowerCase();
  const inferredConcept = /\b(?:birth ?date|date of birth|dob)\b/i.test(normalized) ? 'birthdate'
    : /\b(?:live|lives|reside|city|state|location|address)\b/i.test(normalized) ? 'location'
      : /\b(?:owner|owns|founder|creator)\b/i.test(normalized) ? 'ownership'
        : requestedFields[0] ?? 'knowledge';
  const concept = inferredConcept;
  const verification = verificationClaim(query, concept);
  const count = /\b(?:how many|count|total|number of|kitn[aei]|ketl[ao])\b/i.test(normalized);
  const relation = /\b(?:which|what|where|kis|kaunse|konsa)\b/i.test(normalized) && /\b(?:uses?|used|use kiya|works? with|built|created)\b/i.test(normalized);
  const detailed = /\b(?:describe|details?|explain|summary|about|tell me)\b/i.test(normalized);
  const list = /\b(?:which|what are|list|names?|kaunse|kon kon|batao)\b/i.test(normalized);
  const valuesOnly = /\b(?:only|sirf|keval)\b/i.test(normalized);
  const projection = /\b(?:urls?|links?|website|portfolio)\b/i.test(normalized)
    ? ['url']
    : /\b(?:names?|naam)\b/i.test(normalized)
      ? ['name']
      : concept === 'projects' && relation
        ? ['name']
        : [];
  const current = /\b(?:current(?:ly)?|present|now|abhi|haal(?:\s+me)?)\b/i.test(normalized);
  const completed = /\b(?:completed|complete|graduated|finished|pursued|pass out)\b/i.test(normalized);
  const filters: Record<string, unknown> = {};
  if (current) filters.state = 'current';
  if (completed) filters.state = 'completed';
  if (/\b(?:back[ -]?end|server[ -]?side)\b/i.test(normalized)) filters.category = 'backend';
  if (/\b(?:front[ -]?end|client[ -]?side|ui)\b/i.test(normalized)) filters.category = 'frontend';
  if (/\b(?:programming languages?|languages? known)\b/i.test(normalized)) filters.category = 'language';
  const operation = verification ? 'verify' : count ? 'count' : relation ? 'reverse_lookup' : detailed ? 'summarize' : list || projection.length ? 'list' : 'lookup';
  return {
    concept,
    operation,
    filters,
    projection,
    outputMode: valuesOnly || projection.length ? 'only_requested_fields' : 'narrative',
    references: [],
  };
}

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
  const semantic = deriveSemanticShape(normalization.normalizedMeaning, detectedFields);
  const namedEntity = normalization.entityMentions.length > 0 || Boolean(understanding.entityName);
  const candidates = scoreCandidates({ explicitCapability: signal.capability, namedEntity, knownEntityHint: hints.length === 1, fields: detectedFields, requiresCurrentInformation: signal.requiresCurrentInformation, ambiguous: Boolean(input.entityAmbiguous) });
  const winner = [...candidates].sort((left, right) => right.confidence - left.confidence)[0];
  const capability = winner.capability;
  const plan: UniversalPlan = {
    capability, operation: signal.capability ? signal.operation : semantic.operation, concept: semantic.concept,
    entities: hints.length ? hints.map(({ type, name }) => ({ type, name })) : normalization.entityMentions.map((entity) => ({ type: 'unknown', name: entity.original })),
    requestedFields: detectedFields, arguments: semantic.operation === 'verify' ? { verification: verificationClaim(normalization.normalizedMeaning, semantic.concept ?? 'knowledge') } : {}, responseLanguage: input.responseLanguage ?? normalization.responseLanguage,
    filters: semantic.filters, projection: semantic.projection, outputMode: semantic.outputMode, references: semantic.references,
    requiresCurrentInformation: signal.requiresCurrentInformation, requiresKnowledge: capability === 'knowledge', missingInformation: input.entityAmbiguous ? ['entity'] : signal.missingInformation,
    clarificationQuestion: input.entityAmbiguous ? 'Please clarify which entity you mean.' : signal.clarificationQuestion,
    confidence: winner.confidence, plannerMethod: 'deterministic', normalizedQuery: normalization.normalizedMeaning, plannerCandidates: candidates, plannerReasons: winner.reasons, normalizer: normalization,
  };
  return universalPlanSchema.parse(plan);
}
