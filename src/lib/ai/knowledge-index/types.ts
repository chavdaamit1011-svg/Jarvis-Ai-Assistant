export type IndexedEntityType = 'person' | 'organization' | 'project' | 'product';

export type EntityProfile = {
  id: string;
  entityType: IndexedEntityType;
  canonicalName: string;
  aliases: string[];
  facts: Record<string, string[]>;
  sources: Array<{ documentId: string; chunkId: string; field: string; value: string }>;
  conflicts: Array<{ field: string; values: string[] }>;
  confidence: number;
};
