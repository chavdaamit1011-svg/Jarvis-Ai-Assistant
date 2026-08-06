import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

const conversationSchema = new Schema({
  title: { type: String, required: true, trim: true, maxlength: 50, default: 'New Chat' },
  selectedModel: { type: String, required: true, default: 'jarvis-v4' },
  assistantMode: { type: String, required: true, default: 'general' },
  isPinned: { type: Boolean, default: false },
  isArchived: { type: Boolean, default: false },
  activeEntityId: { type: String, default: null },
  activeEntityName: { type: String, default: null, maxlength: 180 },
  activeEntityType: { type: String, default: null, maxlength: 50 },
}, { timestamps: true, versionKey: false });
conversationSchema.index({ updatedAt: -1 });
conversationSchema.index({ isPinned: -1, updatedAt: -1 });

export type ConversationDocument = InferSchemaType<typeof conversationSchema>;
export default (mongoose.models.Conversation as Model<ConversationDocument>) || mongoose.model<ConversationDocument>('Conversation', conversationSchema);
