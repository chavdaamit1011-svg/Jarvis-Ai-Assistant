import type { Evidence } from '@/lib/ai/evidence-builder';
import type { ComposedAnswer } from '@/lib/ai/answer';

const URL = /(?:https?:\/\/|www\.)[^\s<>()\[\]{}"']+/gi;
const EMAIL = /[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g;
const PHONE = /\+?\d[\d\s()-]{7,}\d/g;
const DATE_OR_PRICE = /\b(?:\d{1,4}[/-]\d{1,2}[/-]\d{1,4}|\d{4}\s*[–-]\s*\d{4}|₹\s?\d+(?:\.\d+)?|\$\s?\d+(?:\.\d+)?)\b/g;

function found(text: string) { return [...(text.match(URL) ?? []), ...(text.match(EMAIL) ?? []), ...(text.match(PHONE) ?? []), ...(text.match(DATE_OR_PRICE) ?? [])]; }
function exactEvidence(evidence: Evidence) { return [...evidence.urls, ...evidence.facts.flatMap(found)]; }

export function findExactValueErrors(answer: ComposedAnswer, evidence: Evidence) {
  const expected = exactEvidence(evidence); const actual = found(answer.text); const errors: string[] = [];
  for (const value of actual) if (!expected.includes(value)) errors.push(`Unsupported exact value: ${value}`);
  if (['knowledge', 'structured_data'].includes(answer.answerSource)) for (const value of expected) if (!actual.includes(value) && evidence.urls.includes(value)) errors.push(`Missing exact URL: ${value}`);
  if (evidence.source === 'utility') {
    const tool = evidence.metadata.toolResult;
    const expectedText = tool && typeof tool === 'object' && 'explanation' in tool && typeof tool.explanation === 'string' ? tool.explanation : null;
    if (expectedText && answer.text !== expectedText) errors.push('Utility result was changed.');
  }
  return errors;
}
