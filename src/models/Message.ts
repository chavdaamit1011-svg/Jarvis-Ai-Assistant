import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

const messageSchema = new Schema({
  conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
  role: { type: String, enum: ['user', 'assistant'], required: true },
  content: { type: String, required: true, maxlength: 8000 },
}, { timestamps: { createdAt: true, updatedAt: false }, versionKey: false });

export type MessageDocument = InferSchemaType<typeof messageSchema>;
export default (mongoose.models.Message as Model<MessageDocument>) || mongoose.model<MessageDocument>('Message', messageSchema);
