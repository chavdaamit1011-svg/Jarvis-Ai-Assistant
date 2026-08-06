import 'server-only';

import { connectToDatabase } from '@/lib/db/connect';
import KnowledgeEntity from '@/models/KnowledgeEntity';
import KnowledgeFact from '@/models/KnowledgeFact';
import KnowledgeRelationship from '@/models/KnowledgeRelationship';
import { detectConflicts, type GraphConflict } from './detect-conflicts';
import { normalizeEntityName } from './normalize-entity';

export type ConsolidatedEntityProfile = {
  canonicalEntity: { id: string; entityType: string; canonicalName: string; normalizedName: string; aliases: string[]; confidence: number; status: string };
  groupedFacts: Record<string, Array<{ value: unknown; normalizedValue: string; confidence: number; sources: Array<{ documentId: string; chunkId: string; sourceText: string }> }>>;
  relationships: Array<{ relationshipType: string; targetEntityId: string; confidence: number; sources: Array<{ documentId: string; chunkId: string; sourceText: string }> }>;
  sourceReferences: Array<{ documentId: string; chunkId: string; sourceText: string }>;
  conflicts: GraphConflict[];
  confidence: number;
};

export async function getEntityProfile(name: string): Promise<ConsolidatedEntityProfile | null> {
  await connectToDatabase();
  const normalized = normalizeEntityName(name);
  const reversed = normalized.split(' ').reverse().join(' ');
  const entities = await KnowledgeEntity.find({ status: { $ne: 'archived' } }).lean();
  const matches = entities.filter((entity) => entity.normalizedName === normalized || entity.normalizedName === reversed || (entity.aliases ?? []).map(normalizeEntityName).includes(normalized));
  if (matches.length !== 1) return null;
  const entity = matches[0];
  const [facts, relationships, conflicts] = await Promise.all([
    KnowledgeFact.find({ entityId: entity._id }).lean(),
    KnowledgeRelationship.find({ sourceEntityId: entity._id }).lean(),
    detectConflicts(String(entity._id)),
  ]);
  const grouped = new Map<string, Map<string, { value: unknown; normalizedValue: string; confidence: number; sources: Array<{ documentId: string; chunkId: string; sourceText: string }> }>>();
  for (const fact of facts) {
    const values = grouped.get(fact.predicate) ?? new Map();
    const existing = values.get(fact.normalizedValue) ?? { value: fact.value, normalizedValue: fact.normalizedValue, confidence: fact.confidence, sources: [] };
    existing.confidence = Math.max(existing.confidence, fact.confidence);
    existing.sources.push({ documentId: String(fact.documentId), chunkId: String(fact.chunkId), sourceText: fact.sourceText });
    values.set(fact.normalizedValue, existing); grouped.set(fact.predicate, values);
  }
  const groupedFacts = Object.fromEntries([...grouped.entries()].map(([predicate, values]) => [predicate, [...values.values()]]));
  const relationshipGroups = new Map<string, { relationshipType: string; targetEntityId: string; confidence: number; sources: Array<{ documentId: string; chunkId: string; sourceText: string }> }>();
  for (const relationship of relationships) {
    const key = `${relationship.relationshipType}:${relationship.targetEntityId}`;
    const existing = relationshipGroups.get(key) ?? { relationshipType: relationship.relationshipType, targetEntityId: String(relationship.targetEntityId), confidence: relationship.confidence, sources: [] };
    existing.confidence = Math.max(existing.confidence, relationship.confidence);
    existing.sources.push({ documentId: String(relationship.documentId), chunkId: String(relationship.chunkId), sourceText: relationship.sourceText });
    relationshipGroups.set(key, existing);
  }
  const sourceReferences = facts.map((fact) => ({ documentId: String(fact.documentId), chunkId: String(fact.chunkId), sourceText: fact.sourceText }));
  const confidence = facts.length ? facts.reduce((total, fact) => total + fact.confidence, 0) / facts.length : entity.confidence;
  return { canonicalEntity: { id: String(entity._id), entityType: entity.entityType, canonicalName: entity.canonicalName, normalizedName: entity.normalizedName, aliases: entity.aliases ?? [], confidence: entity.confidence, status: entity.status }, groupedFacts, relationships: [...relationshipGroups.values()], sourceReferences, conflicts, confidence };
}
