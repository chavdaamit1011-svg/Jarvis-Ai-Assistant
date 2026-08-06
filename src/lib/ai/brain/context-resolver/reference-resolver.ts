import { normalizeEntityName } from '@/lib/ai/knowledge-graph/normalize-entity';
import type { ActiveEntity, ResolvedReference } from './context-types';

// Lexical references are language-independent resolver inputs, not entity- or
// question-specific rules. The resolver never assigns a reference without one
// unique active entity.
const REFERENCE_TOKENS = /\b(?:he|she|they|it|his|her|their|him|them|vo|woh|uska|uski|uske|unka|unki|unke|iska|iski|iske)\b/giu;

export function activeContextEntities(input: { activeEntities: ActiveEntity[]; previousEntities?: ActiveEntity[] }) {
  const all = [...input.activeEntities, ...(input.previousEntities ?? [])]; const seen = new Set<string>();
  return all.filter((entity) => { const key = `${entity.type}:${normalizeEntityName(entity.name)}`; if (!entity.name || seen.has(key)) return false; seen.add(key); return true; });
}

export function resolveReferences(query: string, candidates: ActiveEntity[]) {
  const references = [...query.matchAll(REFERENCE_TOKENS)].map((match) => match[0]);
  const resolved: ResolvedReference[] = references.map((original) => ({ original, entity: candidates.length === 1 ? candidates[0] : null, confidence: candidates.length === 1 ? 0.94 : 0 }));
  return { references, resolved, ambiguous: references.length > 0 && candidates.length > 1, unresolved: references.length > 0 && candidates.length === 0 };
}
