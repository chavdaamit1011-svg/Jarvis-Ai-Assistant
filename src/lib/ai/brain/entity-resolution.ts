import 'server-only';

import { connectToDatabase } from '@/lib/db/connect';
import { normalizeEntityName } from '@/lib/ai/knowledge-graph/normalize-entity';
import KnowledgeEntity from '@/models/KnowledgeEntity';

export type PreRoutingEntityResolution = {
  entity: string | null;
  entityId: string | null;
  confidence: number;
  route: 'knowledge' | 'general_ai' | 'clarification';
  reason: string;
  matches: Array<{ id: string; name: string; type: string }>;
};

export type EntityCandidate = {
  _id: unknown;
  canonicalName: string;
  normalizedName?: string;
  aliases?: string[];
  entityType: string;
};

export type ScoredEntityCandidate = {
  entity: EntityCandidate;
  score: number;
  matchType: 'full_name' | 'alias' | 'unique_name' | 'fuzzy' | 'none';
};

// Query-language words, requested fields, and grammar must never be treated as
// entity candidates. Entity matching itself is language independent.
const QUERY_WORDS = new Set([
  'a', 'about', 'an', 'and', 'are', 'batao', 'che', 'does', 'do', 'education',
  'for', 'hain', 'hai', 'he', 'her', 'his', 'i', 'in', 'is', 'ka', 'ke', 'ki',
  'kis', 'kya', 'kon', 'kaun', 'me', 'my', 'of', 'on', 'projects', 'project',
  's', 'she', 'skills', 'skill', 'summary', 'tell', 'the', 'their', 'them',
  'they', 'to', 'what', 'who', 'work', 'works', 'you', 'your', 'technology',
  'technologies', 'role', 'profession', 'experience', 'college', 'university',
]);

const MIN_HIGH_CONFIDENCE = 0.85;

function levenshtein(left: string, right: string) {
  const rows = Array.from({ length: left.length + 1 }, (_, index) => [index]);
  for (let column = 1; column <= right.length; column += 1) rows[0][column] = column;
  for (let row = 1; row <= left.length; row += 1) {
    for (let column = 1; column <= right.length; column += 1) {
      rows[row][column] = Math.min(
        rows[row - 1][column] + 1,
        rows[row][column - 1] + 1,
        rows[row - 1][column - 1] + (left[row - 1] === right[column - 1] ? 0 : 1),
      );
    }
  }
  return rows[left.length][right.length];
}

function queryTerms(query: string) {
  return normalizeEntityName(query)
    .split(' ')
    .filter((term) => term.length > 1 && !QUERY_WORDS.has(term));
}

function variants(candidate: EntityCandidate) {
  const values = new Set([
    candidate.normalizedName ?? '',
    ...((candidate.aliases ?? []).map(normalizeEntityName)),
  ].filter(Boolean));

  for (const value of [...values]) {
    const words = value.split(' ').filter(Boolean);
    if (words.length >= 2 && words.length <= 3) values.add([...words].reverse().join(' '));
  }

  return [...values];
}

/**
 * Scores only actual entity names/aliases. It deliberately does not use a
 * language model or generic query words, so English possessives and Hindi
 * grammar produce the same entity result.
 */
export function scoreEntityCandidates(query: string, candidates: EntityCandidate[]): ScoredEntityCandidate[] {
  const terms = queryTerms(query);
  const normalizedQuery = normalizeEntityName(query);

  return candidates.map((entity) => {
    let best: ScoredEntityCandidate = { entity, score: 0, matchType: 'none' };

    for (const variant of variants(entity)) {
      const words = variant.split(' ').filter(Boolean);
      if (!words.length) continue;

      // A full canonical name or alias appears in the sentence.
      if (normalizedQuery.includes(variant)) {
        const matchType = variant === entity.normalizedName ? 'full_name' : 'alias';
        best = { entity, score: 1, matchType };
        continue;
      }

      const exactTerms = words.filter((word) => terms.includes(word));
      if (exactTerms.length === words.length) {
        best = { entity, score: 0.98, matchType: 'full_name' };
        continue;
      }

      // A first-name alias can be sufficient only after the candidate set is
      // evaluated. Two entities with the same name remain ambiguous below.
      if (words.length >= 2 && exactTerms.length === 1) {
        best = best.score >= 0.92 ? best : { entity, score: 0.92, matchType: 'unique_name' };
        continue;
      }

      const fuzzy = terms.some((term) => words.some((word) => term.length >= 4 && levenshtein(term, word) <= 1));
      if (fuzzy && best.score < 0.86) best = { entity, score: 0.86, matchType: 'fuzzy' };
    }

    return best;
  });
}

export async function resolveEntityBeforeRouting(query: string): Promise<PreRoutingEntityResolution> {
  await connectToDatabase();
  const entities = await KnowledgeEntity.find({ status: { $ne: 'archived' } })
    .select('canonicalName normalizedName aliases entityType')
    .lean() as unknown as EntityCandidate[];

  const matches = scoreEntityCandidates(query, entities)
    .filter((candidate) => candidate.score >= MIN_HIGH_CONFIDENCE)
    .sort((left, right) => right.score - left.score || left.entity.canonicalName.localeCompare(right.entity.canonicalName));

  if (matches.length === 1) {
    const match = matches[0];
    return {
      entity: match.entity.canonicalName,
      entityId: String(match.entity._id),
      confidence: match.score,
      route: 'knowledge',
      reason: `KNOWLEDGE_ENTITY_${match.matchType.toUpperCase()}_AUTO_SELECTED`,
      matches: [{ id: String(match.entity._id), name: match.entity.canonicalName, type: match.entity.entityType }],
    };
  }

  if (matches.length > 1) {
    return {
      entity: null,
      entityId: null,
      confidence: matches[0].score,
      route: 'clarification',
      reason: 'MULTIPLE_HIGH_CONFIDENCE_KNOWLEDGE_ENTITIES',
      matches: matches.map((match) => ({ id: String(match.entity._id), name: match.entity.canonicalName, type: match.entity.entityType })),
    };
  }

  return {
    entity: null,
    entityId: null,
    confidence: 0,
    route: 'general_ai',
    reason: 'NO_HIGH_CONFIDENCE_KNOWLEDGE_ENTITY',
    matches: [],
  };
}
