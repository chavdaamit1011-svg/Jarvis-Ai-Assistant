import 'server-only';

import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/db/connect';
import KnowledgeFact from '@/models/KnowledgeFact';
import KnowledgeRelationship from '@/models/KnowledgeRelationship';
import type { GraphChunkInput, GraphExtractionPayload } from './graph-types';
import { mergeEntity } from './merge-entity';
import { normalizeEntityName } from './normalize-entity';

function normalizeValue(value: string | number | boolean | string[]) {
  return Array.isArray(value)
    ? value.map((item) => normalizeEntityName(item)).join('|')
    : normalizeEntityName(String(value));
}

export async function storeGraph(input: GraphChunkInput, payload: GraphExtractionPayload) {
  if (!mongoose.isObjectIdOrHexString(input.documentId) || !mongoose.isObjectIdOrHexString(input.chunkId)) {
    throw new Error('A valid documentId and chunkId are required for graph storage.');
  }
  await connectToDatabase();
  const entityIds: Record<string, string> = {};
  for (const entity of payload.entities) {
    const stored = await mergeEntity(entity, input);
    entityIds[entity.temporaryId] = String(stored._id);
  }

  let persistedFactCount = 0;
  for (const fact of payload.facts) {
    const entityId = entityIds[fact.subjectTemporaryId];
    if (!entityId) continue;
    await KnowledgeFact.findOneAndUpdate(
      { entityId, predicate: fact.predicate, normalizedValue: normalizeValue(fact.value), documentId: input.documentId, chunkId: input.chunkId },
      {
        $setOnInsert: {
          entityId,
          predicate: fact.predicate,
          // field remains populated solely for legacy compatibility.
          field: fact.predicate,
          valueType: fact.valueType,
          value: fact.value,
          normalizedValue: normalizeValue(fact.value),
          confidence: fact.confidence,
          documentId: input.documentId,
          chunkId: input.chunkId,
          sourceText: fact.supportingText,
          isConflicting: false,
        },
      },
      { upsert: true, new: false, setDefaultsOnInsert: true },
    );
    persistedFactCount += 1;
  }

  let persistedRelationshipCount = 0;
  for (const relationship of payload.relationships) {
    const sourceEntityId = entityIds[relationship.sourceTemporaryId];
    const targetEntityId = entityIds[relationship.targetTemporaryId];
    if (!sourceEntityId || !targetEntityId) continue;
    await KnowledgeRelationship.findOneAndUpdate(
      { sourceEntityId, relationshipType: relationship.relationshipType, targetEntityId, documentId: input.documentId, chunkId: input.chunkId },
      {
        $setOnInsert: {
          sourceEntityId,
          relationshipType: relationship.relationshipType,
          targetEntityId,
          confidence: relationship.confidence,
          documentId: input.documentId,
          chunkId: input.chunkId,
          sourceText: relationship.supportingText,
          isConflicting: false,
        },
      },
      { upsert: true, new: false, setDefaultsOnInsert: true },
    );
    persistedRelationshipCount += 1;
  }
  return { persistedEntityIds: entityIds, persistedFactCount, persistedRelationshipCount };
}
