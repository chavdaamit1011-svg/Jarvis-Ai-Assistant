import assert from 'node:assert/strict';
import test from 'node:test';
import { rewriteKnowledgeQuery } from './rewrite-query';

const rewrite = async (input: { entityName: string | null }) => ({
  alternateQueries: [
    `${input.entityName ?? 'entity'} topic overview`,
    `${input.entityName ?? 'entity'} related details`,
    `${input.entityName ?? 'entity'} document heading`,
  ],
  semanticConcepts: ['topic', 'related details'],
  confidence: 0.91,
});

test('creates 3–6 validated alternate queries and preserves the resolved entity', async () => {
  const result = await rewriteKnowledgeQuery({
    originalQuery: 'Where did this person study?',
    resolvedEntity: { name: 'Nora Vela', type: 'person' },
    requestedFields: ['education'],
  }, { rewriter: rewrite });

  assert.equal(result.primaryQuery, 'Where did this person study?');
  assert.equal(result.alternateQueries.length, 3);
  assert.ok(result.alternateQueries.every((query) => query.includes('Nora Vela')));
  assert.equal(result.trace.fallbackUsed, false);
});

test('preserves exact URLs, emails, numbers, and technology terms in rewrites', async () => {
  const result = await rewriteKnowledgeQuery({
    originalQuery: 'Find Next.js support at hello@example.com, 18% plan: https://example.com/docs',
    resolvedEntity: 'Blue Orbit',
  }, { rewriter: async () => ({
    alternateQueries: ['Blue Orbit support', 'Blue Orbit documentation', 'Blue Orbit contact'],
    semanticConcepts: ['support'],
    confidence: 0.9,
  }) });

  for (const query of result.alternateQueries) {
    assert.match(query, /Next\.js/);
    assert.match(query, /hello@example\.com/);
    assert.match(query, /18%/);
    assert.match(query, /https:\/\/example\.com\/docs/);
  }
});

test('supports unseen domains through injected semantic rewriting', async () => {
  const examples = [
    ['How long can returns be made?', ['refund period', 'return window', 'refund policy']],
    ['When will my order arrive?', ['delivery time', 'shipping timeline', 'order arrival']],
    ['How should this fabric be cleaned?', ['fabric care', 'washing instructions', 'garment care']],
    ['Who started this company?', ['company founder', 'organization creator', 'ownership']],
    ['Does this item have coverage?', ['product warranty', 'warranty terms', 'coverage period']],
    ['What are the academic qualifications?', ['education', 'academic background', 'qualifications']],
    ['Which work was created?', ['projects', 'portfolio work', 'applications']],
    ['How can I reach the team?', ['contact information', 'email phone', 'contact details']],
  ] as const;

  for (const [question, alternates] of examples) {
    const result = await rewriteKnowledgeQuery({ originalQuery: question }, { rewriter: async () => ({ alternateQueries: [...alternates], semanticConcepts: ['generic-domain'], confidence: 0.88 }) });
    assert.equal(result.alternateQueries.length, 3);
    assert.equal(result.trace.fallbackUsed, false);
  }
});

test('retries once then safely falls back to the original query', async () => {
  let calls = 0;
  const result = await rewriteKnowledgeQuery({ originalQuery: 'Unclear request' }, {
    rewriter: async () => { calls += 1; throw new Error('temporary provider failure'); },
    timeoutMs: 10,
  });

  assert.equal(calls, 2);
  assert.equal(result.primaryQuery, 'Unclear request');
  assert.deepEqual(result.alternateQueries, []);
  assert.equal(result.trace.fallbackUsed, true);
});
