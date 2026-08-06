import 'server-only';

import KnowledgeFact from '@/models/KnowledgeFact';
import type { GraphChunkInput, GraphEntityCandidate, GraphFactCandidate } from './graph-types';
import { detectConflicts } from './detect-conflicts';
import { normalizeGraphFactValue } from './fact-normalization';

export { normalizeGraphFactValue } from './fact-normalization';

export async function mergeFacts(entityId: string, facts: GraphFactCandidate[], source: GraphChunkInput, entity?: GraphEntityCandidate) {
  let persistedFactCount = 0;
  for (const fact of facts) {
    const normalizedValue = normalizeGraphFactValue(fact.value);
    await KnowledgeFact.findOneAndUpdate(
      { entityId, predicate: fact.predicate, normalizedValue, documentId: source.documentId, chunkId: source.chunkId },
      {
        // Reprocessing must enrich legacy fact rows too. Keeping this metadata
        // current makes the existing Rebuild Knowledge Index action a real
        // atomic-fact migration rather than creating a second fact format.
        $set: {
          entityName: entity?.name,
          entityType: entity?.entityType,
          field: fact.field ?? fact.predicate,
          sourceDocumentId: source.documentId,
          sourceChunkId: source.chunkId,
          sourceText: fact.supportingText,
          status: 'active',
          qualifiers: fact.qualifiers ?? {},
        },
        $setOnInsert: {
          entityId,
          predicate: fact.predicate,
          valueType: fact.valueType,
          value: fact.value,
          normalizedValue,
          confidence: fact.confidence,
          documentId: source.documentId,
          chunkId: source.chunkId,
          isConflicting: false,
          graphVersion: source.graphVersion,
        },
      },
      { upsert: true, new: false, setDefaultsOnInsert: true },
    );
    persistedFactCount += 1;
  }
  const conflicts = await detectConflicts(entityId, source.graphVersion);
  return { persistedFactCount, conflicts };
}
