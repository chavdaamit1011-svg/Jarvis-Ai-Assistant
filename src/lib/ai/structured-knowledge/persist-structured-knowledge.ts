import 'server-only';

import mongoose, { type ClientSession } from 'mongoose';
import { connectToDatabase } from '@/lib/db/connect';
import KnowledgeChunk from '@/models/KnowledgeChunk';
import KnowledgeDocument from '@/models/KnowledgeDocument';
import KnowledgeEntity from '@/models/KnowledgeEntity';
import KnowledgeFact from '@/models/KnowledgeFact';
import KnowledgeRelationship from '@/models/KnowledgeRelationship';
import KnowledgeSection from '@/models/KnowledgeSection';
import { extractStructuredKnowledge, STRUCTURED_KNOWLEDGE_EXTRACTION_VERSION, type StructuredKnowledgeExtraction } from './structured-knowledge-extractor';

export type StructuredKnowledgeCounts = { sectionCount: number; entityCount: number; factCount: number; relationshipCount: number; extractionVersion: string; processedAt: Date };
export type StructuredKnowledgeAudit = StructuredKnowledgeCounts & {
  documentId: string;
  title: string;
  failedExtractions: number;
  duplicatesRemoved: number;
  unmappedFacts: number;
  unmappedRelationships: number;
  averageConfidence: number;
  samples: {
    entities: Array<{ id: string; canonicalName: string; entityType: string; confidence: number }>;
    facts: Array<{ entityName: string; field: string; value: unknown; valueType: string; sourceSectionId: string; confidence: number }>;
    relationships: Array<{ relation: string; subjectEntityId: string; objectEntityId: string; sourceSectionId: string; confidence: number }>;
  };
};

function dbOptions(session?: ClientSession) { return session ? { session } : {}; }

type StructuredSnapshot = {
  sections: Record<string, unknown>[];
  facts: Record<string, unknown>[];
  relationships: Record<string, unknown>[];
  documentMetadata: Record<string, unknown>;
};

async function snapshotStructuredKnowledge(documentId: string): Promise<StructuredSnapshot> {
  const sections = await KnowledgeSection.find({ documentId }).lean();
  const sectionIds = sections.map((section) => section._id);
  const [facts, relationships, document] = await Promise.all([
    KnowledgeFact.find({ sourceDocumentId: documentId, sourceSectionId: { $in: sectionIds } }).lean(),
    KnowledgeRelationship.find({ sourceDocumentId: documentId, sourceSectionId: { $in: sectionIds } }).lean(),
    KnowledgeDocument.findById(documentId).select('structuredKnowledge extractionVersion processingStatus processedAt extractionErrors').lean(),
  ]);
  return { sections: sections as unknown as Record<string, unknown>[], facts: facts as unknown as Record<string, unknown>[], relationships: relationships as unknown as Record<string, unknown>[], documentMetadata: (document ?? {}) as Record<string, unknown> };
}

async function restoreStructuredKnowledge(documentId: string, snapshot: StructuredSnapshot) {
  const currentSections = await KnowledgeSection.find({ documentId }).select('_id').lean();
  const currentSectionIds = currentSections.map((section) => section._id);
  await KnowledgeFact.deleteMany({ sourceDocumentId: documentId, sourceSectionId: { $in: currentSectionIds } });
  await KnowledgeRelationship.deleteMany({ sourceDocumentId: documentId, sourceSectionId: { $in: currentSectionIds } });
  await KnowledgeSection.deleteMany({ documentId });
  if (snapshot.sections.length) await KnowledgeSection.insertMany(snapshot.sections);
  if (snapshot.facts.length) await KnowledgeFact.insertMany(snapshot.facts);
  if (snapshot.relationships.length) await KnowledgeRelationship.insertMany(snapshot.relationships);
  const metadata = { ...snapshot.documentMetadata };
  delete metadata._id;
  await KnowledgeDocument.updateOne({ _id: documentId }, { $set: metadata });
}

