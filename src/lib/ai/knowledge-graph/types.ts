export type KnowledgeGraphEntityType =
  | 'person'
  | 'organization'
  | 'project'
  | 'product'
  | 'technology'
  | 'location'
  | 'other';

export type KnowledgeGraphEntityStatus = 'active' | 'conflicted' | 'archived';

export type KnowledgeGraphValueType = 'string' | 'number' | 'boolean' | 'date' | 'url' | 'entity_reference' | 'string_array';

export type KnowledgeGraphSourceReference = {
  documentId: string;
  chunkId: string;
  sourceText: string;
};

export type KnowledgeGraphConflict = {
  predicate: string;
  values: unknown[];
  sourceReferences: KnowledgeGraphSourceReference[];
};

export type KnowledgeGraphEntity = {
  id: string;
  entityType: KnowledgeGraphEntityType;
  canonicalName: string;
  normalizedName: string;
  aliases: string[];
  description?: string;
  sourceDocumentIds: string[];
  sourceChunkIds: string[];
  confidence: number;
  status: KnowledgeGraphEntityStatus;
};

export type KnowledgeGraphFact = KnowledgeGraphSourceReference & {
  id: string;
  entityId: string;
  predicate: string;
  valueType: KnowledgeGraphValueType;
  value: string | number | boolean | string[] | Date;
  normalizedValue: string;
  relatedEntityId?: string;
  confidence: number;
  validFrom?: Date;
  validUntil?: Date;
  isConflicting: boolean;
};

export type KnowledgeGraphRelationship = KnowledgeGraphSourceReference & {
  id: string;
  sourceEntityId: string;
  relationshipType: string;
  targetEntityId: string;
  confidence: number;
  isConflicting: boolean;
};
