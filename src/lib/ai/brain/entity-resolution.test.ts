import assert from 'node:assert/strict';
import test from 'node:test';
import { scoreEntityCandidates, selectDecisiveCandidates, selectSubjectCandidates, type EntityCandidate } from './entity-resolution';

const oneEntity: EntityCandidate[] = [{
  _id: 'one', canonicalName: 'Example Person', normalizedName: 'example person', aliases: ['Example'], entityType: 'person',
}];

test('resolves a unique entity in English possessive phrasing', () => {
  const matches = scoreEntityCandidates("Tell me about Example's education", oneEntity).filter((item) => item.score >= 0.85);
  assert.equal(matches.length, 1);
  assert.equal(matches[0].entity.canonicalName, 'Example Person');
});

test('supports full names, reversed names, and case-insensitive aliases', () => {
  for (const query of ['Example Person', 'Person Example', 'example', 'EXAMPLE']) {
    const matches = scoreEntityCandidates(query, oneEntity).filter((item) => item.score >= 0.85);
    assert.equal(matches.length, 1, query);
  }
});

test('keeps same-name entities ambiguous', () => {
  const candidates: EntityCandidate[] = [
    ...oneEntity,
    { _id: 'two', canonicalName: 'Example Other', normalizedName: 'example other', aliases: ['Example'], entityType: 'person' },
  ];
  const matches = scoreEntityCandidates('Who is Example?', candidates).filter((item) => item.score >= 0.85);
  assert.equal(matches.length, 2);
});

test('does not resolve an unknown entity', () => {
  const matches = scoreEntityCandidates('Tell me about Unknown Person', oneEntity).filter((item) => item.score >= 0.85);
  assert.equal(matches.length, 0);
});

test('keeps a full-name match decisive over an unrelated fuzzy entity match', () => {
  const candidates: EntityCandidate[] = [
    { _id: 'person', canonicalName: 'Example Person', normalizedName: 'example person', aliases: ['Example'], entityType: 'person' },
    { _id: 'degree', canonicalName: 'B.Com', normalizedName: 'b.com', aliases: [], entityType: 'other' },
  ];
  const matches = scoreEntityCandidates('Person Example completed bcom', candidates)
    .filter((item) => item.score >= 0.85)
    .sort((left, right) => right.score - left.score);
  assert.equal(selectDecisiveCandidates(matches).length, 1);
  assert.equal(selectDecisiveCandidates(matches)[0].entity.canonicalName, 'Example Person');
});

test('treats a unique person as the subject when a degree entity is also a filter', () => {
  const candidates: EntityCandidate[] = [
    { _id: 'person', canonicalName: 'Amit Chavda', normalizedName: 'amit chavda', aliases: ['Amit'], entityType: 'person' },
    { _id: 'degree', canonicalName: 'Bachelor of Commerce', normalizedName: 'bachelor of commerce', aliases: ['B.Com'], entityType: 'other' },
  ];
  const matches = scoreEntityCandidates('amit ne bcom kab kiya', candidates)
    .filter((item) => item.score >= 0.85)
    .sort((left, right) => right.score - left.score);
  const selected = selectDecisiveCandidates(selectSubjectCandidates(matches));
  assert.deepEqual(selected.map((item) => item.entity.canonicalName), ['Amit Chavda']);
});
