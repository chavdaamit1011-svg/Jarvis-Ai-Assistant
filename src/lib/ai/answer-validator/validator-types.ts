import type { ExecutionPlan } from '@/lib/ai/brain/executor';
import type { Evidence } from '@/lib/ai/evidence-builder';
import type { ComposedAnswer } from '@/lib/ai/answer';

export type ValidationIssue = { code: string; message: string; severity: 'low' | 'medium' | 'high' };
export type AnswerValidationInput = { plan: ExecutionPlan; evidence: Evidence; composedAnswer: ComposedAnswer };
export type AnswerValidationResult = { valid: boolean; decision: 'accept' | 'repair' | 'reject'; issues: ValidationIssue[]; unsupportedClaims: string[]; missingRequiredFacts: string[]; exactValueErrors: string[]; languageMismatch: boolean; repairedAnswer?: string; confidence: number };
