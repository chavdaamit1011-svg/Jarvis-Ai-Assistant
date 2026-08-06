import 'server-only';

import KnowledgeEntity from '@/models/KnowledgeEntity';
import type { GraphEntityCandidate } from './graph-types';
import { normalizeAliases, normalizeEntityName } from './normalize-entity';

export async function mergeEntity(candidate: GraphEntityCandidate, source: { documentId: string; chunkId: string }) {
  const normalizedName = normalizeEntityName(candidate.name);
  const aliases = normalizeAliases(candidate.name, candidate.aliases);
  return KnowledgeEntity.findOneAndUpdate(
    { entityType: candidate.entityType, normalizedName },
    {
      $setOnInsert: {
        entityType: candidate.entityType,
        canonicalName: candidate.name,
        normalizedName,
        confidence: 0.5,
        status: 'active',
      },
      $addToSet: {
        aliases: { $each: aliases },
        sourceDocumentIds: source.documentId,
        sourceChunkIds: source.chunkId,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
}
