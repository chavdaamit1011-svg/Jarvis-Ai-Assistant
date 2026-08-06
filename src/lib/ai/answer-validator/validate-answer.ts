import { composeDeterministically } from '@/lib/ai/answer';
import { answerValidationSchema } from './validator-schema';
import { findUnsupportedClaims, hasDuplicateClaims, hasSkillsAsProjectClaim } from './grounding-check';
import { findExactValueErrors } from './exact-value-check';
import { hasLanguageMismatch } from './language-check';
import type { AnswerValidationInput, AnswerValidationResult, ValidationIssue } from './validator-types';

function issue(code: string, message: string, severity: ValidationIssue['severity']): ValidationIssue { return { code, message, severity }; }

export function validateAnswer(input: AnswerValidationInput): AnswerValidationResult {
  const { evidence, composedAnswer, plan } = input;
  const issues: ValidationIssue[] = []; const missingRequiredFacts: string[] = [];
  const empty = !composedAnswer.text.trim() || /^(?:validation error|error)$/i.test(composedAnswer.text.trim());
  if (empty) issues.push(issue('EMPTY_ANSWER', 'The composed answer is empty or invalid.', 'high'));
  const languageMismatch = hasLanguageMismatch(input);
  if (languageMismatch) issues.push(issue('LANGUAGE_MISMATCH', 'Answer language does not match the requested response language.', 'medium'));
  const exactValueErrors = findExactValueErrors(composedAnswer, evidence);
  exactValueErrors.forEach((error) => issues.push(issue('EXACT_VALUE_ERROR', error, 'high')));
  let unsupportedClaims: string[] = [];
  if (evidence.source === 'knowledge') {
    if (!composedAnswer.citations.length) issues.push(issue('MISSING_KNOWLEDGE_SOURCES', 'Knowledge answers must include source citations.', 'high'));
    unsupportedClaims = findUnsupportedClaims(composedAnswer.text, evidence);
    if (hasSkillsAsProjectClaim(composedAnswer.text, evidence)) unsupportedClaims.push('Project claim is not directly supported by project evidence.');
    unsupportedClaims = [...new Set(unsupportedClaims)];
    unsupportedClaims.forEach((claim) => issues.push(issue('UNSUPPORTED_CLAIM', claim, 'high')));
    if (plan.requestedFields.includes('projects') && !evidence.facts.some((fact) => /\b(?:project|e-commerce|application|website|store|built|created|developed)\b/i.test(fact))) missingRequiredFacts.push('supported project information');
  } else if ((evidence.source === 'general' || evidence.source === 'utility') && composedAnswer.citations.length) {
    issues.push(issue('FAKE_KNOWLEDGE_SOURCES', 'General AI and Utility answers must not include knowledge citations.', 'high'));
  }
  if (/\b(?:may have|probably|likely|might have)\b/i.test(composedAnswer.text)) issues.push(issue('UNSUPPORTED_ASSUMPTION', 'Answer contains an unsupported assumption.', 'high'));
  if (hasDuplicateClaims(composedAnswer.text)) issues.push(issue('DUPLICATE_FACT', 'Answer contains duplicate facts.', 'low'));

  const missingKnowledgeSources = issues.some((entry) => entry.code === 'MISSING_KNOWLEDGE_SOURCES');
  const canRepair = evidence.source === 'knowledge' || evidence.source === 'utility';
  const needsRepair = issues.length > 0 && canRepair && !empty && !missingKnowledgeSources;
  const repaired = needsRepair ? composeDeterministically({ userQuery: '', plan, evidence }) : undefined;
  const high = issues.some((entry) => entry.severity === 'high');
  const decision: AnswerValidationResult['decision'] = !issues.length ? 'accept' : needsRepair ? 'repair' : high ? 'reject' : 'reject';
  const confidence = Math.max(0, Math.min(1, evidence.confidence - issues.length * 0.15));
  return answerValidationSchema.parse({ valid: decision === 'accept', decision, issues, unsupportedClaims, missingRequiredFacts, exactValueErrors, languageMismatch, repairedAnswer: repaired?.text, confidence }) as AnswerValidationResult;
}
