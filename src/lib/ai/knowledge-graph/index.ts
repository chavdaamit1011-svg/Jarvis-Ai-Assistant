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
export { resolveEntity } from './resolve-entity';
export { mergeFacts, normalizeGraphFactValue } from './merge-facts';
export { valuesConflict } from './fact-normalization';
export { mergeRelationships } from './merge-relationships';
export { detectConflicts } from './detect-conflicts';
export { getEntityProfile } from './get-entity-profile';
export { lookupKnowledgeGraph } from './chat-lookup';
export type { GraphChatResult, GraphChatSource } from './chat-lookup';
export { storeGraph } from './store-graph';
export { processKnowledgeGraphChunk } from './process-chunk';
export { getKnowledgeGraphRebuildStatus, KNOWLEDGE_GRAPH_VERSION, rebuildKnowledgeGraph } from './rebuild-graph';
export { createTemporaryEntityId, normalizeAliases, normalizeEntityName } from './normalize-entity';
export { graphExtractionSchema } from './graph-types';
export type { GraphChunkInput, GraphEntityCandidate, GraphExtractionPayload, GraphFactCandidate, GraphProcessResult, GraphRelationshipCandidate } from './graph-types';
export type { ConsolidatedEntityProfile } from './get-entity-profile';
export type { EntityIdentityEvidence, EntityResolutionOutcome, EntityResolutionResult } from './resolve-entity';
