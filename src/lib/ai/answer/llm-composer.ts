import type { AnswerInput, ComposedAnswer, LlmCompositionFunction } from './answer-types';

/**
 * The caller supplies the existing Groq generation transport. This module
 * intentionally sends structured evidence only; raw document chunks never
 * enter the LLM composition request.
 */
export async function composeWithLlm(input: AnswerInput, generate: LlmCompositionFunction): Promise<ComposedAnswer> {
  const { evidence, plan } = input;
  const text = await generate({ userQuery: input.userQuery, responseLanguage: plan.responseLanguage, facts: evidence.facts, urls: evidence.urls, citations: evidence.citations, warnings: evidence.warnings }, { temperature: 0.1 });
  return { text: text.trim(), answerSource: 'knowledge', usedFacts: evidence.facts, usedUrls: evidence.urls, citations: evidence.citations, confidence: evidence.confidence, warnings: evidence.warnings, language: plan.responseLanguage };
}
