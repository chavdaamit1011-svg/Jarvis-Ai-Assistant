import type { ExecutionPlan, ExecutorCapability } from '../executor';
import type { UniversalNormalization } from '../normalizer';

export type PlannerEntityHint = { type: string; name: string; id?: string };
export type PlannerInput = { query: string; entityHints?: PlannerEntityHint[]; entityAmbiguous?: boolean; responseLanguage?: string };
export type PlannerCandidate = { capability: ExecutorCapability; confidence: number; reasons: string[] };
export type UniversalPlan = ExecutionPlan & { plannerMethod: 'deterministic'; normalizedQuery: string; plannerCandidates: PlannerCandidate[]; plannerReasons: string[]; normalizer: Pick<UniversalNormalization, 'rawQuery' | 'cleanedQuery' | 'normalizedMeaning' | 'detectedLanguage' | 'responseLanguage' | 'corrections' | 'requestedFields' | 'normalizerMethod' | 'confidence' | 'fallbackUsed'> };
export type { ExecutorCapability };
