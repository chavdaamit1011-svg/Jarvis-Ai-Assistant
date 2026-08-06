import type { ExecutionPlan, ExecutorCapability } from '../executor';

export type PlannerEntityHint = { type: string; name: string; id?: string };
export type PlannerInput = { query: string; entityHints?: PlannerEntityHint[]; entityAmbiguous?: boolean; responseLanguage?: string };
export type UniversalPlan = ExecutionPlan & { plannerMethod: 'deterministic'; normalizedQuery: string };
export type { ExecutorCapability };
