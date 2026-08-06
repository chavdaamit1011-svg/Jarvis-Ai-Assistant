import type { AnswerInput, ComposedAnswer } from './answer-types';

const EXACT_FIELDS = new Set(['linkedin_url', 'github_url', 'portfolio_url', 'website_url', 'email', 'phone']);
const EDUCATION = /\b(?:education|university|college|bachelor|master|degree|qualification|school)\b/i;
const PROJECT = /\b(?:project|e-commerce|ecommerce|application|app|website|store|built|created|developed)\b/i;
const MAX_COMPOSABLE_FACT_LENGTH = 280;

function isHinglish(language: string) { return /hinglish|hindi|gujarati/i.test(language); }
function unavailable(language: string, field: string) {
  const label = field === 'projects' ? 'project' : field || 'requested';
  if (isHinglish(language)) return `Uploaded knowledge mein ${label === 'project' ? 'project' : label || 'requested information'} ke liye supported information available nahi hai.`;
  return `Uploaded knowledge does not contain supported ${label} information for this entity.`;
}
function unique(values: string[]) { return [...new Map(values.filter((value) => value.length <= MAX_COMPOSABLE_FACT_LENGTH).map((value) => [value.toLowerCase(), value])).values()]; }
function factsFor(input: AnswerInput) {
  const field = input.plan.requestedFields[0] ?? '';
  if (field === 'projects') return input.evidence.facts.filter((fact) => PROJECT.test(fact));
  if (field === 'education') return input.evidence.facts.filter((fact) => EDUCATION.test(fact));
  return input.evidence.facts;
}

export function composeDeterministically(input: AnswerInput): ComposedAnswer {
  const { evidence, plan } = input;
  const language = plan.responseLanguage || evidence.language;
  const field = plan.requestedFields[0] ?? '';
  if (evidence.source === 'general') {
    const modelText = evidence.metadata.modelText;
    return { text: typeof modelText === 'string' && modelText.trim() ? modelText : unavailable(language, ''), answerSource: 'general_ai', usedFacts: [], usedUrls: [], citations: [], confidence: evidence.confidence, warnings: evidence.warnings, language };
  }
  if (evidence.source === 'utility') {
    const toolResult = evidence.metadata.toolResult;
    const explanation = toolResult && typeof toolResult === 'object' && 'explanation' in toolResult && typeof toolResult.explanation === 'string' ? toolResult.explanation : evidence.facts.join('\n');
    return { text: explanation || unavailable(language, 'utility'), answerSource: 'tool', usedFacts: evidence.facts, usedUrls: [], citations: [], confidence: evidence.confidence, warnings: evidence.warnings, language };
  }
  if (evidence.source === 'web') return { text: unavailable(language, 'live web'), answerSource: 'web', usedFacts: [], usedUrls: [], citations: [], confidence: evidence.confidence, warnings: evidence.warnings, language };
  if (EXACT_FIELDS.has(field)) {
    const text = evidence.urls[0] ?? unavailable(language, field.replace('_', ' '));
    return { text, answerSource: 'knowledge', usedFacts: [], usedUrls: evidence.urls.slice(0, 1), citations: evidence.urls.length ? evidence.citations : [], confidence: evidence.confidence, warnings: evidence.warnings, language };
  }
  const facts = unique(factsFor(input));
  if (!facts.length) return { text: unavailable(language, field), answerSource: 'knowledge', usedFacts: [], usedUrls: [], citations: [], confidence: evidence.confidence, warnings: evidence.warnings, language };
  return { text: facts.map((fact) => `- ${fact}`).join('\n'), answerSource: 'knowledge', usedFacts: facts, usedUrls: evidence.urls, citations: evidence.citations, confidence: evidence.confidence, warnings: evidence.warnings, language };
}
