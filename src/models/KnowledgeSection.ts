import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

/**
 * A document's structural unit. Sections coexist with semantic chunks: chunks
 * serve retrieval, while sections preserve headings and source provenance.
 */
const knowledgeSectionSchema = new Schema({
  documentId: { type: Schema.Types.ObjectId, ref: 'KnowledgeDocument', required: true, index: true },
  heading: { type: String, trim: true, maxlength: 300, default: '' },
  text: { type: String, required: true, maxlength: 50_000 },
  pageNumber: { type: Number, min: 1 },
  sectionPath: { type: [String], default: [] },
  order: { type: Number, required: true, min: 0 },
}, { timestamps: true, versionKey: false });

knowledgeSectionSchema.index({ documentId: 1, order: 1 }, { unique: true });
knowledgeSectionSchema.index({ documentId: 1, heading: 1 });

export type KnowledgeSectionRecord = InferSchemaType<typeof knowledgeSectionSchema>;
const existingKnowledgeSection = mongoose.models.KnowledgeSection as Model<KnowledgeSectionRecord> | undefined;
export default existingKnowledgeSection || mongoose.model<KnowledgeSectionRecord>('KnowledgeSection', knowledgeSectionSchema);
