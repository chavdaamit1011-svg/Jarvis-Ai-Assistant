import 'server-only';

import { connectToDatabase } from '@/lib/db/connect';
import KnowledgeEntity from '@/models/KnowledgeEntity';
import KnowledgeFact from '@/models/KnowledgeFact';
import type { EntityProfile } from './types';
import { normalizeFactValue } from './fact-extraction';

const MULTI_VALUE_FIELDS = new Set(['technologies', 'skills', 'projects', 'worksOn', 'experience', 'education']);
const normalizeName = (value: string) => normalizeFactValue(value).split(' ').sort().join(' ');

export async function getEntityProfile(entityName: string): Promise<EntityProfile | null> {
  await connectToDatabase();
  const queryTerms = normalizeFactValue(entityName).split(' ').filter(Boolean);
  const entities = await KnowledgeEntity.find({ entityType: 'person' }).lean();
  const matches = entities.filter((entity) => {
    const aliases = [entity.canonicalName, ...(entity.aliases ?? [])].map(normalizeFactValue);
    return aliases.some((alias) => queryTerms.every((term) => alias.split(' ').includes(term)) || normalizeName(alias) === normalizeName(entityName));
  });
  if (matches.length !== 1) return null;
  const entity = matches[0];
  const facts = await KnowledgeFact.find({ entityId: entity._id }).lean();
  const grouped = new Map<string, Map<string, { value: string; confidence: number }>>();
  for (const fact of facts) {
    const values = grouped.get(fact.field) ?? new Map();
    const existing = values.get(fact.normalizedValue);
    if (!existing || fact.confidence > existing.confidence) values.set(fact.normalizedValue, { value: fact.value, confidence: fact.confidence });
    grouped.set(fact.field, values);
  }
  const combinedFacts: Record<string, string[]> = {};
  const conflicts: EntityProfile['conflicts'] = [];
  for (const [field, values] of grouped) {
    const list = [...values.values()];
    combinedFacts[field] = list.map((item) => item.value);
    if (!MULTI_VALUE_FIELDS.has(field) && list.length > 1) conflicts.push({ field, values: combinedFacts[field] });
  }
  return {
    id: String(entity._id), entityType: entity.entityType, canonicalName: entity.canonicalName,
    aliases: entity.aliases ?? [], facts: combinedFacts,
    sources: facts.map((fact) => ({ documentId: String(fact.documentId), chunkId: String(fact.chunkId), field: fact.field, value: fact.value })),
    conflicts, confidence: facts.length ? Math.min(1, facts.reduce((sum, fact) => sum + fact.confidence, 0) / facts.length) : 0,
  };
}

export function buildEntityProfileContext(profile: EntityProfile) {
  return ['ENTITY PROFILE', `Name: ${profile.canonicalName}`, ...Object.entries(profile.facts).map(([field, values]) => `${field}: ${values.join(', ')}`), 'Sources:', ...[...new Set(profile.sources.map((source) => source.documentId))].map((source) => `- ${source}`)].join('\n');
}
