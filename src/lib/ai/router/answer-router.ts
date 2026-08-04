import type { AnswerRoutingDecision, AnswerRoutingInput } from './router-types';
import {
  DOCUMENT_DESCRIPTIVE_FIELDS,
  EXACT_VALUE_FIELDS,
  GENERAL_QUESTION_RAG_CONFIDENCE,
  HYBRID_RAG_RELEVANCE,
  requiresCurrentInformation,
} from './routing-policy';

export function routeAnswer(input: AnswerRoutingInput): AnswerRoutingDecision {
  const currentInformationRequired = requiresCurrentInformation(input.query);
  const timeSensitive = currentInformationRequired;
  const confidence = input.understanding.confidence;

  if (timeSensitive) {
    return { route: 'web_search_required', reason: 'This question requires live or recent verification, and web search is not enabled.', confidence, knowledgeFound: false, timeSensitive, currentInformationRequired };
  }

  if (input.strategy === 'normal') {
    return { route: 'general_llm', reason: 'Normal mode does not search the Knowledge Base.', confidence, knowledgeFound: false, timeSensitive, currentInformationRequired };
  }
  if (EXACT_VALUE_FIELDS.has(input.understanding.requestedField)) {
    if (input.structuredStatus === 'found') return { route: 'structured_lookup', reason: 'An exact value was found in public structured knowledge.', confidence, knowledgeFound: true, timeSensitive, currentInformationRequired };
    if (input.structuredStatus === 'ambiguous') return { route: 'clarification', reason: 'More than one structured knowledge match is available.', confidence, knowledgeFound: true, timeSensitive, currentInformationRequired };
    if (input.strategy === 'knowledge_strict') return { route: 'unavailable', reason: 'The requested exact value is not stored in the Knowledge Base.', confidence, knowledgeFound: false, timeSensitive, currentInformationRequired };
  }

  const hasUsefulRagContext = Boolean(input.ragFound)
    && (input.ragUsefulChunkCount ?? 0) >= HYBRID_RAG_RELEVANCE.minUsefulChunks
    && (input.ragContextLength ?? 0) >= HYBRID_RAG_RELEVANCE.minContextCharacters;

  if (hasUsefulRagContext) {
    const isDescriptive = DOCUMENT_DESCRIPTIVE_FIELDS.has(input.understanding.requestedField);
    const strongGeneralEvidence = (input.ragConfidence ?? 0) >= GENERAL_QUESTION_RAG_CONFIDENCE;
    const entitySupportedEvidence = Boolean(input.knownEntityFound && (input.ragConfidence ?? 0) >= HYBRID_RAG_RELEVANCE.minEntitySimilarity);
    if ((isDescriptive && (strongGeneralEvidence || entitySupportedEvidence)) || strongGeneralEvidence || entitySupportedEvidence) {
      return { route: 'rag', reason: input.knownEntityFound ? 'A unique entity from uploaded knowledge was resolved.' : isDescriptive ? 'The question requests document-supported descriptive information.' : 'Relevant document evidence is strong enough for a general question.', confidence: Math.max(confidence, input.ragConfidence ?? 0), knowledgeFound: true, timeSensitive, currentInformationRequired };
    }
  }

  if (input.strategy === 'knowledge_strict') {
    return { route: 'unavailable', reason: 'No sufficiently relevant knowledge was found in strict mode.', confidence, knowledgeFound: false, timeSensitive, currentInformationRequired };
  }
  return { route: 'general_llm', reason: 'No sufficiently useful uploaded knowledge was found; using general AI.', confidence, knowledgeFound: false, timeSensitive, currentInformationRequired };
}
