import 'server-only';

import { connectToDatabase } from '@/lib/db/connect';
import KnowledgeChunk from '@/models/KnowledgeChunk';
import KnowledgeDocument from '@/models/KnowledgeDocument';
import KnowledgeEntity from '@/models/KnowledgeEntity';
import KnowledgeFact from '@/models/KnowledgeFact';
import KnowledgeRelationship from '@/models/KnowledgeRelationship';
import type { QueryUnderstanding } from '@/lib/ai/query-understanding';
import { normalizeEntityName } from './normalize-entity';
import { GRAPH_FACT_PREDICATES, GRAPH_RELATIONSHIPS, QUERY_FIELD_TO_GRAPH_PREDICATE } from './ontology';
import { formatKnowledgeFacts, listForLanguage, type DetectedResponseLanguage } from '@/lib/ai/response-language';

export type GraphChatSource = { documentTitle: string; chunkIndex: number; score: number; documentId: string; chunkId: string; supportingText?: string };
export type GraphChatResult = {
  kind: 'answer' | 'ambiguous' | 'none';
  answer?: string;
  entitiesUsed: string[];
  factsUsed: string[];
  relationshipsUsed: string[];
  sources: GraphChatSource[];
  candidates?: string[];
  conflicts?: Array<{ field: string; values: string[] }>;
};

const STOP_WORDS = new Set(['who', 'what', 'is', 'are', 'the', 'a', 'an', 'ka', 'ki', 'ke', 'kis', 'kya', 'kon', 'kaun', 'he', 'hai', 'hain', 'me', 'par', 'on', 'with', 'works', 'work', 'owner', 'owners', 'of', 'ai']);

function unique(values: string[]) { return [...new Set(values.filter(Boolean))]; }
function queryTerms(query: string) { return normalizeEntityName(query).split(' ').filter((term) => term.length > 1 && !STOP_WORDS.has(term)); }
function matchesName(entity: { normalizedName: string; aliases?: string[] }, name: string | null, query: string) {
  const candidates = [entity.normalizedName, ...(entity.aliases ?? []).map(normalizeEntityName)];
  if (name) {
    const target = normalizeEntityName(name);
    const reversed = target.split(' ').reverse().join(' ');
    if (candidates.includes(target) || candidates.includes(reversed)) return true;
    const targetTerms = target.split(' ');
    return targetTerms.length > 1 && candidates.some((candidate) => targetTerms.every((term) => candidate.split(' ').includes(term)));
  }
  const terms = queryTerms(query);
  return terms.length > 0 && candidates.some((candidate) => terms.some((term) => candidate.split(' ').includes(term)));
}

