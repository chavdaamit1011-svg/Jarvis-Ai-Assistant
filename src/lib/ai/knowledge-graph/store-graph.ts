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
  for (const entity of payload.entities) {
    const identityEvidence: EntityIdentityEvidence[] = payload.facts.flatMap((fact) => {
      if (fact.subjectTemporaryId !== entity.temporaryId || typeof fact.value !== 'string' || !identityPredicates.has(fact.predicate as EntityIdentityEvidence['predicate'])) return [];
      return [{ predicate: fact.predicate as EntityIdentityEvidence['predicate'], value: fact.value }];
    });
    const stored = await mergeEntity(entity, input, identityEvidence);
    entityIds[entity.temporaryId] = String(stored._id);
  }

  let persistedFactCount = 0;
  for (const [temporaryId, entityId] of Object.entries(entityIds)) {
    const merged = await mergeFacts(entityId, payload.facts.filter((fact) => fact.subjectTemporaryId === temporaryId), input);
    persistedFactCount += merged.persistedFactCount;
  }
  const { persistedRelationshipCount } = await mergeRelationships(entityIds, payload.relationships, input);
  return { persistedEntityIds: entityIds, persistedFactCount, persistedRelationshipCount };
}
