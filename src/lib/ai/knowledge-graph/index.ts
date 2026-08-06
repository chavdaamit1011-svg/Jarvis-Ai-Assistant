export type {
  KnowledgeGraphConflict,
  KnowledgeGraphEntity,
  KnowledgeGraphEntityStatus,
  KnowledgeGraphEntityType,
  KnowledgeGraphFact,
  KnowledgeGraphRelationship,
  KnowledgeGraphSourceReference,
  KnowledgeGraphValueType,
} from './types';
export { extractDeterministicFacts } from './extract-deterministic-facts';
export { extractAiFacts } from './extract-ai-facts';
export { mergeEntity } from './merge-entity';
export { storeGraph } from './store-graph';
export { processKnowledgeGraphChunk } from './process-chunk';
export { createTemporaryEntityId, normalizeAliases, normalizeEntityName } from './normalize-entity';
export { graphExtractionSchema } from './graph-types';
export type { GraphChunkInput, GraphEntityCandidate, GraphExtractionPayload, GraphFactCandidate, GraphProcessResult, GraphRelationshipCandidate } from './graph-types';
