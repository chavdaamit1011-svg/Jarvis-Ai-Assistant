import 'server-only';

import { connectToDatabase } from '@/lib/db/connect';
import KnowledgeDocument from '@/models/KnowledgeDocument';
import { extractEntities } from './entity-extraction';

export type KnowledgeEntityMatch = {
  type: 'person' | 'organization' | 'project';
  name: string;
  documentIds: string[];
  documentTitles: string[];
};

export type EntityResolution = {
  detectedPhrase: string | null;
  matches: KnowledgeEntityMatch[];
  resolved: KnowledgeEntityMatch | null;
  ambiguous: boolean;
};

const STOP_WORDS = new Set(['a', 'ai', 'and', 'are', 'ch', 'che', 'he', 'hai', 'hain', 'is', 'ka', 'ke', 'ki', 'kis', 'kiska', 'kya', 'kon', 'kaun', 'ko', 'konse', 'me', 'ni', 'no', 'of', 'owner', 'own', 'owns', 'project', 'projects', 'su', 'shu', 'the', 'to', 'vo', 'what', 'who', 'work', 'karta']);
const normalize = (value: string) => value.toLowerCase().replace(/[^\p{L}\p{N}]/gu, ' ').replace(/\s+/g, ' ').trim();
const titleCase = (value: string) => value.toLowerCase().replace(/\b[a-z]/g, (letter) => letter.toUpperCase());

function editDistance(left: string, right: string) {
  const matrix = Array.from({ length: left.length + 1 }, (_, index) => [index]);
  for (let column = 1; column <= right.length; column += 1) matrix[0][column] = column;
  for (let row = 1; row <= left.length; row += 1) for (let column = 1; column <= right.length; column += 1) matrix[row][column] = Math.min(matrix[row - 1][column] + 1, matrix[row][column - 1] + 1, matrix[row - 1][column - 1] + (left[row - 1] === right[column - 1] ? 0 : 1));
  return matrix[left.length][right.length];
}

function queryTokens(query: string) {
  return normalize(query).split(' ').filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

function matchesEntity(query: string, name: string) {
  const queryTerms = queryTokens(query);
  const nameTerms = normalize(name).split(' ').filter(Boolean);
  const matchingTerms = nameTerms.filter((nameTerm) => queryTerms.some((queryTerm) => queryTerm === nameTerm || (queryTerm.length >= 4 && editDistance(queryTerm, nameTerm) <= 1)));
  return matchingTerms.length > 0 && (matchingTerms.length === nameTerms.length || matchingTerms.some((term) => term === nameTerms[0]));
}

function contentNames(content: string) {
  const labelled = [...content.matchAll(/(?:^|\n)\s*(?:name|full name)\s*:\s*([A-Za-z]+(?:[ ]+[A-Za-z]+){1,2})/gi)].map((match) => match[1]);
  const uppercase = [...content.matchAll(/(?:^|\n)\s*([A-Z]{2,}(?:[ ]+[A-Z]{2,}){1,2})\s*(?:\n|$)/g)].map((match) => titleCase(match[1])).filter((name) => !/\b(?:summary|education|experience|skills|project|contact)\b/i.test(name));
  return [...new Set([...labelled, ...uppercase])];
}

/** Resolves people, organisations, and document/project titles from ready public knowledge. */
export async function resolveKnowledgeEntities(query: string): Promise<EntityResolution> {
  await connectToDatabase();
  const documents = await KnowledgeDocument.find({ status: 'ready', visibility: 'public' }).select('title originalContent entities').lean();
  const candidates = new Map<string, KnowledgeEntityMatch>();

  for (const document of documents) {
    const stored = document.entities as Partial<ReturnType<typeof extractEntities>> | undefined;
    const extracted = extractEntities(document.originalContent ?? '');
    const entities = {
      ...extracted,
      ...stored,
      personNames: [...new Set([...(extracted.personNames ?? []), ...(stored?.personNames ?? []), ...contentNames(document.originalContent ?? '')])],
      organizations: [...new Set([...(extracted.organizations ?? []), ...(stored?.organizations ?? [])])],
    };
    const values: Array<{ type: KnowledgeEntityMatch['type']; name: string }> = [
      ...(entities.personNames ?? []).map((name) => ({ type: 'person' as const, name })),
      ...(entities.organizations ?? []).map((name) => ({ type: 'organization' as const, name })),
      { type: 'project' as const, name: document.title },
    ];
    for (const value of values) {
      if (!matchesEntity(query, value.name)) continue;
      // First/last-name order must not create a false ambiguity across documents.
      const canonicalName = value.type === 'person'
        ? normalize(value.name).split(' ').sort().join(' ')
        : normalize(value.name);
      const key = `${value.type}:${canonicalName}`;
      const existing = candidates.get(key) ?? { ...value, documentIds: [], documentTitles: [] };
      if (!existing.documentIds.includes(String(document._id))) existing.documentIds.push(String(document._id));
      if (!existing.documentTitles.includes(document.title)) existing.documentTitles.push(document.title);
      candidates.set(key, existing);
    }
  }

  const matches = [...candidates.values()];
  const people = matches.filter((match) => match.type === 'person');
  const preferred = people.length ? people : matches;
  const resolved = preferred.length === 1 ? preferred[0] : null;
  return {
    detectedPhrase: queryTokens(query).join(' ') || null,
    matches: preferred,
    resolved,
    ambiguous: preferred.length > 1,
  };
}
