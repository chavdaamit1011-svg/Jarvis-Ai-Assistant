import 'server-only';

import { cosineSimilarity } from './cosine-similarity';
import { generateEmbeddings } from './generate-embedding';
import type { SearchDocument, SemanticSearchResult } from './types';

/**
 * Temporary runtime demo: document embeddings are recomputed for each search.
 * A later vector database should generate and store them once during indexing.
 */
export async function semanticSearch(query: string, documents: SearchDocument[], limit = 5): Promise<SemanticSearchResult[]> {
  if (documents.length === 0) return [];
  const safeLimit = Math.max(1, Math.min(Math.floor(limit), documents.length));
  const [queryEmbedding, ...documentEmbeddings] = await generateEmbeddings([
    query,
    ...documents.map((document) => `${document.title}\n${document.content}`),
  ]);

  return documents
    .map((document, index) => ({ ...document, score: cosineSimilarity(queryEmbedding, documentEmbeddings[index]) }))
    .sort((first, second) => second.score - first.score)
    .slice(0, safeLimit);
}
