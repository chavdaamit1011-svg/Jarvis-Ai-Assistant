import type { QueryUnderstanding } from '@/lib/ai/query-understanding';

export type AnswerStrategy = 'normal' | 'knowledge_strict' | 'knowledge_hybrid';
export type AnswerRoute = 'structured_lookup' | 'rag' | 'general_llm' | 'clarification' | 'unavailable';

export interface AnswerRoutingDecision {
  route: AnswerRoute;
  reason: string;
  confidence: number;
  knowledgeFound: boolean;
  currentInformationRequired: boolean;
}

export interface AnswerRoutingInput {
  strategy: AnswerStrategy;
  query: string;
  understanding: QueryUnderstanding;
  structuredStatus?: 'found' | 'ambiguous' | 'missing' | 'skipped';
  ragFound?: boolean;
  ragConfidence?: number;
  knownEntityFound?: boolean;
}
