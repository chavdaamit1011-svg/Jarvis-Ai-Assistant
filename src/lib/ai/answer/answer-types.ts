import type { ExecutionPlan } from '@/lib/ai/brain/executor';
import type { Evidence, EvidenceCitation } from '@/lib/ai/evidence-builder';

export type AnswerInput = { userQuery: string; plan: ExecutionPlan; evidence: Evidence };
export type ComposedAnswer = { text: string; answerSource: string; usedFacts: string[]; usedUrls: string[]; citations: EvidenceCitation[]; confidence: number; warnings: string[]; language: string };
export type LlmCompositionRequest = { userQuery: string; responseLanguage: string; facts: string[]; urls: string[]; citations: EvidenceCitation[]; warnings: string[] };
export type LlmCompositionFunction = (request: LlmCompositionRequest, options: { temperature: number }) => Promise<string>;
