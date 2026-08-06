import 'server-only';

import { connectToDatabase } from '@/lib/db/connect';
import KnowledgeChunk from '@/models/KnowledgeChunk';
import KnowledgeDocument from '@/models/KnowledgeDocument';
import KnowledgeFact from '@/models/KnowledgeFact';
import { processKnowledgeGraphChunk } from '@/lib/ai/knowledge-graph';

export type KnowledgeExtractionDebug = {
  documentId: string;
  detectedSections: string[];
  extractedEntities: Array<{ id: string; type: string }>;
  extractedFacts: number;
  rejectedUncertainFacts: number;
  sourceMappings: Array<{ chunkId: string; factCount: number }>;
  warnings: string[];
};

function sectionsFrom(content: string) {
  return [...new Set(content.split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^[A-Z][A-Z\s&/-]{2,80}$/.test(line)))];
}

/**
 * Builds atomic facts for one ready document. Chunks and embeddings are never
 * altered; this only refreshes derived KnowledgeFact/graph data.
 */
export async function indexReadyDocument(documentId: string): Promise<{ entities: number; facts: number; debug: KnowledgeExtractionDebug }> {
  await connectToDatabase();
  const document = await KnowledgeDocument.findById(documentId).select('_id status originalContent').lean();
  const emptyDebug: KnowledgeExtractionDebug = { documentId, detectedSections: [], extractedEntities: [], extractedFacts: 0, rejectedUncertainFacts: 0, sourceMappings: [], warnings: [] };
  if (!document || document.status !== 'ready') return { entities: 0, facts: 0, debug: emptyDebug };

  const chunks = await KnowledgeChunk.find({ documentId: document._id }).select('_id content chunkIndex').sort({ chunkIndex: 1 }).lean();
  // Only this document's derived facts are replaced. Source documents/chunks
  // remain intact, and entities supported by other documents are retained.
  await KnowledgeFact.deleteMany({ documentId: document._id });

  let entities = 0;
  let facts = 0;
  const entitySet = new Map<string, { id: string; type: string }>();
  const debug: KnowledgeExtractionDebug = { ...emptyDebug, detectedSections: sectionsFrom(document.originalContent ?? '') };
  for (const chunk of chunks) {
    try {
      // AI extraction is additive only. If unavailable, deterministic facts are
      // still persisted and the document remains usable for semantic RAG.
      const result = await processKnowledgeGraphChunk({ documentId: String(document._id), chunkId: String(chunk._id), content: chunk.content }, { enableAi: true });
      entities += result.entitiesCreated;
      facts += result.persistedFactCount;
      debug.extractedFacts += result.persistedFactCount;
      debug.rejectedUncertainFacts += result.aiExtractionFailed ? 1 : 0;
      debug.warnings.push(...result.warnings.map((warning) => `Chunk ${String(chunk._id)}: ${warning}`));
      debug.sourceMappings.push({ chunkId: String(chunk._id), factCount: result.persistedFactCount });
      for (const entity of result.entities) {
        const id = result.persistedEntityIds[entity.temporaryId];
        if (id) entitySet.set(id, { id, type: entity.entityType });
      }
    } catch (error) {
      debug.rejectedUncertainFacts += 1;
      debug.warnings.push(`Chunk ${String(chunk._id)}: ${error instanceof Error ? error.message.slice(0, 180) : 'Atomic extraction failed.'}`);
    }
  }
  debug.extractedEntities = [...entitySet.values()];
  if (process.env.NODE_ENV !== 'production') {
    console.info('[knowledge-index] atomic extraction complete', {
      documentId,
      sections: debug.detectedSections.length,
      entities: debug.extractedEntities.length,
      facts: debug.extractedFacts,
      rejected: debug.rejectedUncertainFacts,
    });
  }
  return { entities, facts, debug };
}

/** Reprocess action for all ready documents; safe to run repeatedly. */
export async function rebuildKnowledgeIndex() {
  await connectToDatabase();
  const documents = await KnowledgeDocument.find({ status: 'ready' }).select('_id').lean();
  let entities = 0;
  let facts = 0;
  let failedDocuments = 0;
  const debug: KnowledgeExtractionDebug[] = [];
  for (const document of documents) {
    try {
      const indexed = await indexReadyDocument(String(document._id));
      entities += indexed.entities;
      facts += indexed.facts;
      debug.push(indexed.debug);
    } catch (error) {
      failedDocuments += 1;
      debug.push({ documentId: String(document._id), detectedSections: [], extractedEntities: [], extractedFacts: 0, rejectedUncertainFacts: 1, sourceMappings: [], warnings: [error instanceof Error ? error.message.slice(0, 180) : 'Document reprocess failed.'] });
    }
  }
  return { documents: documents.length, entities, facts, failedDocuments, debug };
}
