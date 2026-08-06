import 'server-only';

import KnowledgeFact from '@/models/KnowledgeFact';
import type { GraphChunkInput, GraphFactCandidate } from './graph-types';
import { detectConflicts } from './detect-conflicts';
import { normalizeGraphFactValue } from './fact-normalization';

export { normalizeGraphFactValue } from './fact-normalization';

export async function mergeFacts(entityId: string, facts: GraphFactCandidate[], source: GraphChunkInput) {
  let persistedFactCount = 0;
  for (const fact of facts) {
    const normalizedValue = normalizeGraphFactValue(fact.value);
    await KnowledgeFact.findOneAndUpdate(
      { entityId, predicate: fact.predicate, normalizedValue, documentId: source.documentId, chunkId: source.chunkId },
      { $setOnInsert: { entityId, predicate: fact.predicate, field: fact.predicate, valueType: fact.valueType, value: fact.value, normalizedValue, confidence: fact.confidence, documentId: source.documentId, chunkId: source.chunkId, sourceText: fact.supportingText, isConflicting: false, graphVersion: source.graphVersion } },
      { upsert: true, new: false, setDefaultsOnInsert: true },
    );
    persistedFactCount += 1;
  }
  const conflicts = await detectConflicts(entityId, source.graphVersion);
  return { persistedFactCount, conflicts };
}
