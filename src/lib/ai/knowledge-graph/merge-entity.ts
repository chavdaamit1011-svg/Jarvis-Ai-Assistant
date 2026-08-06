import 'server-only';

import KnowledgeEntity from '@/models/KnowledgeEntity';
import type { GraphChunkInput, GraphEntityCandidate } from './graph-types';
import { normalizeAliases, normalizeEntityName } from './normalize-entity';
import { resolveEntity, type EntityIdentityEvidence } from './resolve-entity';

export async function mergeEntity(candidate: GraphEntityCandidate, source: GraphChunkInput, identityEvidence: EntityIdentityEvidence[] = []) {
  const normalizedName = normalizeEntityName(candidate.name);
  const aliases = normalizeAliases(candidate.name, candidate.aliases);
  const resolution = await resolveEntity(candidate, { identityEvidence, ...source });
  if (resolution.outcome === 'matched' && resolution.entityId) {
    const entity = await KnowledgeEntity.findByIdAndUpdate(
      resolution.entityId,
      { $addToSet: { aliases: { $each: aliases }, sourceDocumentIds: source.documentId, sourceChunkIds: source.chunkId } },
      { new: true },
    ).orFail();
    return { entity, created: false };
  }
  const entity = await KnowledgeEntity.findOneAndUpdate(
    { entityType: candidate.entityType, normalizedName },
    {
      $setOnInsert: {
        entityType: candidate.entityType,
        canonicalName: candidate.name,
        normalizedName,
        confidence: 0.5,
        status: resolution.outcome === 'new_entity' ? 'active' : 'conflicted',
      },
      $addToSet: {
        aliases: { $each: aliases },
        sourceDocumentIds: source.documentId,
        sourceChunkIds: source.chunkId,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  return { entity, created: resolution.outcome === 'new_entity' };
}