async function persist(documentId: string, extraction: StructuredKnowledgeExtraction, session?: ClientSession): Promise<StructuredKnowledgeCounts> {
  const options = dbOptions(session);
  const document = await KnowledgeDocument.findById(documentId).select('_id').session(session ?? null);
  if (!document) throw new Error('Knowledge document not found.');
  const chunks = await KnowledgeChunk.find({ documentId: document._id }).select('_id').sort({ chunkIndex: 1 }).lean();
  if (!chunks.length) throw new Error('Knowledge document has no source chunks.');
  const legacyChunkId = chunks[0]._id;

  // The extractor completes before this point. Within this replacement phase,
  // transaction rollback (or snapshot rollback below) protects valid records.
  const oldSections = await KnowledgeSection.find({ documentId: document._id }).lean();
  const oldSectionIds = oldSections.map((section) => section._id);
  // This extraction is derived data. Remove only this document's old source
  // association before inserting replacement records; entities shared by other
  // documents retain their other document references.
  await KnowledgeEntity.updateMany(
    { sourceDocumentIds: document._id },
    { $pull: { sourceDocumentIds: document._id, sourceSectionIds: { $in: oldSectionIds } } },
    options,
  );
  await KnowledgeEntity.deleteMany({ sourceDocumentIds: { $size: 0 } }, options);
  await KnowledgeFact.deleteMany({ sourceDocumentId: document._id, sourceSectionId: { $in: oldSectionIds } }, options);
  await KnowledgeRelationship.deleteMany({ sourceDocumentId: document._id, sourceSectionId: { $in: oldSectionIds } }, options);
  await KnowledgeSection.deleteMany({ documentId: document._id }, options);

  const createdSections = await KnowledgeSection.insertMany(extraction.sections.map((section) => ({ documentId: document._id, ...section })), options);
  const sectionIdByOrder = new Map(createdSections.map((section) => [section.order, section._id]));
  const entityIdByTemporaryId = new Map<string, mongoose.Types.ObjectId>();
  const canonicalNameByTemporaryId = new Map<string, string>();
  for (const entity of extraction.entities) {
    const sectionId = sectionIdByOrder.get(entity.sectionOrder);
    const record = await KnowledgeEntity.findOneAndUpdate(
      { entityType: entity.entityType, normalizedName: entity.normalizedName },
      { $setOnInsert: { canonicalName: entity.canonicalName, documentId: document._id, confidence: entity.confidence, factSummary: '' }, $addToSet: { aliases: { $each: entity.aliases }, sourceDocumentIds: document._id, sourceSectionIds: sectionId } },
      { upsert: true, new: true, setDefaultsOnInsert: true, ...options },
    );
    entityIdByTemporaryId.set(entity.temporaryId, record._id);
    canonicalNameByTemporaryId.set(entity.temporaryId, record.canonicalName);
  }

  const factOperations = extraction.facts.flatMap((fact) => {
    const entityId = entityIdByTemporaryId.get(fact.subjectTemporaryId);
    const sourceSectionId = sectionIdByOrder.get(fact.sectionOrder);
    if (!entityId || !sourceSectionId) return [];
    const entity = extraction.entities.find((item) => item.temporaryId === fact.subjectTemporaryId);
    return [{ updateOne: {
      filter: { entityId, field: fact.field, normalizedValue: fact.normalizedValue, sourceDocumentId: document._id, sourceSectionId },
      update: { $set: { entityName: canonicalNameByTemporaryId.get(fact.subjectTemporaryId) ?? entity?.canonicalName, entityType: entity?.entityType, predicate: fact.field, valueType: fact.valueType, value: fact.value, status: 'active' as const, qualifiers: fact.qualifiers, sourceText: fact.sourceText, confidence: fact.confidence, documentId: document._id, chunkId: legacyChunkId, sourceChunkId: legacyChunkId }, $setOnInsert: { entityId, normalizedValue: fact.normalizedValue, sourceDocumentId: document._id, sourceSectionId } },
      upsert: true,
    } }];
  });
  if (factOperations.length) await KnowledgeFact.bulkWrite(factOperations, options);

  const relationshipOperations = extraction.relationships.flatMap((relationship) => {
    const subjectEntityId = entityIdByTemporaryId.get(relationship.subjectTemporaryId);
    const objectEntityId = entityIdByTemporaryId.get(relationship.objectTemporaryId);
    const sourceSectionId = sectionIdByOrder.get(relationship.sectionOrder);
    if (!subjectEntityId || !objectEntityId || !sourceSectionId) return [];
    return [{ updateOne: {
      filter: { subjectEntityId, relation: relationship.relation, objectEntityId, sourceDocumentId: document._id, sourceSectionId },
      update: { $set: { sourceEntityId: subjectEntityId, relationshipType: relationship.relation, targetEntityId: objectEntityId, qualifiers: relationship.qualifiers, sourceText: relationship.sourceText, confidence: relationship.confidence, documentId: document._id, chunkId: legacyChunkId }, $setOnInsert: { subjectEntityId, relation: relationship.relation, objectEntityId, sourceDocumentId: document._id, sourceSectionId, isConflicting: false } },
      upsert: true,
    } }];
  });
  if (relationshipOperations.length) await KnowledgeRelationship.bulkWrite(relationshipOperations, options);

  const processedAt = new Date();
  const counts: StructuredKnowledgeCounts = { sectionCount: createdSections.length, entityCount: entityIdByTemporaryId.size, factCount: factOperations.length, relationshipCount: relationshipOperations.length, extractionVersion: STRUCTURED_KNOWLEDGE_EXTRACTION_VERSION, processedAt };
  await KnowledgeDocument.updateOne({ _id: document._id }, { $set: { structuredKnowledge: counts, extractionVersion: STRUCTURED_KNOWLEDGE_EXTRACTION_VERSION, processingStatus: 'completed', processedAt, extractionErrors: [] } }, options);
  return counts;
}

