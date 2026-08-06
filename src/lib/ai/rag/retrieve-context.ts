import 'server-only';
import mongoose from 'mongoose';
import KnowledgeChunk from '@/models/KnowledgeChunk';
import KnowledgeDocument from '@/models/KnowledgeDocument';
import { cosineSimilarity, generateEmbeddings } from '@/lib/ai/embeddings';
import { connectToDatabase } from '@/lib/db/connect';
import { buildContext } from './context-builder';
import { RAG_CONFIG } from './rag-config';
import type { KnowledgeVisibility, RetrievedContext } from './rag-types';
import { normalizeAndExpandQuery } from './query-normalization';

const GENERIC = new Set(['the','is','a','an','of','to','for','ki','ke','ka','ni','hai','he','link','profile','url','owner','founder','creator','account']);
function lexicalEvidence(query: string, content: string) {
  const terms = [...new Set(query.match(/[a-z0-9]+/g)?.filter((term) => term.length > 2 && !GENERIC.has(term)) ?? [])];
  const text = content.toLowerCase(); const lexicalScore = terms.length ? terms.filter((term) => text.includes(term)).length / terms.length : 0;
  const nameTerms = terms.slice(0, 2); const nameMatch = nameTerms.length === 2 && nameTerms.every((term) => text.includes(term));
  const asksProfile = /linkedin|profile|url|account/.test(query); const linkedInUrl = /https?:\/\/[^\s]*linkedin\.com\/[^\s]*/i.test(content);
  const exactMatchBonus = nameMatch && asksProfile && linkedInUrl ? 1 : nameMatch ? .65 : asksProfile && linkedInUrl ? .5 : 0;
  return { lexicalScore, exactMatchBonus };
}

export async function retrieveContext(input: { query: string; limit?: number; visibility: KnowledgeVisibility; documentId?: string; threshold?: number }): Promise<RetrievedContext> {
  const query = input.query.trim(); if (!query) throw new Error('A knowledge search query is required.');
  if (input.documentId && !mongoose.isObjectIdOrHexString(input.documentId)) throw new Error('Invalid knowledge document ID.');
  const limit = Math.min(Math.max(input.limit ?? RAG_CONFIG.defaultResultLimit, 1), 10); const threshold = Math.max(input.threshold ?? RAG_CONFIG.minSimilarity, RAG_CONFIG.minFinalScore);
  await connectToDatabase(); const documentFilter = input.documentId ? { _id: input.documentId } : {};
  const readyDocuments = await KnowledgeDocument.find({ ...documentFilter, status: 'ready', visibility: input.visibility }).select('_id').lean();
  if (!readyDocuments.length) return { chunks: [], context: '', candidateCount: 0, topScores: [] };
  const variants = normalizeAndExpandQuery(query);
  const [embeddings, candidates] = await Promise.all([generateEmbeddings(variants.expandedQueries), KnowledgeChunk.find({ documentId: { $in: readyDocuments.map((document) => document._id) }, 'metadata.visibility': input.visibility }).sort({ createdAt: -1 }).limit(RAG_CONFIG.maxCandidateChunks).select('+embedding').lean()]);
  const scored = candidates.flatMap((chunk) => {
    if (!chunk.metadata) return [];
    // A chunk is scored once, using its strongest semantic match across the
    // original question plus every retrieval-only expansion. This naturally
    // deduplicates a chunk found by several queries and retains its best score.
    const semanticMatches = embeddings.map((embedding, index) => ({
      score: cosineSimilarity(embedding, chunk.embedding as number[]),
      query: variants.expandedQueries[index],
    }));
    const bestSemanticMatch = semanticMatches.reduce((best, match) => match.score > best.score ? match : best);
    const semanticScore = bestSemanticMatch.score;
    const { lexicalScore, exactMatchBonus } = lexicalEvidence(variants.normalizedQuery, chunk.content);
    const finalScore = semanticScore * RAG_CONFIG.hybridWeights.semantic + lexicalScore * RAG_CONFIG.hybridWeights.lexical + exactMatchBonus * RAG_CONFIG.hybridWeights.exact;
    return [{ chunkId: String(chunk._id), documentId: String(chunk.documentId), documentTitle: chunk.metadata.documentTitle, content: chunk.content, score: finalScore, semanticScore, lexicalScore, exactMatchBonus, matchedQuery: bestSemanticMatch.query, chunkIndex: chunk.chunkIndex, visibility: chunk.metadata.visibility as KnowledgeVisibility }];
  }).sort((a,b) => b.score-a.score).slice(0, RAG_CONFIG.hybridCandidateLimit);
  const ranked = scored.filter((chunk) => chunk.score >= threshold).slice(0, limit); const context = buildContext(ranked);
  if (process.env.NODE_ENV !== 'production') console.info('[RAG] hybrid retrieval', {
    primaryQuery: variants.primaryQuery,
    secondaryQueries: variants.secondaryQueries,
    keywords: variants.keywords,
    matchedChunks: scored.map((chunk) => ({ chunkId: chunk.chunkId, documentTitle: chunk.documentTitle, matchedQuery: chunk.matchedQuery })),
    finalRanking: ranked.map((chunk) => ({ chunkId: chunk.chunkId, documentTitle: chunk.documentTitle, matchedQuery: chunk.matchedQuery, semanticScore: chunk.semanticScore, lexicalScore: chunk.lexicalScore, exactMatchBonus: chunk.exactMatchBonus, finalScore: chunk.score })),
  });
  return { ...context, candidateCount: candidates.length, topScores: scored.slice(0,5).map((chunk) => chunk.score) };
}
