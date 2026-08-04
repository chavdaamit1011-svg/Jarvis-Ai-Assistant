export const RAG_CONFIG = {
  maxDocumentCharacters: 50_000,
  maxTitleCharacters: 120,
  chunkCharacters: 900,
  chunkOverlapCharacters: 120,
  maxChunksPerDocument: 80,
  embeddingBatchSize: 20,
  maxCandidateChunks: 300,
  defaultResultLimit: 5,
  minSimilarity: 0.28,
  contextCharacterBudget: 6_000,
  contextMaxSources: 5,
} as const;
