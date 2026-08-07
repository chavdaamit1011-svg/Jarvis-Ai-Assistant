import type { KnowledgeEntityInput, KnowledgeFactInput, KnowledgeRelationshipInput, KnowledgeSectionInput } from './types';

/** Persistence boundary for future ingestion; no extraction happens here. */
export interface KnowledgeSectionRepository {
  upsert(section: KnowledgeSectionInput): Promise<{ id: string }>;
  listByDocument(documentId: string): Promise<Array<KnowledgeSectionInput & { id: string }>>;
}

export interface KnowledgeEntityRepository {
  upsert(entity: KnowledgeEntityInput): Promise<{ id: string }>;
}

export interface KnowledgeFactRepository {
  upsert(fact: KnowledgeFactInput): Promise<{ id: string; created: boolean }>;
}

export interface KnowledgeRelationshipRepository {
  upsert(relationship: KnowledgeRelationshipInput): Promise<{ id: string; created: boolean }>;
}
