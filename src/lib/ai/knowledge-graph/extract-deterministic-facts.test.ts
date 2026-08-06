import assert from 'node:assert/strict';
import test from 'node:test';
import { extractDeterministicFacts } from './extract-deterministic-facts';

test('extracts a person profile, ownership, and technologies', () => {
  const result = extractDeterministicFacts('Chavda Amit is a Web Developer and owner of Jarvis AI.\nHe works with Next.js, React.js, Node.js and MongoDB.');
  assert.ok(result.entities.some((entity) => entity.name === 'Chavda Amit' && entity.entityType === 'person'));
  assert.ok(result.entities.some((entity) => entity.name === 'Jarvis AI' && entity.entityType === 'product'));
  assert.ok(result.facts.some((fact) => fact.predicate === 'profession' && fact.value === 'Web Developer'));
  assert.equal(result.relationships.filter((relationship) => relationship.relationshipType === 'OWNER_OF').length, 1);
  assert.equal(result.relationships.filter((relationship) => relationship.relationshipType === 'USES_TECHNOLOGY').length, 4);
});

test('extracts company and project labelled fields', () => {
  const result = extractDeterministicFacts('Organization: RC Cyber Europe\nProject: Secure Customer Portal');
  assert.ok(result.entities.some((entity) => entity.entityType === 'organization' && entity.name === 'RC Cyber Europe'));
  assert.ok(result.entities.some((entity) => entity.entityType === 'project' && entity.name === 'Secure Customer Portal'));
});

test('classifies platform URLs and contact fields', () => {
  const result = extractDeterministicFacts('Name: Rahul Sharma\nLinkedIn: https://linkedin.com/in/rahul\nGitHub: https://github.com/rahul\nEmail: rahul@example.com\nPhone: +91 99999 12345');
  assert.deepEqual(result.facts.map((fact) => fact.predicate).sort(), ['email', 'github_url', 'linkedin_url', 'phone']);
});

test('extracts skills list as technology relationships', () => {
  const result = extractDeterministicFacts('Name: Akash Patel\nSkills: JavaScript, TypeScript, React.js and Node.js');
  assert.equal(result.relationships.filter((relationship) => relationship.relationshipType === 'USES_TECHNOLOGY').length, 4);
});

test('does not turn uncertain technology wording into a relationship', () => {
  const result = extractDeterministicFacts('Name: Amit Sharma\nAmit may use React.js on a future project.');
  assert.equal(result.relationships.filter((relationship) => relationship.relationshipType === 'USES_TECHNOLOGY').length, 0);
});
