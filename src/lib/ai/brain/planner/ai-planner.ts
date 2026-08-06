import type { PlannerInput, UniversalPlan } from './planner-types';

/** Reserved structured-model seam. Shadow mode deliberately does not call it. */
export async function planWithAi(input: PlannerInput): Promise<UniversalPlan | null> { void input; return null; }
