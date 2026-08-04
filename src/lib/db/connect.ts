import 'server-only';
import mongoose from 'mongoose';

declare global { var mongooseConnection: Promise<typeof mongoose> | undefined; }

export function connectToDatabase(): Promise<typeof mongoose> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not configured on the server.');
  if (!global.mongooseConnection) {
    global.mongooseConnection = mongoose.connect(uri).catch((error) => {
      global.mongooseConnection = undefined;
      throw error;
    });
  }
  return global.mongooseConnection;
}
