import { composedAnswerSchema } from './answer-schema';
import { composeDeterministically } from './deterministic-composer';
import { composeWithLlm } from './llm-composer';
import type { AnswerInput, ComposedAnswer, LlmCompositionFunction } from './answer-types';

const SUMMARY_FIELDS = new Set(['summary', 'profession', 'role', 'ownership', 'experience']);

export async function composeAnswer(input: AnswerInput, options: { llmCompose?: LlmCompositionFunction } = {}): Promise<ComposedAnswer> {
  const requested = input.plan.requestedFields;
  const shouldUseLlm = input.evidence.source === 'knowledge' && requested.some((field) => SUMMARY_FIELDS.has(field)) && Boolean(options.llmCompose);
  const answer = shouldUseLlm && options.llmCompose ? await composeWithLlm(input, options.llmCompose) : composeDeterministically(input);
  return composedAnswerSchema.parse(answer) as ComposedAnswer;
}
