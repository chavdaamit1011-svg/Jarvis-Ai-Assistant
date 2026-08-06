import type { AnswerValidationInput } from './validator-types';

function normalizeLanguage(value: string) { return value.toLowerCase().replace(/[_-]/g, ' ').trim(); }

export function hasLanguageMismatch(input: AnswerValidationInput) {
  const requested = normalizeLanguage(input.plan.responseLanguage);
  const actual = normalizeLanguage(input.composedAnswer.language);
  if (!requested || requested === 'und' || !actual || actual === 'und') return false;
  return requested !== actual;
}
