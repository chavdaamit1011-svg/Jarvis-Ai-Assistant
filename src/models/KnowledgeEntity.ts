import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

const knowledgeEntitySchema = new Schema({
  // Optional document ownership keeps the existing consolidated graph model
  // compatible while allowing ingestion-v2 source-level entities.
  documentId: { type: Schema.Types.ObjectId, ref: 'KnowledgeDocument', index: true },
  entityType: { type: String, enum: ['person', 'organization', 'project', 'product', 'technology', 'location', 'other'], required: true, index: true },
  canonicalName: { type: String, required: true, trim: true, maxlength: 180 },
  normalizedName: { type: String, required: true, trim: true, maxlength: 180, index: true },
  aliases: { type: [String], default: [] },
  description: { type: String, trim: true, maxlength: 2_000 },
  sourceDocumentIds: [{ type: Schema.Types.ObjectId, ref: 'KnowledgeDocument' }],
  sourceChunkIds: [{ type: Schema.Types.ObjectId, ref: 'KnowledgeChunk' }],
  sourceSectionIds: [{ type: Schema.Types.ObjectId, ref: 'KnowledgeSection' }],
  confidence: { type: Number, min: 0, max: 1, default: 0.5 },
  status: { type: String, enum: ['active', 'conflicted', 'archived'], default: 'active', index: true },
  // Kept for the existing profile-index implementation. New graph code should
  // store structured details in KnowledgeFact instead.
  factSummary: { type: String, default: '', maxlength: 2_000 },
}, { timestamps: true, versionKey: false });

knowledgeEntitySchema.index({ entityType: 1, normalizedName: 1 }, { unique: true });
knowledgeEntitySchema.index({ aliases: 1 });
knowledgeEntitySchema.index({ documentId: 1, normalizedName: 1 });

export type KnowledgeEntityRecord = InferSchemaType<typeof knowledgeEntitySchema>;
const existingKnowledgeEntity = mongoose.models.KnowledgeEntity as Model<KnowledgeEntityRecord> | undefined;
if (existingKnowledgeEntity && !existingKnowledgeEntity.schema.path('sourceDocumentIds')) {
  existingKnowledgeEntity.schema.add({
    description: { type: String, trim: true, maxlength: 2_000 },
    sourceDocumentIds: [{ type: Schema.Types.ObjectId, ref: 'KnowledgeDocument' }],
    sourceChunkIds: [{ type: Schema.Types.ObjectId, ref: 'KnowledgeChunk' }],
    confidence: { type: Number, min: 0, max: 1, default: 0.5 },
    status: { type: String, enum: ['active', 'conflicted', 'archived'], default: 'active' },
  });
}
if (existingKnowledgeEntity && !existingKnowledgeEntity.schema.path('sourceSectionIds')) {
  existingKnowledgeEntity.schema.add({
    documentId: { type: Schema.Types.ObjectId, ref: 'KnowledgeDocument', index: true },
    sourceSectionIds: [{ type: Schema.Types.ObjectId, ref: 'KnowledgeSection' }],
  });
}
export default existingKnowledgeEntity || mongoose.model<KnowledgeEntityRecord>('KnowledgeEntity', knowledgeEntitySchema);
