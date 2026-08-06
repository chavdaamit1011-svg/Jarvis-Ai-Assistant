export type ResolvedRetrievalEntity = {
  id?: string;
  name: string;
  type?: string;
} | string | null;

export type QueryRewriterInput = {
  originalQuery: string;
  resolvedEntity?: ResolvedRetrievalEntity;
  requestedFields?: string[];
  /** A short, already-sanitized conversational summary when it is useful. */
  conversationContext?: string | null;
};

export type QueryRewriterTrace = {
  originalQuery: string;
  rewrittenQueries: string[];
  semanticConcepts: string[];
  rewriterConfidence: number;
  fallbackUsed: boolean;
};

export type QueryRewriteResult = {
  primaryQuery: string;
  alternateQueries: string[];
  semanticConcepts: string[];
  exactTerms: string[];
  confidence: number;
  trace: QueryRewriterTrace;
};

export type SemanticQueryRewriter = (input: QueryRewriterInput & { entityName: string | null; exactTerms: string[] }) => Promise<Omit<QueryRewriteResult, 'primaryQuery' | 'exactTerms' | 'trace'>>;
