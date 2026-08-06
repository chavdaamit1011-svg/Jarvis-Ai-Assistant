import type { KnowledgeGraphEntityType } from '@/lib/ai/knowledge-graph';

export type IndexedEntityType = KnowledgeGraphEntityType;

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
