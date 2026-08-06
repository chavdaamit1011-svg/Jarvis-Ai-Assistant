import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateKnowledge } from './evaluate-knowledge';

const source = (documentId = 'doc-1', chunkId = 'chunk-1') => ({ documentId, chunkId, documentStatus: 'ready' as const, supportingText: 'Direct supporting text.' });
const fact = (overrides = {}) => ({ id: 'fact-1', directlySupportsAnswer: true, sources: [source()], ...overrides });
const entity = { found: true, ambiguous: false, matchStrength: 'full_name' as const };

test('accepts one directly supported fact', () => assert.equal(evaluateKnowledge({ entity, facts: [fact()] }).decision, 'answer'));
test('does not count duplicate chunks from one document as independent documents', () => {
  const result = evaluateKnowledge({ entity, facts: [fact({ sources: [source('doc-1', 'one'), source('doc-1', 'two')] })] });
  assert.equal(result.independentDocumentCount, 1);
});
test('records two independent supporting documents', () => {
  const result = evaluateKnowledge({ entity, facts: [fact({ sources: [source('doc-1', 'one'), source('doc-2', 'two')] })] });
  assert.equal(result.independentDocumentCount, 2);
});
test('returns conflict for conflicting experience values', () => assert.equal(evaluateKnowledge({ entity, facts: [fact()], conflicts: [{ field: 'experience', values: ['2 years', '3 years'], sources: [source('doc-1', 'one'), source('doc-2', 'two')] }] }).decision, 'conflict'));
test('returns clarify for ambiguous person name', () => assert.equal(evaluateKnowledge({ entity: { found: true, ambiguous: true, matchStrength: 'weak_similarity' }, facts: [] }).decision, 'clarify'));
test('falls back with no relevant knowledge', () => assert.equal(evaluateKnowledge({ entity: { found: false, ambiguous: false, matchStrength: 'none' }, facts: [] }).decision, 'fallback'));
test('accepts an exact URL with direct source support', () => assert.equal(evaluateKnowledge({ entity, requiresExactValue: true, facts: [fact({ valueKind: 'exact_value' })] }).decision, 'answer'));
test('rejects an invented URL without source support', () => {
  const result = evaluateKnowledge({ entity, requiresExactValue: true, facts: [fact({ valueKind: 'exact_value', sources: [] })] });
  assert.equal(result.decision, 'insufficient'); assert.equal(result.rejectedFacts.length, 1);
});
test('accepts a multi-document profile summary', () => assert.equal(evaluateKnowledge({ entity, facts: [fact({ id: 'profession', sources: [source('doc-1', 'one')] }), fact({ id: 'role', sources: [source('doc-2', 'two')] })] }).decision, 'answer'));
test('does not assume support for an unseen entity', () => assert.equal(evaluateKnowledge({ entity: { found: false, ambiguous: false, matchStrength: 'none' }, facts: [], retrieval: { topSimilarityScore: 0.2, relevantChunkCount: 0, textSupportsAnswer: false } }).decision, 'fallback'));
