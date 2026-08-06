import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

const knowledgeFactSchema = new Schema({
  entityId: { type: Schema.Types.ObjectId, ref: 'KnowledgeEntity', required: true, index: true },
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
  sourceText: { type: String, required: true, maxlength: 1_500 },
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
knowledgeFactSchema.index({ relatedEntityId: 1 });
knowledgeFactSchema.index({ graphVersion: 1, documentId: 1, chunkId: 1 });

export type KnowledgeFactRecord = InferSchemaType<typeof knowledgeFactSchema>;
export default (mongoose.models.KnowledgeFact as Model<KnowledgeFactRecord>) || mongoose.model<KnowledgeFactRecord>('KnowledgeFact', knowledgeFactSchema);