export async function reprocessDocument(documentId: string) {
  await connectToDatabase();
  const document = await KnowledgeDocument.findById(documentId).select('_id title originalContent').lean();
  if (!document) throw new Error('Knowledge document not found.');
  const extraction = extractStructuredKnowledge(document.originalContent);
  if (!extraction.sections.length) throw new Error('No supported document sections were extracted.');

  const session = await mongoose.startSession();
  try {
    let counts: StructuredKnowledgeCounts | undefined;
    await session.withTransaction(async () => { counts = await persist(String(document._id), extraction, session); });
    if (!counts) throw new Error('Structured knowledge persistence did not complete.');
    return { documentId: String(document._id), title: document.title, counts, debug: extraction.debug };
  } catch (error) {
    // Transactions need a replica set. On local standalone MongoDB, extraction
    // has already completed; use the same guarded replacement process and
    // report a safe error if persistence fails.
    if (!/Transaction numbers are only allowed|replica set/i.test(error instanceof Error ? error.message : '')) throw error;
    const snapshot = await snapshotStructuredKnowledge(String(document._id));
    try {
      const counts = await persist(String(document._id), extraction);
      return { documentId: String(document._id), title: document.title, counts, debug: extraction.debug };
    } catch (fallbackError) {
      await restoreStructuredKnowledge(String(document._id), snapshot).catch(() => undefined);
      throw fallbackError;
    }
  } finally {
    await session.endSession();
  }
}

/** Explicitly named admin action for existing documents. */
export const reprocessExistingDocument = reprocessDocument;

export async function auditStructuredKnowledgeDocument(documentId: string): Promise<StructuredKnowledgeAudit> {
  await connectToDatabase();
  const document = await KnowledgeDocument.findById(documentId).select('title structuredKnowledge extractionErrors').lean();
  if (!document) throw new Error('Knowledge document not found.');
  const sections = await KnowledgeSection.find({ documentId }).select('_id').lean();
  const sectionIds = sections.map((section) => section._id);
  const [facts, relationships] = await Promise.all([
    KnowledgeFact.find({ sourceDocumentId: documentId, sourceSectionId: { $in: sectionIds } }).select('entityId entityName field value valueType normalizedValue sourceSectionId confidence').lean(),
    KnowledgeRelationship.find({ sourceDocumentId: documentId, sourceSectionId: { $in: sectionIds } }).select('subjectEntityId relation objectEntityId sourceSectionId confidence').lean(),
  ]);
  const factKeys = new Set<string>();
  const relationshipKeys = new Set<string>();
  let duplicateRows = 0;
  for (const fact of facts) {
    const key = `${fact.entityId}:${fact.field}:${fact.normalizedValue}:${fact.sourceSectionId}`;
    if (factKeys.has(key)) duplicateRows += 1;
    factKeys.add(key);
  }
  for (const relationship of relationships) {
    const key = `${relationship.subjectEntityId}:${relationship.relation}:${relationship.objectEntityId}:${relationship.sourceSectionId}`;
    if (relationshipKeys.has(key)) duplicateRows += 1;
    relationshipKeys.add(key);
  }
  const confidences = [...facts, ...relationships].map((record) => record.confidence).filter((value): value is number => typeof value === 'number');
  const entityIds = new Set(facts.map((fact) => String(fact.entityId)).filter(Boolean));
  for (const relationship of relationships) {
    if (relationship.subjectEntityId) entityIds.add(String(relationship.subjectEntityId));
    if (relationship.objectEntityId) entityIds.add(String(relationship.objectEntityId));
  }
  const stored = document.structuredKnowledge as Partial<StructuredKnowledgeCounts> | undefined;
  const entityRecords = await KnowledgeEntity.find({ sourceDocumentIds: documentId }).select('canonicalName entityType confidence').limit(3).lean();
  return {
    documentId,
    title: document.title,
    sectionCount: sections.length,
    entityCount: entityIds.size,
    factCount: facts.length,
    relationshipCount: relationships.length,
    extractionVersion: stored?.extractionVersion ?? '',
    processedAt: stored?.processedAt ?? new Date(0),
    failedExtractions: Array.isArray(document.extractionErrors) ? document.extractionErrors.length : 0,
    duplicatesRemoved: duplicateRows,
    unmappedFacts: facts.filter((fact) => !fact.sourceSectionId).length,
    unmappedRelationships: relationships.filter((relationship) => !relationship.sourceSectionId).length,
    averageConfidence: confidences.length ? Number((confidences.reduce((sum, value) => sum + value, 0) / confidences.length).toFixed(3)) : 0,
    samples: {
      entities: entityRecords.map((entity) => ({ id: String(entity._id), canonicalName: entity.canonicalName, entityType: entity.entityType, confidence: entity.confidence })),
      facts: facts.slice(0, 3).map((fact) => ({ entityName: fact.entityName ?? '', field: fact.field, value: fact.value, valueType: fact.valueType, sourceSectionId: String(fact.sourceSectionId), confidence: fact.confidence })),
      relationships: relationships.slice(0, 3).map((relationship) => ({ relation: relationship.relation ?? '', subjectEntityId: String(relationship.subjectEntityId), objectEntityId: String(relationship.objectEntityId), sourceSectionId: String(relationship.sourceSectionId), confidence: relationship.confidence })),
    },
  };
}
