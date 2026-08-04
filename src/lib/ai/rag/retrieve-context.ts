import 'server-only';

import KnowledgeChunk from '@/models/KnowledgeChunk';
import { cosineSimilarity, generateEmbedding } from '@/lib/ai/embeddings';
import { connectToDatabase } from '@/lib/db/connect';
import { buildContext } from './context-builder';
import { RAG_CONFIG } from './rag-config';
import type { KnowledgeVisibility, RetrievedContext } from './rag-types';

export async function retrieveContext(input: { query: string; limit?: number; visibility: KnowledgeVisibility }): Promise<RetrievedContext> {
  const query = input.query.trim(); if (!query) throw new Error('A knowledge search query is required.');
  const limit = Math.min(Math.max(input.limit ?? RAG_CONFIG.defaultResultLimit, 1), RAG_CONFIG.contextMaxSources);
  await connectToDatabase();
  const [queryEmbedding, candidates] = await Promise.all([
    generateEmbedding(query),
    KnowledgeChunk.find({ 'metadata.visibility': input.visibility }).sort({ createdAt: -1 }).limit(RAG_CONFIG.maxCandidateChunks).select('+embedding').lean(),
  ]);
  const ranked = candidates.flatMap((chunk) => {
    if (!chunk.metadata) return [];
    return [{
    chunkId: String(chunk._id), documentId: String(chunk.documentId), documentTitle: chunk.metadata.documentTitle, content: chunk.content,
    score: cosineSimilarity(queryEmbedding, chunk.embedding as number[]), chunkIndex: chunk.chunkIndex, visibility: chunk.metadata.visibility as KnowledgeVisibility,
    }];
  }).filter((chunk) => chunk.score >= RAG_CONFIG.minSimilarity).sort((a, b) => b.score - a.score).slice(0, limit);
  return buildContext(ranked);
}
