import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeQuery } from './index';

test('normalizes spelling, possessive context, and requested field meaning', async () => {
  const result = await normalizeQuery({ rawQuery: 'tell me abouts Nora education!!!' });
  assert.match(result.normalizedMeaning, /about Nora education/i);
  assert.ok(result.requestedFields.includes('education'));
  assert.ok(result.entityMentions.some((entity) => entity.normalized === 'nora'));
});
test('preserves mixed-language, singular/plural, and word-order meaning', async () => {
  const mixed = await normalizeQuery({ rawQuery: 'Nora ke project explain please' });
  assert.ok(mixed.requestedFields.includes('projects'));
  const reordered = await normalizeQuery({ rawQuery: 'education of Nora batao' });
  assert.ok(reordered.requestedFields.includes('education'));
  assert.ok(reordered.entityMentions.some((entity) => entity.normalized === 'nora'));
});
test('extracts incomplete utility, temporal, and numeric signals without selecting a capability', async () => {
  const gst = await normalizeQuery({ rawQuery: '1800 ka GST?' });
  assert.ok(gst.numericExpressions.some((value) => value.includes('1800')));
  const date = await normalizeQuery({ rawQuery: 'tomorrow ka date kya hai' });
  assert.ok(date.temporalExpressions.includes('tomorrow'));
  assert.equal('capability' in date, false);
});
test('handles general, current-information, and ambiguous wording safely', async () => {
  const code = await normalizeQuery({ rawQuery: 'How does a binary search work?' });
  assert.equal(code.requestedFields.length, 0);
  const current = await normalizeQuery({ rawQuery: 'latest framework release?' });
  assert.ok(current.temporalExpressions.includes('latest'));
  const vague = await normalizeQuery({ rawQuery: 'links bhej' });
  assert.equal(vague.rawQuery, 'links bhej'); assert.ok(vague.cleanedQuery.length > 0);
});
test('falls back safely when optional semantic normalization fails', async () => {
  const result = await normalizeQuery({ rawQuery: 'zzzz unclear wording' }, { semanticNormalizer: async () => { throw new Error('temporary'); }, timeoutMs: 10 });
  assert.equal(result.normalizerMethod, 'fallback'); assert.equal(result.fallbackUsed, true);
});
