import { normalizeEntityName } from '@/lib/ai/knowledge-graph/normalize-entity';
import type { EntityMention } from './normalizer-types';

const REQUEST_WORDS = new Set(['tell', 'about', 'what', 'who', 'does', 'do', 'explain', 'show', 'give', 'please', 'the', 'a', 'an', 'education', 'projects', 'project', 'skills', 'skill', 'technology', 'technologies', 'experience', 'current', 'latest', 'calculate', 'gst', 'discount']);

export function normalizeEntityMentions(rawQuery: string, cleanedQuery: string): EntityMention[] {
  const candidates = new Set<string>();
  for (const match of rawQuery.matchAll(/\b(?:about|for|of|does|did|who is)\s+([\p{L}][\p{L}'-]{1,80})/giu)) candidates.add(match[1]);
  for (const match of rawQuery.matchAll(/\b([A-Z][\p{L}'-]{1,80})(?:'s|\s+(?:education|projects?|skills?|role|experience))\b/gu)) candidates.add(match[1]);
  const tokens = cleanedQuery.split(/\s+/).filter((token) => token.length > 1 && !REQUEST_WORDS.has(token.toLowerCase()));
  if (tokens.length === 1 && /\p{L}/u.test(tokens[0])) candidates.add(tokens[0]);
  return [...candidates].map((original) => ({ original, normalized: normalizeEntityName(original) })).filter((item) => item.normalized.length > 1);
}
