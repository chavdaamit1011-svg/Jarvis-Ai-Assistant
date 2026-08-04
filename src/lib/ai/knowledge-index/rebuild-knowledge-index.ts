import 'server-only';

import { connectToDatabase } from '@/lib/db/connect';
import KnowledgeChunk from '@/models/KnowledgeChunk';
import KnowledgeDocument from '@/models/KnowledgeDocument';
import KnowledgeEntity from '@/models/KnowledgeEntity';
import KnowledgeFact from '@/models/KnowledgeFact';
import { extractEntities } from '@/lib/ai/rag/entity-extraction';
import { extractFacts, normalizeFactValue } from './fact-extraction';

const normalizeName = (value: string) => normalizeFactValue(value).split(' ').sort().join(' ');
const sourceSnippet = (content: string) => content.replace(/\s+/g, ' ').trim().slice(0, 1_400);

function personNames(content: string, stored?: { personNames?: string[] }) {
  const extracted = extractEntities(content).personNames;
  const labelled = [...content.matchAll(/(?:^|\n)\s*(?:name|full name)\s*:\s*([A-Za-z]+(?:[ ]+[A-Za-z]+){1,2})/gi)].map((match) => match[1]);
  const uppercase = [...content.matchAll(/(?:^|\n)\s*([A-Z]{2,}(?:[ ]+[A-Z]{2,}){1,2})\s*(?:\n|$)/g)].map((match) => match[1].toLowerCase().replace(/\b[a-z]/g, (letter) => letter.toUpperCase()));
  return [...new Set([...extracted, ...(stored?.personNames ?? []), ...labelled, ...uppercase])];
}

async function upsertPerson(name: string) {
  const normalizedName = normalizeName(name);
  const entity = await KnowledgeEntity.findOneAndUpdate(
    { entityType: 'person', normalizedName },
    { $setOnInsert: { canonicalName: name, factSummary: '' }, $addToSet: { aliases: name } },
    { upsert: true, new: true },
  );
  return entity;
}

export async function indexReadyDocument(documentId: string) {
  await connectToDatabase();
  const document = await KnowledgeDocument.findById(documentId).lean();
  if (!document || document.status !== 'ready') return { entities: 0, facts: 0 };
  const chunks = await KnowledgeChunk.find({ documentId: document._id }).select('content').lean();
  await KnowledgeFact.deleteMany({ documentId: document._id });
  let entityCount = 0; let factCount = 0;
  const names = personNames(document.originalContent, document.entities as { personNames?: string[] } | undefined);
  for (const name of names) {
    const entity = await upsertPerson(name); entityCount += 1;
    for (const chunk of chunks) {
      const facts = extractFacts(chunk.content);
      if (!facts.length) continue;
      await KnowledgeFact.insertMany(facts.map((fact) => ({ ...fact, entityId: entity._id, documentId: document._id, chunkId: chunk._id, sourceText: sourceSnippet(chunk.content) })));
      factCount += facts.length;
    }
  }
  return { entities: entityCount, facts: factCount };
}

export async function rebuildKnowledgeIndex() {
  await connectToDatabase();
  await Promise.all([KnowledgeFact.deleteMany({}), KnowledgeEntity.deleteMany({})]);
  const documents = await KnowledgeDocument.find({ status: 'ready' }).select('_id').lean();
  let entities = 0; let facts = 0;
  for (const document of documents) {
    const indexed = await indexReadyDocument(String(document._id));
    entities += indexed.entities; facts += indexed.facts;
  }
  return { documents: documents.length, entities, facts };
}
