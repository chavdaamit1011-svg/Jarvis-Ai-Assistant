import mongoose from 'mongoose';
import KnowledgeChunk from '@/models/KnowledgeChunk';
import KnowledgeDocument from '@/models/KnowledgeDocument';
import KnowledgeEntity from '@/models/KnowledgeEntity';
import { cosineSimilarity, generateEmbeddings } from '@/lib/ai/embeddings';
import { connectToDatabase } from '@/lib/db/connect';
import { RAG_CONFIG } from '@/lib/ai/rag/rag-config';
import type { HybridCandidate, HybridRetrievalInput } from './hybrid-types';

/** Vector candidates only; no answer or LLM logic belongs here. */
export async function vectorSearch(input: HybridRetrievalInput, queries: string[]): Promise<HybridCandidate[]> {
  if (!queries.length) return [];
  await connectToDatabase();
  const visibility = input.visibility ?? 'public';
  const documents = await KnowledgeDocument.find({ status: 'ready', visibility, ...(input.documentType ? { sourceType: input.documentType } : {}) }).select('_id title').lean();
  if (!documents.length) return [];
  const documentIds = documents.map((document) => document._id);
  let entityChunkIds: mongoose.Types.ObjectId[] | undefined;
  if (input.entityId && mongoose.isObjectIdOrHexString(input.entityId)) {
    const entity = await KnowledgeEntity.findById(input.entityId).select('sourceChunkIds').lean();
    entityChunkIds = entity?.sourceChunkIds as mongoose.Types.ObjectId[] | undefined;
    if (entityChunkIds && entityChunkIds.length === 0) return [];
  }
  const chunks = await KnowledgeChunk.find({
    documentId: { $in: documentIds },
    'metadata.visibility': visibility,
    ...(entityChunkIds ? { _id: { $in: entityChunkIds } } : {}),
  }).select('+embedding').limit(RAG_CONFIG.maxCandidateChunks).lean();
  const embeddings = await generateEmbeddings(queries.slice(0, 20));
  const titleById = new Map(documents.map((document) => [String(document._id), document.title]));

  return chunks.flatMap((chunk) => {
    const matches = embeddings.map((embedding, index) => ({ score: cosineSimilarity(embedding, chunk.embedding as number[]), query: queries[index] }));
    if (!matches.length) return [];
    const best = matches.reduce((winner, match) => match.score > winner.score ? match : winner);
    return [{
      kind: 'chunk' as const,
      documentId: String(chunk.documentId),
      chunkId: String(chunk._id),
      documentTitle: chunk.metadata?.documentTitle || titleById.get(String(chunk.documentId)),
      content: chunk.content,
      vectorScore: best.score,
      queryMatchCount: matches.filter((match) => match.score >= RAG_CONFIG.minSimilarity).length,
      matchedQueries: matches.filter((match) => match.score >= RAG_CONFIG.minSimilarity).map((match) => match.query),
    }];
  });
}
