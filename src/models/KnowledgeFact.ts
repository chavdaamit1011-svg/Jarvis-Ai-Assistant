import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

const knowledgeFactSchema = new Schema({
  entityId: { type: Schema.Types.ObjectId, ref: 'KnowledgeEntity', required: true, index: true },
  // Denormalized identity is deliberately retained with each atomic fact. It
  // makes exact lookup/debugging possible without changing graph resolution.
  entityName: { type: String, trim: true, maxlength: 180, index: true },
  entityType: { type: String, enum: ['person', 'organization', 'project', 'product', 'technology', 'location', 'other'], index: true },
  predicate: { type: String, required: true, trim: true, maxlength: 120, default: 'legacy_fact' },
  valueType: { type: String, enum: ['string', 'number', 'boolean', 'date', 'url', 'entity_reference', 'string_array'], required: true, default: 'string' },
  // Mixed is intentional: the graph supports typed scalar and array values.
  // Existing profile facts continue to store strings here.
  value: { type: Schema.Types.Mixed, required: true },
  normalizedValue: { type: String, required: true, trim: true, maxlength: 1_500, index: true },
  relatedEntityId: { type: Schema.Types.ObjectId, ref: 'KnowledgeEntity', index: true },
  confidence: { type: Number, required: true, min: 0, max: 1 },
  documentId: { type: Schema.Types.ObjectId, ref: 'KnowledgeDocument', required: true, index: true },
  chunkId: { type: Schema.Types.ObjectId, ref: 'KnowledgeChunk', required: true, index: true },
  // Source aliases are kept alongside the legacy graph field names so new
  // ingestion consumers have an explicit, self-describing source contract.
  sourceDocumentId: { type: Schema.Types.ObjectId, ref: 'KnowledgeDocument', index: true },
  sourceChunkId: { type: Schema.Types.ObjectId, ref: 'KnowledgeChunk', index: true },
  sourceSectionId: { type: Schema.Types.ObjectId, ref: 'KnowledgeSection', index: true },
  sourceText: { type: String, required: true, maxlength: 1_500 },
  status: { type: String, enum: ['active', 'rejected', 'conflicted', 'archived'], default: 'active', index: true },
  period: { type: Schema.Types.Mixed },
  qualifiers: { type: Schema.Types.Mixed, default: {} },
  validFrom: { type: Date },
  validUntil: { type: Date },
  isConflicting: { type: Boolean, default: false, index: true },
  graphVersion: { type: String, trim: true, maxlength: 40, index: true },
  // Legacy field used by the already-existing profile index. New graph callers
  // should use predicate; retaining this avoids changing chat or ingestion.
  field: { type: String, trim: true, maxlength: 100, index: true, default: 'legacy_fact' },
}, { timestamps: true, versionKey: false });

knowledgeFactSchema.index({ entityId: 1, field: 1, normalizedValue: 1 });
knowledgeFactSchema.index({ entityId: 1, predicate: 1 });
knowledgeFactSchema.index({ entityName: 1, field: 1, normalizedValue: 1 });
knowledgeFactSchema.index({ entityId: 1, field: 1, normalizedValue: 1, sourceDocumentId: 1, sourceSectionId: 1 }, {
  unique: true,
  partialFilterExpression: { sourceDocumentId: { $exists: true }, sourceSectionId: { $exists: true } },
  name: 'knowledge_fact_source_dedupe',
});
knowledgeFactSchema.index({ relatedEntityId: 1 });
knowledgeFactSchema.index({ graphVersion: 1, documentId: 1, chunkId: 1 });

export type KnowledgeFactRecord = InferSchemaType<typeof knowledgeFactSchema>;
const existingKnowledgeFact = mongoose.models.KnowledgeFact as Model<KnowledgeFactRecord> | undefined;
// Next.js Fast Refresh can retain a model compiled before new graph fields were
// introduced. Add missing paths to that cached model instead of recompiling it.
if (existingKnowledgeFact && !existingKnowledgeFact.schema.path('predicate')) {
  existingKnowledgeFact.schema.add({
    predicate: { type: String, required: true, trim: true, maxlength: 120, default: 'legacy_fact' },
    valueType: { type: String, enum: ['string', 'number', 'boolean', 'date', 'url', 'entity_reference', 'string_array'], required: true, default: 'string' },
    relatedEntityId: { type: Schema.Types.ObjectId, ref: 'KnowledgeEntity', index: true },
    validFrom: { type: Date }, validUntil: { type: Date }, isConflicting: { type: Boolean, default: false }, graphVersion: { type: String, trim: true, maxlength: 40 },
  });
}
if (existingKnowledgeFact && !existingKnowledgeFact.schema.path('sourceDocumentId')) {
  existingKnowledgeFact.schema.add({
    entityName: { type: String, trim: true, maxlength: 180, index: true },
    entityType: { type: String, enum: ['person', 'organization', 'project', 'product', 'technology', 'location', 'other'], index: true },
    sourceDocumentId: { type: Schema.Types.ObjectId, ref: 'KnowledgeDocument', index: true },
    sourceChunkId: { type: Schema.Types.ObjectId, ref: 'KnowledgeChunk', index: true },
    sourceSectionId: { type: Schema.Types.ObjectId, ref: 'KnowledgeSection', index: true },
    status: { type: String, enum: ['active', 'rejected', 'conflicted', 'archived'], default: 'active', index: true },
    period: { type: Schema.Types.Mixed },
    qualifiers: { type: Schema.Types.Mixed, default: {} },
  });
}
export default existingKnowledgeFact || mongoose.model<KnowledgeFactRecord>('KnowledgeFact', knowledgeFactSchema);
