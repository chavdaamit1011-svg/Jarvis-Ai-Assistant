import 'server-only';
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/jarvis-ai-assistant';

declare global { var mongooseConnection: Promise<typeof mongoose> | undefined; }

export function connectToDatabase(): Promise<typeof mongoose> {
  if (!global.mongooseConnection) {
    global.mongooseConnection = mongoose.connect(MONGODB_URI).catch((error) => {
      global.mongooseConnection = undefined;
      throw error;
    });
  }
  return global.mongooseConnection;
}
