import assert from 'node:assert/strict';
import test from 'node:test';
import { retrieveHybridCandidates } from './hybrid-retriever';
import type { HybridCandidate, HybridRetrievalInput, HybridSearchDependencies } from './hybrid-types';

const input = (overrides: Partial<HybridRetrievalInput> = {}): HybridRetrievalInput => ({
  primaryQuery: 'Find account information', alternateQueries: ['account contact details'], semanticConcepts: ['contact'], exactTerms: [], topK: 5, visibility: 'public', ...overrides,
});
const chunk = (id: string, values: Partial<HybridCandidate> = {}): HybridCandidate => ({ kind: 'chunk', documentId: 'document-a', chunkId: id, content: 'Supported document text', queryMatchCount: 1, matchedQueries: ['Find account information'], ...values });
const dependencies = (vectorResults: HybridCandidate[] = [], keywordResults: HybridCandidate[] = [], exactResults: HybridCandidate[] = []): HybridSearchDependencies => ({
  vectorSearch: async () => vectorResults,
  keywordSearch: async () => keywordResults,
  exactSearch: async () => exactResults,
});

test('semantic synonym query can surface a relevant chunk', async () => {
  const result = await retrieveHybridCandidates(input({ alternateQueries: ['academic background'] }), dependencies([
    chunk('education', { vectorScore: 0.83, matchedQueries: ['academic background'] }),
  ]));
  assert.equal(result.candidates[0].chunkId, 'education');
  assert.equal(result.candidates[0].vectorScore, 0.83);
});

test('exact structured lookup wins over a lower semantic candidate', async () => {
  const exact: HybridCandidate = { kind: 'fact', factId: 'fact-url', entityId: 'entity-1', documentId: 'document-a', chunkId: 'chunk-url', value: 'https://example.test/person', predicate: 'linkedin_url', exactScore: 1, queryMatchCount: 1, matchedQueries: ['https://example.test/person'] };
  const result = await retrieveHybridCandidates(input({ exactTerms: ['https://example.test/person'] }), dependencies([
    chunk('nearby', { vectorScore: 0.2 }),
  ], [], [exact]));
  assert.equal(result.candidates[0].factId, 'fact-url');
  assert.equal(result.candidates[0].exactScore, 1);
});

test('entity-filtered adapter results exclude unrelated people', async () => {
  const result = await retrieveHybridCandidates(input({ entityId: 'entity-a' }), dependencies([
    chunk('owned-source', { entityId: 'entity-a', vectorScore: 0.7 }),
  ]));
  assert.ok(result.candidates.every((candidate) => candidate.entityId === 'entity-a' || candidate.entityId === undefined));
});

test('the same chunk appears once and retains the best scores', async () => {
  const result = await retrieveHybridCandidates(input(), dependencies([
    chunk('duplicate', { vectorScore: 0.7, matchedQueries: ['primary'] }),
  ], [
    chunk('duplicate', { keywordScore: 0.9, matchedQueries: ['alternate'] }),
  ]));
  assert.equal(result.candidates.length, 1);
  assert.equal(result.candidates[0].vectorScore, 0.7);
  assert.equal(result.candidates[0].keywordScore, 0.9);
  assert.deepEqual(result.candidates[0].matchedQueries.sort(), ['alternate', 'primary']);
  assert.equal(result.trace.deduplicatedCount, 1);
});

test('multiple query matches improve recall while unrelated chunks rank lower', async () => {
  const result = await retrieveHybridCandidates(input(), dependencies([
    chunk('recalled-by-alternate', { vectorScore: 0.78, queryMatchCount: 2, matchedQueries: ['account contact details', 'contact'] }),
    chunk('unrelated', { vectorScore: 0.22, queryMatchCount: 1, matchedQueries: ['contact'] }),
  ]));
  assert.equal(result.candidates[0].chunkId, 'recalled-by-alternate');
  assert.equal(result.candidates[1].chunkId, 'unrelated');
});

test('empty results return safely with a complete trace', async () => {
  const result = await retrieveHybridCandidates(input(), dependencies());
  assert.deepEqual(result.candidates, []);
  assert.deepEqual(result.trace.vectorResults, []);
  assert.equal(result.trace.deduplicatedCount, 0);
});

test('different wording for the same unseen entity returns the same supporting evidence', async () => {
  const source = chunk('orbitpay-source', { documentId: 'neel-document', vectorScore: 0.82, matchedQueries: ['OrbitPay project details'] });
  const search: HybridSearchDependencies = {
    vectorSearch: async (_input, queries) => queries.some((query) => /orbitpay|application|project/i.test(query)) ? [source] : [],
    keywordSearch: async () => [],
    exactSearch: async () => [],
  };
  const first = await retrieveHybridCandidates(input({ primaryQuery: 'What did Neel create?', alternateQueries: ['Neel OrbitPay project'], semanticConcepts: ['application'] }), search);
  const second = await retrieveHybridCandidates(input({ primaryQuery: 'Tell me about Neel projects', alternateQueries: ['Neel OrbitPay application'], semanticConcepts: ['created software'] }), search);
  assert.deepEqual(first.candidates.map((candidate) => candidate.chunkId), ['orbitpay-source']);
  assert.deepEqual(second.candidates.map((candidate) => candidate.chunkId), ['orbitpay-source']);
});
