import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

const knowledgeEntitySchema = new Schema({
  entityType: { type: String, enum: ['person', 'organization', 'project', 'product'], required: true, index: true },
  canonicalName: { type: String, required: true, trim: true, maxlength: 180 },
  normalizedName: { type: String, required: true, trim: true, maxlength: 180, index: true },
  aliases: { type: [String], default: [] },
  factSummary: { type: String, default: '', maxlength: 2_000 },
}, { timestamps: true, versionKey: false });

knowledgeEntitySchema.index({ entityType: 1, normalizedName: 1 }, { unique: true });

export type KnowledgeEntityRecord = InferSchemaType<typeof knowledgeEntitySchema>;
export default (mongoose.models.KnowledgeEntity as Model<KnowledgeEntityRecord>) || mongoose.model<KnowledgeEntityRecord>('KnowledgeEntity', knowledgeEntitySchema);
