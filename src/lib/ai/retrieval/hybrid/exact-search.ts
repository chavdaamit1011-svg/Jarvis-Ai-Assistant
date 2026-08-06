import mongoose from 'mongoose';
import KnowledgeDocument from '@/models/KnowledgeDocument';
import KnowledgeFact from '@/models/KnowledgeFact';
import { connectToDatabase } from '@/lib/db/connect';
import { requestedFieldMatches } from './search-helpers';
import type { HybridCandidate, HybridRetrievalInput } from './hybrid-types';

function escapeRegex(value: string) { return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

/** Direct structured-fact lookup for URLs, emails, IDs and other exact terms. */
export async function exactSearch(input: HybridRetrievalInput): Promise<HybridCandidate[]> {
  const terms = [...new Set(input.exactTerms.map((term) => term.trim().toLowerCase()).filter((term) => term.length > 1))];
  const entityScopedFieldLookup = Boolean(input.entityId && input.requestedFields?.length);
  if (!terms.length && !entityScopedFieldLookup) return [];
  await connectToDatabase();
  const visibility = input.visibility ?? 'public';
  const documents = await KnowledgeDocument.find({ status: 'ready', visibility, ...(input.documentType ? { sourceType: input.documentType } : {}) }).select('_id title').lean();
  if (!documents.length) return [];
  const facts = await KnowledgeFact.find({
    documentId: { $in: documents.map((document) => document._id) },
    ...(input.entityId && mongoose.isObjectIdOrHexString(input.entityId) ? { entityId: input.entityId } : {}),
    ...(terms.length && !entityScopedFieldLookup
      ? { $or: terms.map((term) => ({ normalizedValue: { $regex: escapeRegex(term), $options: 'i' } })) }
      : {}),
  }).lean();
  const titleById = new Map(documents.map((document) => [String(document._id), document.title]));
  return facts
    .map((fact) => {
      const normalized = fact.normalizedValue.toLowerCase();
      const matchedTerms = terms.filter((term) => normalized.includes(term));
      return {
        kind: 'fact' as const,
        documentId: String(fact.documentId),
        chunkId: String(fact.chunkId),
        entityId: String(fact.entityId),
        factId: String(fact._id),
        documentTitle: titleById.get(String(fact.documentId)),
        content: fact.sourceText,
        predicate: fact.predicate || fact.field,
        value: fact.value,
        exactScore: entityScopedFieldLookup ? 1 : matchedTerms.length / terms.length,
        queryMatchCount: entityScopedFieldLookup ? Math.max(1, matchedTerms.length) : matchedTerms.length,
        matchedQueries: entityScopedFieldLookup ? [...new Set([...(input.requestedFields ?? []), ...matchedTerms])] : matchedTerms,
      };
    })
    .filter((candidate) => requestedFieldMatches(candidate, input.requestedFields));
}
