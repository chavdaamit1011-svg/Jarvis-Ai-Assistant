import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

const knowledgeEntityResolutionSchema = new Schema({
  entityType: { type: String, required: true, index: true },
  incomingName: { type: String, required: true, trim: true, maxlength: 180 },
  normalizedName: { type: String, required: true, trim: true, maxlength: 180, index: true },
  graphVersion: { type: String, trim: true, maxlength: 40, index: true },
  outcome: { type: String, enum: ['matched', 'new_entity', 'ambiguous', 'conflicting'], required: true, index: true },
  candidateEntityIds: [{ type: Schema.Types.ObjectId, ref: 'KnowledgeEntity' }],
  documentId: { type: Schema.Types.ObjectId, ref: 'KnowledgeDocument', required: true, index: true },
  chunkId: { type: Schema.Types.ObjectId, ref: 'KnowledgeChunk', required: true, index: true },
  reason: { type: String, required: true, maxlength: 500 },
  reviewedAt: { type: Date },
}, { timestamps: true, versionKey: false });

knowledgeEntityResolutionSchema.index({ normalizedName: 1, outcome: 1, createdAt: -1 });

export type KnowledgeEntityResolutionRecord = InferSchemaType<typeof knowledgeEntityResolutionSchema>;
export default (mongoose.models.KnowledgeEntityResolution as Model<KnowledgeEntityResolutionRecord>)
  || mongoose.model<KnowledgeEntityResolutionRecord>('KnowledgeEntityResolution', knowledgeEntityResolutionSchema);
