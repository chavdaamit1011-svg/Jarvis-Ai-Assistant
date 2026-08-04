import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

const knowledgeChunkSchema = new Schema({
  documentId: { type: Schema.Types.ObjectId, ref: 'KnowledgeDocument', required: true, index: true },
  chunkIndex: { type: Number, required: true, min: 0 },
  content: { type: String, required: true, maxlength: 2_000 },
  embedding: { type: [Number], required: true, select: false },
  embeddingDimension: { type: Number, required: true, min: 1 },
  metadata: {
    documentTitle: { type: String, required: true, maxlength: 120 },
    sourceType: { type: String, enum: ['manual', 'text'], required: true },
    visibility: { type: String, enum: ['private', 'public'], required: true },
  },
  tokenEstimate: { type: Number, required: true, min: 0 },
}, { timestamps: true, versionKey: false });

knowledgeChunkSchema.index({ documentId: 1, chunkIndex: 1 }, { unique: true });
knowledgeChunkSchema.index({ 'metadata.visibility': 1 });
knowledgeChunkSchema.index({ createdAt: -1 });

export type KnowledgeChunkRecord = InferSchemaType<typeof knowledgeChunkSchema>;
export default (mongoose.models.KnowledgeChunk as Model<KnowledgeChunkRecord>) || mongoose.model<KnowledgeChunkRecord>('KnowledgeChunk', knowledgeChunkSchema);
