import assert from 'node:assert/strict';
import test from 'node:test';
import { extractDeterministicFacts } from './extract-deterministic-facts';
import { normalizeGraphFactValue, valuesConflict } from './fact-normalization';
import { createTemporaryEntityId, normalizeAliases } from './normalize-entity';

test('keeps reversed full names as aliases', () => {
  assert.ok(normalizeAliases('Amit Chavda').includes('Chavda Amit'));
});

test('does not conflate people who only share a first name', () => {
  assert.notEqual(createTemporaryEntityId('person', 'Amit Shah'), createTemporaryEntityId('person', 'Amit Chavda'));
});

test('extracts the same email from name variations as identical evidence', () => {
  const first = extractDeterministicFacts('Name: Amit Chavda\nEmail: amit@example.com');
  const second = extractDeterministicFacts('Name: Chavda Amit\nEmail: amit@example.com');
  assert.equal(first.facts.find((fact) => fact.predicate === 'email')?.value, second.facts.find((fact) => fact.predicate === 'email')?.value);
});

test('normalizes duplicate technologies across multiple documents', () => {
  assert.equal(normalizeGraphFactValue('React.js'), normalizeGraphFactValue('react js'));
  assert.equal(normalizeGraphFactValue('Nodejs'), normalizeGraphFactValue('Node.js'));
  assert.equal(normalizeGraphFactValue('Mongo DB'), normalizeGraphFactValue('MongoDB'));
});

test('detects conflicting roles and experience while allowing duplicate projects', () => {
  assert.equal(valuesConflict('role', ['Web Developer', 'Product Manager']), true);
  assert.equal(valuesConflict('experience', ['2 years', '3 years']), true);
  assert.equal(valuesConflict('projects', ['Storefront', 'Admin Portal']), false);
});
