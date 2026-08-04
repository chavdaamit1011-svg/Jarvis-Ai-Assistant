import type { AnswerRoutingDecision, AnswerRoutingInput } from './router-types';
import {
  DOCUMENT_DESCRIPTIVE_FIELDS,
  EXACT_VALUE_FIELDS,
  GENERAL_QUESTION_RAG_CONFIDENCE,
  requiresCurrentInformation,
} from './routing-policy';

export function routeAnswer(input: AnswerRoutingInput): AnswerRoutingDecision {
  const currentInformationRequired = requiresCurrentInformation(input.query);
  const confidence = input.understanding.confidence;

  if (input.strategy === 'normal') {
    return { route: 'general_llm', reason: 'Normal mode does not search the Knowledge Base.', confidence, knowledgeFound: false, currentInformationRequired };
  }
  if (EXACT_VALUE_FIELDS.has(input.understanding.requestedField)) {
    if (input.structuredStatus === 'found') return { route: 'structured_lookup', reason: 'An exact value was found in public structured knowledge.', confidence, knowledgeFound: true, currentInformationRequired };
    if (input.structuredStatus === 'ambiguous') return { route: 'clarification', reason: 'More than one structured knowledge match is available.', confidence, knowledgeFound: true, currentInformationRequired };
    if (input.strategy === 'knowledge_strict') return { route: 'unavailable', reason: 'The requested exact value is not stored in the Knowledge Base.', confidence, knowledgeFound: false, currentInformationRequired };
  }

  if (currentInformationRequired) {
    if (input.strategy === 'knowledge_strict') {
      return { route: 'unavailable', reason: 'Current information is not supported by the uploaded knowledge in strict mode.', confidence, knowledgeFound: false, currentInformationRequired };
    }
    return { route: 'general_llm', reason: 'This question requires current information; general AI must clearly disclose that live verification is unavailable.', confidence, knowledgeFound: false, currentInformationRequired };
  }

  if (input.ragFound) {
    const isDescriptive = DOCUMENT_DESCRIPTIVE_FIELDS.has(input.understanding.requestedField);
    const strongGeneralEvidence = (input.ragConfidence ?? 0) >= GENERAL_QUESTION_RAG_CONFIDENCE;
    if (isDescriptive || strongGeneralEvidence) {
      return { route: 'rag', reason: isDescriptive ? 'The question requests document-supported descriptive information.' : 'Relevant document evidence is strong enough for a general question.', confidence: Math.max(confidence, input.ragConfidence ?? 0), knowledgeFound: true, currentInformationRequired };
    }
  }

  if (input.strategy === 'knowledge_strict') {
    return { route: 'unavailable', reason: 'No sufficiently relevant knowledge was found in strict mode.', confidence, knowledgeFound: false, currentInformationRequired };
  }
  return { route: 'general_llm', reason: currentInformationRequired ? 'The question needs current information and no uploaded document supports it.' : 'No sufficiently useful uploaded knowledge was found; using general AI.', confidence, knowledgeFound: false, currentInformationRequired };
}
