import { loadEnvConfig } from '@next/env';
import mongoose from 'mongoose';

loadEnvConfig(process.cwd());

const runtimeModelNames = [
  'KnowledgeDocument', 'KnowledgeChunk', 'KnowledgeSection', 'KnowledgeEntity',
  'KnowledgeEntityResolution', 'KnowledgeFact', 'KnowledgeRelationship',
  'KnowledgeGraphRebuild', 'Conversation', 'Message', 'AITrace',
] as const;

type CollectionReport = { collection: string; before: number; after: number; indexesBefore: string[]; indexesAfter: string[]; cleared: boolean; reason?: string };
const indexNames = (indexes: Array<{ name?: string }>) => indexes.map((index) => index.name).filter((name): name is string => Boolean(name)).sort();

function isProduction() {
  return process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';
}

function resolveCollectionName(modelName: string) {
  const pluralize = mongoose.pluralize();
  return pluralize ? pluralize(modelName) : modelName.toLowerCase();
}

async function main() {
  if (isProduction()) throw new Error('Refusing to reset data in a production environment.');
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required.');
  if (!/(?:localhost|127\.0\.0\.1|::1)/i.test(uri)) throw new Error('Refusing to reset a non-local MongoDB URI.');

  await mongoose.connect(uri);
  const database = mongoose.connection.db;
  if (!database) throw new Error('MongoDB connection was not established.');
  await database.command({ ping: 1 });

  const existing = new Set((await database.listCollections({}, { nameOnly: true }).toArray()).map((item) => item.name));
  const runtimeCollections = runtimeModelNames.map(resolveCollectionName);
  const reports: CollectionReport[] = [];

  for (const collectionName of runtimeCollections) {
    if (!existing.has(collectionName)) {
      reports.push({ collection: collectionName, before: 0, after: 0, indexesBefore: [], indexesAfter: [], cleared: false, reason: 'Collection does not exist; it was not created.' });
      continue;
    }
    const collection = database.collection(collectionName);
    const before = await collection.countDocuments({});
    const indexesBefore = indexNames(await collection.indexes());
    await collection.deleteMany({});
    const after = await collection.countDocuments({});
    const indexesAfter = indexNames(await collection.indexes());
    if (after !== 0) throw new Error(`Verification failed: ${collectionName} still has ${after} document(s).`);
    if (JSON.stringify(indexesBefore) !== JSON.stringify(indexesAfter)) throw new Error(`Verification failed: index list changed for ${collectionName}.`);
    reports.push({ collection: collectionName, before, after, indexesBefore, indexesAfter, cleared: true });
  }

  const preserved = [...existing].filter((name) => !runtimeCollections.includes(name as typeof runtimeCollections[number]));
  console.log(JSON.stringify({
    environment: process.env.NODE_ENV ?? 'development',
    databaseConnected: true,
    cleared: reports,
    preserved: preserved.map((collection) => ({ collection, reason: 'Not a code-identified Jarvis runtime AI collection; preserved without guessing.' })),
  }, null, 2));
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error('[reset:jarvis-dev]', error instanceof Error ? error.message : 'Unknown reset failure.');
  await mongoose.disconnect().catch(() => undefined);
  process.exitCode = 1;
});
