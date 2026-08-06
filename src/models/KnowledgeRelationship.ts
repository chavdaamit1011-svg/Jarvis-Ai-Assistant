import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

const knowledgeRelationshipSchema = new Schema({
  sourceEntityId: { type: Schema.Types.ObjectId, ref: 'KnowledgeEntity', required: true, index: true },
  relationshipType: { type: String, required: true, trim: true, maxlength: 120, index: true },
  targetEntityId: { type: Schema.Types.ObjectId, ref: 'KnowledgeEntity', required: true, index: true },
  confidence: { type: Number, required: true, min: 0, max: 1 },
  documentId: { type: Schema.Types.ObjectId, ref: 'KnowledgeDocument', required: true, index: true },
  chunkId: { type: Schema.Types.ObjectId, ref: 'KnowledgeChunk', required: true, index: true },
  sourceText: { type: String, required: true, maxlength: 1_500 },
  isConflicting: { type: Boolean, default: false, index: true },
  graphVersion: { type: String, trim: true, maxlength: 40, index: true },
}, { timestamps: true, versionKey: false });

knowledgeRelationshipSchema.index({ sourceEntityId: 1, relationshipType: 1 });
knowledgeRelationshipSchema.index({ targetEntityId: 1 });
knowledgeRelationshipSchema.index({ relationshipType: 1 });
knowledgeRelationshipSchema.index({ graphVersion: 1, documentId: 1, chunkId: 1 });

export type KnowledgeRelationshipRecord = InferSchemaType<typeof knowledgeRelationshipSchema>;
const existingKnowledgeRelationship = mongoose.models.KnowledgeRelationship as Model<KnowledgeRelationshipRecord> | undefined;
if (existingKnowledgeRelationship && !existingKnowledgeRelationship.schema.path('graphVersion')) {
  existingKnowledgeRelationship.schema.add({ graphVersion: { type: String, trim: true, maxlength: 40 } });
}
export default existingKnowledgeRelationship || mongoose.model<KnowledgeRelationshipRecord>('KnowledgeRelationship', knowledgeRelationshipSchema);
