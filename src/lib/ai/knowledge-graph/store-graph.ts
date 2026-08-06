import 'server-only';

import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/db/connect';
import type { GraphChunkInput, GraphExtractionPayload } from './graph-types';
import { mergeEntity } from './merge-entity';
import { mergeFacts } from './merge-facts';
import { mergeRelationships } from './merge-relationships';
import type { EntityIdentityEvidence } from './resolve-entity';

const identityPredicates = new Set<EntityIdentityEvidence['predicate']>(['email', 'linkedin_url', 'github_url', 'gitlab_url', 'instagram_url', 'x_url', 'youtube_url', 'website_url']);

export async function storeGraph(input: GraphChunkInput, payload: GraphExtractionPayload) {
  if (!mongoose.isObjectIdOrHexString(input.documentId) || !mongoose.isObjectIdOrHexString(input.chunkId)) {
    throw new Error('A valid documentId and chunkId are required for graph storage.');
  }
  await connectToDatabase();
  const entityIds: Record<string, string> = {};
  let entitiesCreated = 0;
  for (const entity of payload.entities) {
    const identityEvidence: EntityIdentityEvidence[] = payload.facts.flatMap((fact) => {
      if (fact.subjectTemporaryId !== entity.temporaryId || typeof fact.value !== 'string' || !identityPredicates.has(fact.predicate as EntityIdentityEvidence['predicate'])) return [];
      return [{ predicate: fact.predicate as EntityIdentityEvidence['predicate'], value: fact.value }];
    });
    const merged = await mergeEntity(entity, input, identityEvidence);
    entityIds[entity.temporaryId] = String(merged.entity._id);
    if (merged.created) entitiesCreated += 1;
  }

  let persistedFactCount = 0;
  const conflictKeys = new Set<string>();
  for (const [temporaryId, entityId] of Object.entries(entityIds)) {
    const entity = payload.entities.find((candidate) => candidate.temporaryId === temporaryId);
    const merged = await mergeFacts(entityId, payload.facts.filter((fact) => fact.subjectTemporaryId === temporaryId), input, entity);
    persistedFactCount += merged.persistedFactCount;
    for (const conflict of merged.conflicts) conflictKeys.add(`${entityId}:${conflict.predicate}`);
  }
  const { persistedRelationshipCount } = await mergeRelationships(entityIds, payload.relationships, input);
  return { persistedEntityIds: entityIds, entitiesCreated, persistedFactCount, persistedRelationshipCount, conflictsFound: conflictKeys.size };
}
