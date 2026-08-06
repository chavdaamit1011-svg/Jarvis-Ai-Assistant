import assert from 'node:assert/strict';
import test from 'node:test';
import { rerankKnowledgeChunks } from './reranker';
import type { RerankerInput } from './reranker-types';

const input = (count = 7): RerankerInput => ({
  originalQuery: 'Find the relevant record',
  resolvedQuery: 'Find the selected entity relevant record',
  entity: { id: 'entity-1', name: 'Example Entity', type: 'person' },
  retrievedChunks: Array.from({ length: count }, (_, index) => ({
    chunkId: `chunk-${index + 1}`,
    documentId: 'document-1',
    text: `Knowledge content ${index + 1}`,
    vectorScore: (index + 1) / 10,
    keywordScore: 0.1,
    matchedQueries: ['Find the relevant record'],
  })),
});

test('keeps only the five highest AI-ranked chunks and discards the rest', async () => {
  const result = await rerankKnowledgeChunks(input(), { reranker: async () => ({
    rankings: Array.from({ length: 7 }, (_, index) => ({ chunkId: `chunk-${index + 1}`, score: 1 - index / 10, reason: 'Direct support.' })),
    rankingReason: 'Directly supports the requested field.', confidence: 0.93,
  }) });

  assert.equal(result.rankedChunks.length, 5);
  assert.equal(result.discardedChunks.length, 2);
  assert.equal(result.rankedChunks[0].chunkId, 'chunk-1');
  assert.equal(result.confidence, 0.93);
});

test('never accepts an AI-invented chunk ID', async () => {
  const result = await rerankKnowledgeChunks(input(2), { reranker: async () => ({
    rankings: [{ chunkId: 'unknown-chunk', score: 1, reason: 'Invented.' }, { chunkId: 'chunk-2', score: 0.8, reason: 'Supported.' }, { chunkId: 'chunk-1', score: 0.7, reason: 'Supported.' }],
    rankingReason: 'Test', confidence: 0.8,
  }) });
  assert.deepEqual(result.rankedChunks.map((chunk) => chunk.chunkId), ['chunk-2', 'chunk-1']);
});

test('falls back safely to exact and hybrid scores after two failures', async () => {
  let calls = 0;
  const source = input(3); source.retrievedChunks[0].exactScore = 1;
  const result = await rerankKnowledgeChunks(source, { reranker: async () => { calls += 1; throw new Error('temporary'); } });
  assert.equal(calls, 2);
  assert.equal(result.rankedChunks[0].chunkId, 'chunk-1');
  assert.match(result.rankingReason, /unavailable/i);
});

test('returns an empty result safely', async () => {
  const result = await rerankKnowledgeChunks({ ...input(0), retrievedChunks: [] });
  assert.deepEqual(result.rankedChunks, []);
  assert.deepEqual(result.discardedChunks, []);
});
