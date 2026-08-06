import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

const progressSchema = new Schema({
  totalDocuments: { type: Number, default: 0, min: 0 },
  processedDocuments: { type: Number, default: 0, min: 0 },
  totalChunks: { type: Number, default: 0, min: 0 },
  processedChunks: { type: Number, default: 0, min: 0 },
  entitiesCreated: { type: Number, default: 0, min: 0 },
  factsCreated: { type: Number, default: 0, min: 0 },
  relationshipsCreated: { type: Number, default: 0, min: 0 },
  conflictsFound: { type: Number, default: 0, min: 0 },
  failedChunks: { type: Number, default: 0, min: 0 },
}, { _id: false });

const knowledgeGraphRebuildSchema = new Schema({
  graphVersion: { type: String, required: true, trim: true, maxlength: 40, index: true },
  status: { type: String, enum: ['pending', 'running', 'completed', 'completed_with_failures', 'failed'], required: true, default: 'pending', index: true },
  progress: { type: progressSchema, required: true, default: () => ({}) },
  failures: [{ chunkId: { type: Schema.Types.ObjectId, ref: 'KnowledgeChunk' }, message: { type: String, maxlength: 300 } }],
  startedAt: { type: Date },
  completedAt: { type: Date },
  errorMessage: { type: String, maxlength: 500 },
}, { timestamps: true, versionKey: false });

knowledgeGraphRebuildSchema.index({ createdAt: -1 });

export type KnowledgeGraphRebuildRecord = InferSchemaType<typeof knowledgeGraphRebuildSchema>;
export default (mongoose.models.KnowledgeGraphRebuild as Model<KnowledgeGraphRebuildRecord>)
  || mongoose.model<KnowledgeGraphRebuildRecord>('KnowledgeGraphRebuild', knowledgeGraphRebuildSchema);
