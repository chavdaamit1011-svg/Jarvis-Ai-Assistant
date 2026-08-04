import type { QueryUnderstanding } from '@/lib/ai/query-understanding';

export type AmbiguityResult = Pick<QueryUnderstanding, 'isAmbiguous' | 'missingInformation' | 'possibleIntents' | 'clarificationQuestion'>;

export type ClarificationInput = {
  query: string;
  understanding: QueryUnderstanding;
  entityName: string | null;
  availableLinkTypes: string[];
  ambiguousEntities?: string[];
};
