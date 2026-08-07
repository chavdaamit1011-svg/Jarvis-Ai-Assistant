import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

const knowledgeDocumentSchema = new Schema({
  title: { type: String, required: true, trim: true, maxlength: 120 },
  description: { type: String, trim: true, maxlength: 500 },
  sourceType: { type: String, enum: ['manual', 'pdf', 'docx', 'txt'], required: true, default: 'manual' },
  originalContent: { type: String, required: true, maxlength: 50_000 },
  status: { type: String, enum: ['processing', 'ready', 'failed'], default: 'processing', index: true },
  chunkCount: { type: Number, default: 0, min: 0 },
  embeddingModel: { type: String, default: '' },
  errorMessage: { type: String, trim: true, maxlength: 300 },
  fileName: { type: String, trim: true, maxlength: 255 },
  fileType: { type: String, enum: ['pdf', 'docx', 'txt'] },
  mimeType: { type: String, maxlength: 150 },
  fileSize: { type: Number, min: 0 },
  pageCount: { type: Number, min: 1 },
  extractionMethod: { type: String, maxlength: 100 },
  extractedCharacterCount: { type: Number, min: 0 },
  processingStage: { type: String, enum: ['uploaded', 'extracting', 'chunking', 'embedding', 'ready', 'failed'], default: 'uploaded' },
  schemaVersion: { type: String, trim: true, maxlength: 40, default: 'knowledge-v2', index: true },
  extractionVersion: { type: String, trim: true, maxlength: 40, default: '' },
  processingStatus: { type: String, enum: ['pending', 'processing', 'completed', 'failed'], default: 'pending', index: true },
  processedAt: { type: Date },
  extractionErrors: { type: [String], default: [] },
  structuredKnowledge: {
    sectionCount: { type: Number, default: 0, min: 0 },
    entityCount: { type: Number, default: 0, min: 0 },
    factCount: { type: Number, default: 0, min: 0 },
    relationshipCount: { type: Number, default: 0, min: 0 },
    extractionVersion: { type: String, trim: true, maxlength: 40, default: '' },
    processedAt: { type: Date },
  },
  entities: { type: Schema.Types.Mixed, default: {} },
  visibility: { type: String, enum: ['private', 'public'], default: 'private', index: true },
}, { timestamps: true, versionKey: false });

knowledgeDocumentSchema.index({ createdAt: -1 });
knowledgeDocumentSchema.index({ processingStatus: 1, processedAt: -1 });

export type KnowledgeDocumentRecord = InferSchemaType<typeof knowledgeDocumentSchema>;
const existingKnowledgeDocument = mongoose.models.KnowledgeDocument as Model<KnowledgeDocumentRecord> | undefined;
if (existingKnowledgeDocument && !existingKnowledgeDocument.schema.path('schemaVersion')) {
  existingKnowledgeDocument.schema.add({
    schemaVersion: { type: String, trim: true, maxlength: 40, default: 'knowledge-v2', index: true },
    extractionVersion: { type: String, trim: true, maxlength: 40, default: '' },
    processingStatus: { type: String, enum: ['pending', 'processing', 'completed', 'failed'], default: 'pending', index: true },
    processedAt: { type: Date },
    extractionErrors: { type: [String], default: [] },
    structuredKnowledge: {
      sectionCount: { type: Number, default: 0, min: 0 }, entityCount: { type: Number, default: 0, min: 0 },
      factCount: { type: Number, default: 0, min: 0 }, relationshipCount: { type: Number, default: 0, min: 0 },
      extractionVersion: { type: String, trim: true, maxlength: 40, default: '' }, processedAt: { type: Date },
    },
  });
}
export default existingKnowledgeDocument || mongoose.model<KnowledgeDocumentRecord>('KnowledgeDocument', knowledgeDocumentSchema);
