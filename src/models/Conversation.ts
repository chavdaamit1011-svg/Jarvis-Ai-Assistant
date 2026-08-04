import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

const conversationSchema = new Schema({
  title: { type: String, required: true, trim: true, maxlength: 50, default: 'New Chat' },
  model: { type: String, required: true, default: 'jarvis-v4' },
  assistantMode: { type: String, required: true, default: 'general' },
  isPinned: { type: Boolean, default: false },
  isArchived: { type: Boolean, default: false },
}, { timestamps: true, versionKey: false });

export type ConversationDocument = InferSchemaType<typeof conversationSchema>;
export default (mongoose.models.Conversation as Model<ConversationDocument>) || mongoose.model<ConversationDocument>('Conversation', conversationSchema);
