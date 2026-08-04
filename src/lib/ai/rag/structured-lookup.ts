import 'server-only';
import KnowledgeChunk from '@/models/KnowledgeChunk';
import KnowledgeDocument from '@/models/KnowledgeDocument';
import { connectToDatabase } from '@/lib/db/connect';
import type { QueryUnderstanding } from '@/lib/ai/query-understanding';
import { extractEntities } from './entity-extraction';

type StoredEntities = {
  personNames?: string[];
  linkedinUrls?: string[];
  githubUrls?: string[];
  portfolioUrls?: string[];
  urls?: string[];
  emails?: string[];
  phoneNumbers?: string[];
  roles?: string[];
  links?: Array<{ platform: string; url: string }>;
};

const EXACT_FIELDS = new Set<QueryUnderstanding['requestedField']>([
  'linkedin_url', 'github_url', 'portfolio_url', 'website_url', 'email', 'phone', 'owner', 'role',
]);
const normalize = (value: string) => value.toLowerCase().replace(/[^\p{L}\p{N}]/gu, ' ').replace(/\s+/g, ' ').trim();

function valuesForField(entities: StoredEntities, field: QueryUnderstanding['requestedField']) {
  if (field === 'linkedin_url') return entities.linkedinUrls ?? [];
  if (field === 'github_url') return entities.githubUrls ?? [];
  if (field === 'portfolio_url') return entities.portfolioUrls ?? [];
  if (field === 'website_url') {
    const social = new Set([...(entities.linkedinUrls ?? []), ...(entities.githubUrls ?? [])]);
    return (entities.urls ?? []).filter((url) => !social.has(url));
  }
  if (field === 'email') return entities.emails ?? [];
  if (field === 'phone') return entities.phoneNumbers ?? [];
  if (field === 'owner' || field === 'role') return entities.roles ?? [];
  return [];
}

function matchesEntity(entities: StoredEntities, content: string, personName: string) {
  const requestedTerms = normalize(personName).split(' ').filter(Boolean);
  if (!requestedTerms.length) return true;
  const names = entities.personNames ?? [];
  const hasEntityName = names.some((name) => requestedTerms.every((term) => normalize(name).split(' ').includes(term)));
  const normalizedContent = normalize(content);
  return hasEntityName || requestedTerms.every((term) => normalizedContent.includes(term));
}

/** Searches only ready, public stored metadata. It never creates a value. */
export async function lookupStructuredValue(understanding: QueryUnderstanding) {
  if (understanding.intent !== 'exact_value_lookup' || !EXACT_FIELDS.has(understanding.requestedField)) return null;

  await connectToDatabase();
  const documents = await KnowledgeDocument.find({ status: 'ready', visibility: 'public' })
    .select('title entities originalContent')
    .lean();
  const chunks = await KnowledgeChunk.find({
    documentId: { $in: documents.map((document) => document._id) },
    'metadata.visibility': 'public',
  }).select('documentId chunkIndex content').lean();

  const chunksByDocument = new Map<string, typeof chunks>();
  for (const chunk of chunks) {
    const id = String(chunk.documentId);
    chunksByDocument.set(id, [...(chunksByDocument.get(id) ?? []), chunk]);
  }

  const candidates = documents.flatMap((document) => {
    const storedEntities = (document.entities ?? {}) as StoredEntities;
    // Documents uploaded before entity metadata was added remain searchable.
    const entities = Object.keys(storedEntities).length
      ? storedEntities
      : extractEntities(document.originalContent ?? '');
    const documentChunks = chunksByDocument.get(String(document._id)) ?? [];
    const combinedContent = documentChunks.map((chunk) => chunk.content).join('\n');
    if (understanding.entityName && !matchesEntity(entities, combinedContent, understanding.entityName)) return [];
    return valuesForField(entities, understanding.requestedField).map((value) => ({ document, entities, documentChunks, value }));
  });

  if (understanding.entityName && !candidates.length) {
    return { missing: true as const, personName: understanding.entityName, field: understanding.requestedField };
  }
  if (!understanding.entityName && candidates.length > 1) {
    const people = [...new Set(candidates.flatMap((candidate) => candidate.entities.personNames ?? []).filter(Boolean))];
    return { ambiguous: true as const, people };
  }
  const selected = candidates[0];
  if (!selected) return { missing: true as const, personName: understanding.entityName, field: understanding.requestedField };
  const sourceChunk = selected.documentChunks.find((chunk) => chunk.content.includes(selected.value));

  return {
    value: selected.value,
    field: understanding.requestedField,
    personName: understanding.entityName ?? selected.entities.personNames?.[0] ?? null,
    source: {
      documentId: String(selected.document._id),
      documentTitle: selected.document.title,
      chunkId: sourceChunk ? String(sourceChunk._id) : null,
      chunkIndex: sourceChunk?.chunkIndex ?? 0,
    },
  };
}

/** Exact entity URL lookup for all supported social platforms. Never uses embeddings. */
export async function lookupEntityPlatformLink(input: { entityName: string; platform: string }) {
  await connectToDatabase();
  const documents = await KnowledgeDocument.find({ status: 'ready', visibility: 'public' })
    .select('title entities originalContent')
    .lean();
  const chunks = await KnowledgeChunk.find({
    documentId: { $in: documents.map((document) => document._id) },
    'metadata.visibility': 'public',
  }).select('documentId chunkIndex content').lean();
  const chunksByDocument = new Map<string, typeof chunks>();
  for (const chunk of chunks) {
    const id = String(chunk.documentId);
    chunksByDocument.set(id, [...(chunksByDocument.get(id) ?? []), chunk]);
  }

  const requestedPlatform = input.platform === 'x' ? 'twitter' : input.platform;
  const candidates = documents.flatMap((document) => {
    const storedEntities = (document.entities ?? {}) as StoredEntities;
    const entities = Object.keys(storedEntities).length ? storedEntities : extractEntities(document.originalContent ?? '');
    const documentChunks = chunksByDocument.get(String(document._id)) ?? [];
    const combinedContent = documentChunks.map((chunk) => chunk.content).join('\n');
    if (!matchesEntity(entities, combinedContent, input.entityName)) return [];
    const links = entities.links ?? extractEntities(document.originalContent ?? '').links;
    return links
      .filter((link) => link.platform === requestedPlatform)
      .map((link) => ({ document, entities, documentChunks, value: link.url }));
  });
  const uniqueCandidates = [...new Map(candidates.map((candidate) => [candidate.value.toLowerCase(), candidate])).values()];
  if (!uniqueCandidates.length) return { missing: true as const, entityName: input.entityName, platform: input.platform };
  if (uniqueCandidates.length > 1) return { ambiguous: true as const, entityName: input.entityName, platform: input.platform };
  const selected = uniqueCandidates[0];
  const sourceChunk = selected.documentChunks.find((chunk) => chunk.content.includes(selected.value));
  return {
    value: selected.value,
    entityName: selected.entities.personNames?.[0] ?? input.entityName,
    platform: input.platform,
    source: {
      documentId: String(selected.document._id),
      documentTitle: selected.document.title,
      chunkId: sourceChunk ? String(sourceChunk._id) : null,
      chunkIndex: sourceChunk?.chunkIndex ?? 0,
    },
  };
}
