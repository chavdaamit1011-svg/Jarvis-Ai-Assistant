import 'server-only';

import KnowledgeChunk from '@/models/KnowledgeChunk';
import KnowledgeDocument from '@/models/KnowledgeDocument';
import { EMBEDDING_MODEL_ID, generateEmbeddings } from '@/lib/ai/embeddings';
import { connectToDatabase } from '@/lib/db/connect';
import { chunkText, cleanKnowledgeText } from './chunk-text';
import { RAG_CONFIG } from './rag-config';
import type { KnowledgeVisibility } from './rag-types';

export async function ingestDocument(input: { title: string; content: string; description?: string; visibility: KnowledgeVisibility }) {
  const title = input.title.trim(); const content = cleanKnowledgeText(input.content);
  if (!title || title.length > RAG_CONFIG.maxTitleCharacters) throw new Error('A title of 1-120 characters is required.');
  if (!content) throw new Error('Knowledge content must not be empty.');
  if (content.length > RAG_CONFIG.maxDocumentCharacters) throw new Error(`Knowledge content must be ${RAG_CONFIG.maxDocumentCharacters} characters or fewer.`);
  await connectToDatabase();
  const document = await KnowledgeDocument.create({ title, description: input.description?.trim(), sourceType: 'manual', originalContent: content, status: 'processing', visibility: input.visibility });
  try {
    const chunks = chunkText(content);
    const embeddings: number[][] = [];
    for (let offset = 0; offset < chunks.length; offset += RAG_CONFIG.embeddingBatchSize) embeddings.push(...await generateEmbeddings(chunks.slice(offset, offset + RAG_CONFIG.embeddingBatchSize).map((chunk) => chunk.content)));
    await KnowledgeChunk.insertMany(chunks.map((chunk, index) => ({ documentId: document._id, chunkIndex: chunk.chunkIndex, content: chunk.content, embedding: embeddings[index], embeddingDimension: embeddings[index].length, metadata: { documentTitle: title, sourceType: 'manual', visibility: input.visibility }, tokenEstimate: chunk.estimatedTokenCount })));
    document.status = 'ready'; document.chunkCount = chunks.length; document.embeddingModel = EMBEDDING_MODEL_ID; await document.save();
    return document;
  } catch (error) {
    await KnowledgeChunk.deleteMany({ documentId: document._id }).catch(() => undefined);
    document.status = 'failed'; await document.save().catch(() => undefined);
    console.error('[RAG] Knowledge ingestion failed:', error instanceof Error ? error.message : 'unknown error');
    throw new Error('Knowledge document processing failed. Please try again.');
  }
}
