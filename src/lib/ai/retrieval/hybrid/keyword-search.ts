import mongoose from 'mongoose';
import KnowledgeChunk from '@/models/KnowledgeChunk';
import KnowledgeDocument from '@/models/KnowledgeDocument';
import KnowledgeEntity from '@/models/KnowledgeEntity';
import { connectToDatabase } from '@/lib/db/connect';
import { RAG_CONFIG } from '@/lib/ai/rag/rag-config';
import type { HybridCandidate, HybridRetrievalInput } from './hybrid-types';

const STOP_WORDS = new Set(['the', 'and', 'for', 'with', 'what', 'where', 'when', 'does', 'did', 'is', 'are', 'a', 'an', 'of', 'to', 'in', 'ki', 'ke', 'ka', 'he', 'hai', 'chhe']);
function tokens(query: string) { return [...new Set(query.toLowerCase().match(/[\p{L}\p{N}]+/gu)?.filter((term) => term.length > 2 && !STOP_WORDS.has(term)) ?? [])]; }

/** Keyword/full-text-style matching used as a deterministic complement to vectors. */
export async function keywordSearch(input: HybridRetrievalInput, queries: string[]): Promise<HybridCandidate[]> {
  if (!queries.length) return [];
  await connectToDatabase();
  const visibility = input.visibility ?? 'public';
  const documents = await KnowledgeDocument.find({ status: 'ready', visibility, ...(input.documentType ? { sourceType: input.documentType } : {}) }).select('_id title').lean();
  if (!documents.length) return [];
  let entityChunkIds: mongoose.Types.ObjectId[] | undefined;
  if (input.entityId && mongoose.isObjectIdOrHexString(input.entityId)) {
    const entity = await KnowledgeEntity.findById(input.entityId).select('sourceChunkIds').lean();
    entityChunkIds = entity?.sourceChunkIds as mongoose.Types.ObjectId[] | undefined;
    if (entityChunkIds && entityChunkIds.length === 0) return [];
  }
  const chunks = await KnowledgeChunk.find({ documentId: { $in: documents.map((document) => document._id) }, 'metadata.visibility': visibility, ...(entityChunkIds ? { _id: { $in: entityChunkIds } } : {}) }).limit(RAG_CONFIG.maxCandidateChunks).lean();
  const titleById = new Map(documents.map((document) => [String(document._id), document.title]));

  return chunks.flatMap((chunk) => {
    const content = chunk.content.toLowerCase();
    const matches = queries.map((query) => {
      const terms = tokens(query); const score = terms.length ? terms.filter((term) => content.includes(term)).length / terms.length : 0;
      return { score, query };
    }).filter((match) => match.score > 0);
    if (!matches.length) return [];
    const best = matches.reduce((winner, match) => match.score > winner.score ? match : winner);
    return [{ kind: 'chunk' as const, documentId: String(chunk.documentId), chunkId: String(chunk._id), documentTitle: chunk.metadata?.documentTitle || titleById.get(String(chunk.documentId)), chunkIndex: chunk.chunkIndex, content: chunk.content, keywordScore: best.score, queryMatchCount: matches.length, matchedQueries: matches.map((match) => match.query) }];
  });
}