function valueText(value: unknown) { return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string').join(', ') : String(value ?? ''); }

async function sourcesFor(references: Array<{ documentId: unknown; chunkId: unknown }>) {
  const documentIds = unique(references.map((reference) => String(reference.documentId)));
  const chunkIds = unique(references.map((reference) => String(reference.chunkId)));
  const [documents, chunks] = await Promise.all([
    KnowledgeDocument.find({ _id: { $in: documentIds } }).select('title').lean(),
    KnowledgeChunk.find({ _id: { $in: chunkIds } }).select('documentId chunkIndex content').lean(),
  ]);
  const titles = new Map(documents.map((document) => [String(document._id), document.title]));
  const chunkMap = new Map(chunks.map((chunk) => [String(chunk._id), chunk]));
  return unique(chunkIds).flatMap((chunkId) => {
    const chunk = chunkMap.get(chunkId);
    if (!chunk) return [];
    return [{ documentTitle: titles.get(String(chunk.documentId)) ?? 'Knowledge document', chunkIndex: chunk.chunkIndex, score: 1, documentId: String(chunk.documentId), chunkId, supportingText: chunk.content }];
  });
}

/**
 * Deterministic graph-first answer lookup. It returns only stored facts and
 * relationships; callers can safely fall through to structured/RAG/LLM paths.
 */
export async function lookupKnowledgeGraph(input: { query: string; understanding: QueryUnderstanding; responseLanguage?: DetectedResponseLanguage }): Promise<GraphChatResult> {
  const language = input.responseLanguage ?? 'hinglish';
  await connectToDatabase();
  const entities = await KnowledgeEntity.find({ status: 'active' }).select('canonicalName normalizedName aliases entityType').lean();
  const matches = entities.filter((entity) => matchesName(entity, input.understanding.entityName, input.query));
  const namedMatches = input.understanding.entityName ? matches : matches.filter((entity) => queryTerms(input.query).some((term) => entity.normalizedName.split(' ').includes(term)));
  if (namedMatches.length > 1) return { kind: 'ambiguous', entitiesUsed: [], factsUsed: [], relationshipsUsed: [], sources: [], candidates: namedMatches.map((entity) => entity.canonicalName) };

  const entity = namedMatches[0];
  const asksOwner = input.understanding.requestedField === 'owner' || /\b(?:owner|owns|own|built|banaya)\b/i.test(input.query);
  const asksTechnology = input.understanding.requestedField === 'skills' || /\b(?:tech|technology|technologies|skills?|works?\s+with)\b/i.test(input.query);
  const asksProject = input.understanding.requestedField === 'projects' || /\bprojects?\b/i.test(input.query);
  // "about" is only broad when no specific requested field was detected.
  // For example, "Tell me about X's education" must remain education-only.
  const broadIdentity = input.understanding.requestedField === 'summary'
    || (input.understanding.requestedField === 'unknown' && /\b(?:who is|about|kon he|kon hai|kaun hai|kya karta)\b/i.test(input.query));

  // A relationship question can name its target instead of its source entity.
  if (asksOwner) {
    const target = entity ?? entities.find((candidate) => matchesName(candidate, null, input.query));
    if (target) {
      const relationships = await KnowledgeRelationship.find({ targetEntityId: target._id, relationshipType: GRAPH_RELATIONSHIPS.ownerOf, isConflicting: false }).lean();
      if (relationships.length === 1) {
        const owner = entities.find((candidate) => String(candidate._id) === String(relationships[0].sourceEntityId));
        if (owner) {
          const sources = await sourcesFor(relationships);
          return { kind: 'answer', answer: formatKnowledgeFacts({ language, kind: 'owner', entity: owner.canonicalName, target: target.canonicalName }), entitiesUsed: [String(owner._id), String(target._id)], factsUsed: [], relationshipsUsed: relationships.map((item) => String(item._id)), sources };
        }
      }
    }
  }
  if (!entity) return { kind: 'none', entitiesUsed: [], factsUsed: [], relationshipsUsed: [], sources: [] };

  if (asksTechnology && entity.entityType === 'technology') {
    const relationships = await KnowledgeRelationship.find({ targetEntityId: entity._id, relationshipType: GRAPH_RELATIONSHIPS.usesTechnology, isConflicting: false }).lean();
    if (relationships.length === 1) {
      const person = entities.find((candidate) => String(candidate._id) === String(relationships[0].sourceEntityId));
      if (person) {
        const sources = await sourcesFor(relationships);
        return { kind: 'answer', answer: formatKnowledgeFacts({ language, kind: 'technology', entity: person.canonicalName, values: [entity.canonicalName] }), entitiesUsed: [String(person._id), String(entity._id)], factsUsed: [], relationshipsUsed: relationships.map((item) => String(item._id)), sources };
      }
    }
  }

  const [facts, outgoing] = await Promise.all([
    KnowledgeFact.find({ entityId: entity._id }).lean(),
    KnowledgeRelationship.find({ sourceEntityId: entity._id }).lean(),
  ]);
  const targetIds = unique(outgoing.map((relationship) => String(relationship.targetEntityId)));
  const targets = targetIds.length ? await KnowledgeEntity.find({ _id: { $in: targetIds } }).select('canonicalName').lean() : [];
  const namesById = new Map(targets.map((target) => [String(target._id), target.canonicalName]));
  const references = [...facts, ...outgoing];
  const sources = await sourcesFor(references);
  const factValues = (predicate: string) => unique(facts.filter((fact) => fact.predicate === predicate && !fact.isConflicting).map((fact) => valueText(fact.value)));
  const relationValues = (relationshipType: string) => unique(outgoing.filter((relationship) => relationship.relationshipType === relationshipType && !relationship.isConflicting).map((relationship) => namesById.get(String(relationship.targetEntityId)) ?? ''));
  const exactPredicate = QUERY_FIELD_TO_GRAPH_PREDICATE[input.understanding.requestedField];
  if (exactPredicate) {
    if (facts.some((fact) => fact.predicate === exactPredicate && fact.isConflicting)) {
      const conflictingFacts = facts.filter((fact) => fact.predicate === exactPredicate);
      return { kind: 'answer', answer: formatKnowledgeFacts({ language, kind: 'field', entity: entity.canonicalName, field: input.understanding.requestedField, values: ['conflicting information is available; please verify the source documents.'] }), entitiesUsed: [String(entity._id)], factsUsed: conflictingFacts.map((fact) => String(fact._id)), relationshipsUsed: [], sources, conflicts: [{ field: exactPredicate, values: unique(conflictingFacts.map((fact) => valueText(fact.value))) }] };
    }
    const values = factValues(exactPredicate);
    if (values.length === 1) return { kind: 'answer', answer: formatKnowledgeFacts({ language, kind: 'field', entity: entity.canonicalName, field: input.understanding.requestedField, values }), entitiesUsed: [String(entity._id)], factsUsed: facts.filter((fact) => fact.predicate === exactPredicate).map((fact) => String(fact._id)), relationshipsUsed: [], sources };
    if (values.length > 1) return { kind: 'ambiguous', entitiesUsed: [String(entity._id)], factsUsed: [], relationshipsUsed: [], sources: [], candidates: values };
  }
  if (asksOwner) {
    const owned = relationValues(GRAPH_RELATIONSHIPS.ownerOf);
    if (owned.length === 1) return { kind: 'answer', answer: formatKnowledgeFacts({ language, kind: 'owner', entity: entity.canonicalName, target: owned[0] }), entitiesUsed: [String(entity._id), ...targetIds], factsUsed: [], relationshipsUsed: outgoing.filter((item) => item.relationshipType === GRAPH_RELATIONSHIPS.ownerOf).map((item) => String(item._id)), sources };
  }
  if (asksTechnology) {
    const technologies = relationValues(GRAPH_RELATIONSHIPS.usesTechnology);
    if (technologies.length) return { kind: 'answer', answer: formatKnowledgeFacts({ language, kind: 'technology', entity: entity.canonicalName, values: technologies }), entitiesUsed: [String(entity._id), ...targetIds], factsUsed: [], relationshipsUsed: outgoing.filter((item) => item.relationshipType === GRAPH_RELATIONSHIPS.usesTechnology).map((item) => String(item._id)), sources };
  }
  if (asksProject) {
    const projects = unique([...relationValues(GRAPH_RELATIONSHIPS.built), ...relationValues(GRAPH_RELATIONSHIPS.workedOn)]);
    if (projects.length) return { kind: 'answer', answer: formatKnowledgeFacts({ language, kind: 'projects', entity: entity.canonicalName, values: projects }), entitiesUsed: [String(entity._id), ...targetIds], factsUsed: [], relationshipsUsed: outgoing.filter((item) => [GRAPH_RELATIONSHIPS.built, GRAPH_RELATIONSHIPS.workedOn].includes(item.relationshipType as typeof GRAPH_RELATIONSHIPS.built)).map((item) => String(item._id)), sources };
  }
  if (broadIdentity) {
    const profession = factValues(GRAPH_FACT_PREDICATES.profession)[0] ?? factValues(GRAPH_FACT_PREDICATES.role)[0];
    const technologies = relationValues(GRAPH_RELATIONSHIPS.usesTechnology);
    const owned = relationValues(GRAPH_RELATIONSHIPS.ownerOf);
    if (profession || technologies.length || owned.length) {
      let answer = language === 'english'
        ? profession ? `${entity.canonicalName} is a ${profession}` : `Uploaded knowledge is available about ${entity.canonicalName}`
        : language === 'gujarati_roman'
          ? profession ? `${entity.canonicalName} ek ${profession} chhe` : `${entity.canonicalName} vishe uploaded knowledge available chhe`
          : profession ? `${entity.canonicalName} ek ${profession} hain` : `${entity.canonicalName} ke baare mein uploaded knowledge available hai`;
      if (technologies.length) answer += language === 'english' ? ` who works with ${listForLanguage(technologies, language)}.` : language === 'gujarati_roman' ? ` ane ${listForLanguage(technologies, language)} sathe kaam kare chhe.` : ` jo ${listForLanguage(technologies, language)} par kaam karte hain.`; else answer += '.';
      if (owned.length) answer += language === 'english' ? ` ${entity.canonicalName} is also the owner of ${listForLanguage(owned, language)}.` : language === 'gujarati_roman' ? ` Te ${listForLanguage(owned, language)} na owner pan chhe.` : ` Ve ${listForLanguage(owned, language)} ke owner hain.`;
      const conflicts = unique([
        ...facts.filter((fact) => fact.isConflicting).map((fact) => fact.predicate),
        ...outgoing.filter((relationship) => relationship.isConflicting).map((relationship) => relationship.relationshipType),
      ]);
      if (conflicts.length) answer += language === 'english'
        ? ` Conflicting information exists for ${listForLanguage(conflicts, language)}; please check the source documents.`
        : language === 'gujarati_roman'
          ? ` ${listForLanguage(conflicts, language)} mate conflicting information chhe; source documents check karo.`
          : ` Uploaded knowledge mein ${listForLanguage(conflicts, language)} ke baare mein conflicting information hai; source documents check karein.`;
      return { kind: 'answer', answer, entitiesUsed: [String(entity._id), ...targetIds], factsUsed: facts.filter((fact) => [GRAPH_FACT_PREDICATES.profession, GRAPH_FACT_PREDICATES.role].includes(fact.predicate as typeof GRAPH_FACT_PREDICATES.profession)).map((fact) => String(fact._id)), relationshipsUsed: outgoing.map((item) => String(item._id)), sources, conflicts: facts.filter((fact) => fact.isConflicting).map((fact) => ({ field: fact.predicate, values: [valueText(fact.value)] })) };
    }
  }
  return { kind: 'none', entitiesUsed: [String(entity._id)], factsUsed: [], relationshipsUsed: [], sources: [] };
}
