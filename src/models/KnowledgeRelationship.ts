import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

const knowledgeRelationshipSchema = new Schema({
  // Canonical v2 names. Legacy source/relationship/target fields remain for
  // existing graph callers until a future migration.
  subjectEntityId: { type: Schema.Types.ObjectId, ref: 'KnowledgeEntity', index: true },
  relation: { type: String, trim: true, maxlength: 120, index: true },
  objectEntityId: { type: Schema.Types.ObjectId, ref: 'KnowledgeEntity', index: true },
  qualifiers: { type: Schema.Types.Mixed, default: {} },
  sourceDocumentId: { type: Schema.Types.ObjectId, ref: 'KnowledgeDocument', index: true },
  sourceSectionId: { type: Schema.Types.ObjectId, ref: 'KnowledgeSection', index: true },
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
knowledgeRelationshipSchema.index({ subjectEntityId: 1, relation: 1 });
knowledgeRelationshipSchema.index({ objectEntityId: 1 });
knowledgeRelationshipSchema.index({ sourceDocumentId: 1, sourceSectionId: 1 });
knowledgeRelationshipSchema.index({ subjectEntityId: 1, relation: 1, objectEntityId: 1, sourceDocumentId: 1, sourceSectionId: 1 }, {
  unique: true,
  partialFilterExpression: { subjectEntityId: { $exists: true }, objectEntityId: { $exists: true }, sourceDocumentId: { $exists: true }, sourceSectionId: { $exists: true } },
  name: 'knowledge_relationship_source_dedupe',
});
knowledgeRelationshipSchema.index({ graphVersion: 1, documentId: 1, chunkId: 1 });

export type KnowledgeRelationshipRecord = InferSchemaType<typeof knowledgeRelationshipSchema>;
const existingKnowledgeRelationship = mongoose.models.KnowledgeRelationship as Model<KnowledgeRelationshipRecord> | undefined;
if (existingKnowledgeRelationship && !existingKnowledgeRelationship.schema.path('graphVersion')) {
  existingKnowledgeRelationship.schema.add({ graphVersion: { type: String, trim: true, maxlength: 40 } });
}
if (existingKnowledgeRelationship && !existingKnowledgeRelationship.schema.path('subjectEntityId')) {
  existingKnowledgeRelationship.schema.add({
    subjectEntityId: { type: Schema.Types.ObjectId, ref: 'KnowledgeEntity', index: true },
    relation: { type: String, trim: true, maxlength: 120, index: true },
    objectEntityId: { type: Schema.Types.ObjectId, ref: 'KnowledgeEntity', index: true },
    qualifiers: { type: Schema.Types.Mixed, default: {} },
    sourceDocumentId: { type: Schema.Types.ObjectId, ref: 'KnowledgeDocument', index: true },
    sourceSectionId: { type: Schema.Types.ObjectId, ref: 'KnowledgeSection', index: true },
  });
}
export default existingKnowledgeRelationship || mongoose.model<KnowledgeRelationshipRecord>('KnowledgeRelationship', knowledgeRelationshipSchema);
