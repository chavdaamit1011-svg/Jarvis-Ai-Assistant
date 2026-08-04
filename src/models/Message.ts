import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

const messageSchema = new Schema({
  conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
  role: { type: String, enum: ['user', 'assistant', 'system'], required: true },
  content: { type: String, required: true, maxlength: 8000 },
  status: { type: String, enum: ['pending', 'streaming', 'completed', 'stopped', 'error'], required: true, default: 'completed' },
  errorMessage: { type: String, maxlength: 1000 },
}, { timestamps: true, versionKey: false });
messageSchema.index({ conversationId: 1, createdAt: 1 });

export type MessageDocument = InferSchemaType<typeof messageSchema>;
export default (mongoose.models.Message as Model<MessageDocument>) || mongoose.model<MessageDocument>('Message', messageSchema);
