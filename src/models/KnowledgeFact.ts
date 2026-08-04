import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

const knowledgeFactSchema = new Schema({
  entityId: { type: Schema.Types.ObjectId, ref: 'KnowledgeEntity', required: true, index: true },
  field: { type: String, required: true, trim: true, maxlength: 100, index: true },
  value: { type: String, required: true, trim: true, maxlength: 1_500 },
  normalizedValue: { type: String, required: true, trim: true, maxlength: 1_500, index: true },
  confidence: { type: Number, required: true, min: 0, max: 1 },
  documentId: { type: Schema.Types.ObjectId, ref: 'KnowledgeDocument', required: true, index: true },
  chunkId: { type: Schema.Types.ObjectId, ref: 'KnowledgeChunk', required: true, index: true },
  sourceText: { type: String, required: true, maxlength: 1_500 },
}, { timestamps: true, versionKey: false });

knowledgeFactSchema.index({ entityId: 1, field: 1, normalizedValue: 1 });

export type KnowledgeFactRecord = InferSchemaType<typeof knowledgeFactSchema>;
export default (mongoose.models.KnowledgeFact as Model<KnowledgeFactRecord>) || mongoose.model<KnowledgeFactRecord>('KnowledgeFact', knowledgeFactSchema);
