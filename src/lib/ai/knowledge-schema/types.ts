export type CanonicalEntityType = 'person' | 'organization' | 'project' | 'product' | 'technology' | 'location' | 'other';
export type CanonicalFactValueType = 'string' | 'number' | 'boolean' | 'date' | 'url' | 'entity_reference' | 'string_array';
export type CanonicalRecordStatus = 'active' | 'rejected' | 'conflicted' | 'archived';

export type KnowledgeSectionInput = {
  documentId: string;
  heading: string;
  text: string;
  pageNumber?: number;
  sectionPath: string[];
  order: number;
};

export type KnowledgeEntityInput = {
  documentId?: string;
  canonicalName: string;
  normalizedName: string;
  entityType: CanonicalEntityType;
  aliases: string[];
  sourceSectionIds: string[];
  confidence: number;
};

export type KnowledgeFactInput = {
  entityId: string;
  entityName?: string;
  entityType?: CanonicalEntityType;
  field: string;
  value: string | number | boolean | string[];
  normalizedValue: string;
  valueType: CanonicalFactValueType;
  status: CanonicalRecordStatus;
  period?: Record<string, unknown>;
  qualifiers: Record<string, unknown>;
  sourceDocumentId: string;
  sourceSectionId: string;
  sourceText: string;
  confidence: number;
};

export type KnowledgeRelationshipInput = {
  subjectEntityId: string;
  relation: string;
  objectEntityId: string;
  qualifiers: Record<string, unknown>;
  sourceDocumentId: string;
  sourceSectionId: string;
  confidence: number;
};

export type KnowledgeDocumentProcessingMetadata = {
  schemaVersion: string;
  extractionVersion: string;
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
  processedAt?: Date;
  extractionErrors: string[];
};
