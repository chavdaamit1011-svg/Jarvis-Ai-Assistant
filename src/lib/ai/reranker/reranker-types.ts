export type RerankerChunk = {
  chunkId: string;
  documentId: string;
  text: string;
  metadata?: Record<string, unknown>;
  vectorScore?: number;
  keywordScore?: number;
  exactScore?: number;
  matchedQueries: string[];
};

export type RerankerInput = {
  originalQuery: string;
  resolvedQuery?: string;
  entity?: { id?: string; name: string; type?: string } | null;
  retrievedChunks: RerankerChunk[];
};

export type RankedChunk = RerankerChunk & {
  rerankerScore: number;
  rankingReason: string;
};

export type RerankerResult = {
  rankedChunks: RankedChunk[];
  rankingReason: string;
  confidence: number;
  discardedChunks: RerankerChunk[];
};

export type AiRerankerResult = {
  rankings: Array<{ chunkId: string; score: number; reason: string }>;
  rankingReason: string;
  confidence: number;
};

export type AiReranker = (input: RerankerInput) => Promise<AiRerankerResult>;
