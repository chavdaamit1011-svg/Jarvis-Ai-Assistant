export type HybridRetrievalInput = {
  primaryQuery: string;
  alternateQueries: string[];
  semanticConcepts: string[];
  exactTerms: string[];
  entityId?: string;
  requestedFields?: string[];
  topK: number;
  visibility?: 'public' | 'private';
  documentType?: 'manual' | 'pdf' | 'docx' | 'txt';
  assistantScope?: string;
};

export type HybridCandidate = {
  kind: 'chunk' | 'fact' | 'entity';
  documentId?: string;
  chunkId?: string;
  entityId?: string;
  factId?: string;
  documentTitle?: string;
  content?: string;
  predicate?: string;
  value?: unknown;
  vectorScore?: number;
  keywordScore?: number;
  exactScore?: number;
  queryMatchCount: number;
  matchedQueries: string[];
  score?: number;
};

export type HybridRetrievalTrace = {
  inputQueries: string[];
  vectorResults: HybridCandidate[];
  keywordResults: HybridCandidate[];
  exactResults: HybridCandidate[];
  mergedCandidates: HybridCandidate[];
  deduplicatedCount: number;
  durationMs: number;
};

export type HybridRetrievalResult = {
  candidates: HybridCandidate[];
  trace: HybridRetrievalTrace;
};

export type HybridSearchDependencies = {
  vectorSearch: (input: HybridRetrievalInput, queries: string[]) => Promise<HybridCandidate[]>;
  keywordSearch: (input: HybridRetrievalInput, queries: string[]) => Promise<HybridCandidate[]>;
  exactSearch: (input: HybridRetrievalInput) => Promise<HybridCandidate[]>;
};
