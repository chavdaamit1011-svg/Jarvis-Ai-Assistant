import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeAndExpandQuery } from './query-normalization';

test('expands education questions into entity-preserving semantic queries', () => {
  const result = normalizeAndExpandQuery('Where did Amit Chavda study?');

  assert.equal(result.primaryQuery, 'Where did Amit Chavda study?');
  assert.ok(result.secondaryQueries.includes('amit chavda education'));
  assert.ok(result.secondaryQueries.includes('amit chavda university'));
  assert.ok(result.keywords.includes('study'));
  assert.ok(result.expandedQueries.includes('amit chavda education'));
});

test('expands project and portfolio requests without using entity-specific rules', () => {
  const projects = normalizeAndExpandQuery('What projects has Neel Desai built?');
  const portfolio = normalizeAndExpandQuery('What is Mira Patel portfolio?');

  assert.ok(projects.secondaryQueries.includes('neel desai projects'));
  assert.ok(projects.secondaryQueries.includes('neel desai applications'));
  assert.ok(portfolio.secondaryQueries.includes('mira patel website'));
  assert.ok(portfolio.secondaryQueries.includes('mira patel personal site'));
});

test('keeps original and normalized queries even when no semantic concept is detected', () => {
  const result = normalizeAndExpandQuery('Explain binary search');

  assert.equal(result.primaryQuery, 'Explain binary search');
  assert.ok(result.expandedQueries.includes('explain binary search'));
  assert.deepEqual(result.secondaryQueries, []);
});
