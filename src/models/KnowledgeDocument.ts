import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

const knowledgeDocumentSchema = new Schema({
  title: { type: String, required: true, trim: true, maxlength: 120 },
  description: { type: String, trim: true, maxlength: 500 },
  sourceType: { type: String, enum: ['manual', 'text'], required: true, default: 'manual' },
  originalContent: { type: String, required: true, maxlength: 50_000 },
  status: { type: String, enum: ['processing', 'ready', 'failed'], default: 'processing', index: true },
  chunkCount: { type: Number, default: 0, min: 0 },
  embeddingModel: { type: String, default: '' },
  visibility: { type: String, enum: ['private', 'public'], default: 'private', index: true },
}, { timestamps: true, versionKey: false });

knowledgeDocumentSchema.index({ createdAt: -1 });

export type KnowledgeDocumentRecord = InferSchemaType<typeof knowledgeDocumentSchema>;
export default (mongoose.models.KnowledgeDocument as Model<KnowledgeDocumentRecord>) || mongoose.model<KnowledgeDocumentRecord>('KnowledgeDocument', knowledgeDocumentSchema);
