import 'server-only';

import { connectToDatabase } from '@/lib/db/connect';
import KnowledgeChunk from '@/models/KnowledgeChunk';
import KnowledgeDocument from '@/models/KnowledgeDocument';
import KnowledgeEntityResolution from '@/models/KnowledgeEntityResolution';
import KnowledgeFact from '@/models/KnowledgeFact';
import KnowledgeGraphRebuild from '@/models/KnowledgeGraphRebuild';
import KnowledgeRelationship from '@/models/KnowledgeRelationship';
import { processKnowledgeGraphChunk } from './process-chunk';

export const KNOWLEDGE_GRAPH_VERSION = 'kg-v1';
const CHUNK_BATCH_SIZE = 3;
const MAX_FAILURES_TO_STORE = 50;

type RebuildProgress = { totalDocuments: number; processedDocuments: number; totalChunks: number; processedChunks: number; entitiesCreated: number; factsCreated: number; relationshipsCreated: number; conflictsFound: number; failedChunks: number };
const emptyProgress = (): RebuildProgress => ({ totalDocuments: 0, processedDocuments: 0, totalChunks: 0, processedChunks: 0, entitiesCreated: 0, factsCreated: 0, relationshipsCreated: 0, conflictsFound: 0, failedChunks: 0 });

type RebuildJobValue = {
  _id: unknown;
  graphVersion: string;
  status: string;
  progress: RebuildProgress;
  failures?: Array<{ chunkId?: unknown; message?: string }>;
  startedAt?: Date;
  completedAt?: Date;
  errorMessage?: string;
  createdAt?: Date;
};

function publicJob(job: { toObject: () => RebuildJobValue } | null) {
  if (!job) return null;
  const value = job.toObject();
  return { id: String(value._id), graphVersion: value.graphVersion, status: value.status, progress: value.progress, failures: value.failures?.map((failure) => ({ chunkId: failure.chunkId ? String(failure.chunkId) : null, message: failure.message })), startedAt: value.startedAt, completedAt: value.completedAt, errorMessage: value.errorMessage, createdAt: value.createdAt };
}

export async function getKnowledgeGraphRebuildStatus() {
  await connectToDatabase();
  return publicJob(await KnowledgeGraphRebuild.findOne().sort({ createdAt: -1 }));
}

export async function rebuildKnowledgeGraph() {
  await connectToDatabase();
  const running = await KnowledgeGraphRebuild.findOne({ status: 'running' }).sort({ createdAt: -1 });
  if (running) throw new Error('A knowledge graph rebuild is already running.');

  const job = await KnowledgeGraphRebuild.create({ graphVersion: KNOWLEDGE_GRAPH_VERSION, status: 'running', startedAt: new Date(), progress: emptyProgress() });
  try {
    const documents = await KnowledgeDocument.find({ status: 'ready' }).select('_id').lean();
    const chunks = await KnowledgeChunk.find({ documentId: { $in: documents.map((document) => document._id) } }).select('_id documentId content chunkIndex').sort({ documentId: 1, chunkIndex: 1 }).lean();
    const progress: RebuildProgress = { ...emptyProgress(), totalDocuments: documents.length, totalChunks: chunks.length };
    await job.updateOne({ $set: { progress } });

    // Only derived data belonging to this graph version is cleared. Source
    // documents, chunks, embeddings, and legacy graph/index records remain intact.
    await Promise.all([
      KnowledgeFact.deleteMany({ graphVersion: KNOWLEDGE_GRAPH_VERSION }),
      KnowledgeRelationship.deleteMany({ graphVersion: KNOWLEDGE_GRAPH_VERSION }),
      KnowledgeEntityResolution.deleteMany({ graphVersion: KNOWLEDGE_GRAPH_VERSION }),
    ]);

    const chunksByDocument = new Map<string, typeof chunks>();
    for (const chunk of chunks) {
      const documentId = String(chunk.documentId);
      chunksByDocument.set(documentId, [...(chunksByDocument.get(documentId) ?? []), chunk]);
    }
    const failures: Array<{ chunkId: typeof chunks[number]['_id']; message: string }> = [];
    for (const document of documents) {
      const documentChunks = chunksByDocument.get(String(document._id)) ?? [];
      for (let index = 0; index < documentChunks.length; index += CHUNK_BATCH_SIZE) {
        const batch = documentChunks.slice(index, index + CHUNK_BATCH_SIZE);
        // Sequential execution inside a small batch prevents duplicate entity
        // races while keeping memory and provider use bounded.
        for (const chunk of batch) {
          try {
            const result = await processKnowledgeGraphChunk({ documentId: String(document._id), chunkId: String(chunk._id), content: chunk.content, graphVersion: KNOWLEDGE_GRAPH_VERSION });
            progress.entitiesCreated += result.entitiesCreated;
            progress.factsCreated += result.persistedFactCount;
            progress.relationshipsCreated += result.persistedRelationshipCount;
            progress.conflictsFound += result.conflictsFound;
          } catch (error) {
            progress.failedChunks += 1;
            const message = error instanceof Error ? error.message.slice(0, 300) : 'Chunk processing failed.';
            if (failures.length < MAX_FAILURES_TO_STORE) failures.push({ chunkId: chunk._id, message });
            if (process.env.NODE_ENV !== 'production') console.error('[knowledge-graph] rebuild chunk failed', { chunkId: String(chunk._id), message });
          } finally {
            progress.processedChunks += 1;
            await job.updateOne({ $set: { progress, failures } });
          }
        }
      }
      progress.processedDocuments += 1;
      await job.updateOne({ $set: { progress, failures } });
    }
    const status = progress.failedChunks ? 'completed_with_failures' : 'completed';
    await job.updateOne({ $set: { status, progress, failures, completedAt: new Date() } });
    const finished = await KnowledgeGraphRebuild.findById(job._id);
    if (process.env.NODE_ENV !== 'production') console.info('[knowledge-graph] rebuild complete', { graphVersion: KNOWLEDGE_GRAPH_VERSION, ...progress, status });
    return publicJob(finished);
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 500) : 'Knowledge graph rebuild failed.';
    await job.updateOne({ $set: { status: 'failed', errorMessage: message, completedAt: new Date() } });
    console.error('[knowledge-graph] rebuild failed:', message);
    throw error;
  }
}
