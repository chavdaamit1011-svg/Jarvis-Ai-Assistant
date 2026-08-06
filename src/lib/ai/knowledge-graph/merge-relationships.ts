import 'server-only';

import KnowledgeRelationship from '@/models/KnowledgeRelationship';
import type { GraphChunkInput, GraphRelationshipCandidate } from './graph-types';

export async function mergeRelationships(entityIds: Record<string, string>, relationships: GraphRelationshipCandidate[], source: GraphChunkInput) {
  let persistedRelationshipCount = 0;
  for (const relationship of relationships) {
    const sourceEntityId = entityIds[relationship.sourceTemporaryId];
    const targetEntityId = entityIds[relationship.targetTemporaryId];
    if (!sourceEntityId || !targetEntityId) continue;
    await KnowledgeRelationship.findOneAndUpdate(
      { sourceEntityId, relationshipType: relationship.relationshipType, targetEntityId, documentId: source.documentId, chunkId: source.chunkId },
      { $setOnInsert: { sourceEntityId, relationshipType: relationship.relationshipType, targetEntityId, confidence: relationship.confidence, documentId: source.documentId, chunkId: source.chunkId, sourceText: relationship.supportingText, isConflicting: false } },
      { upsert: true, new: false, setDefaultsOnInsert: true },
    );
    persistedRelationshipCount += 1;
  }
  return { persistedRelationshipCount };
}
