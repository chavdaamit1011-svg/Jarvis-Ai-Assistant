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

test('extracts unseen people, organizations, projects, and explicit relationships', () => {
  const result = extractDeterministicFacts('Neel Desai is a Flutter Developer at BlueOrbit Labs.\nNeel created the OrbitPay mobile application.');
  assert.ok(result.entities.some((entity) => entity.name === 'Neel Desai' && entity.entityType === 'person'));
  assert.ok(result.entities.some((entity) => entity.name === 'BlueOrbit Labs' && entity.entityType === 'organization'));
  assert.ok(result.entities.some((entity) => entity.name === 'OrbitPay' && entity.entityType === 'project'));
  assert.ok(result.facts.some((fact) => fact.predicate === 'profession' && fact.value === 'Flutter Developer'));
  assert.ok(result.relationships.some((relationship) => relationship.relationshipType === 'WORKS_AT'));
  assert.ok(result.relationships.some((relationship) => relationship.relationshipType === 'CREATED'));
});

test('extracts resume project blocks with evidence and project technology relationships', () => {
  const result = extractDeterministicFacts('Name: Neel Desai\nPROJECT WORK\nOrbitPay\nCreated a payment application using Flutter and Firebase.\nhttps://orbitpay.example/');
  const person = result.entities.find((entity) => entity.entityType === 'person' && entity.name === 'Neel Desai');
  const project = result.entities.find((entity) => entity.entityType === 'project' && entity.name === 'OrbitPay');
  assert.ok(person);
  assert.ok(project);
  assert.ok(result.relationships.some((relationship) => relationship.sourceTemporaryId === person?.temporaryId && relationship.targetTemporaryId === project?.temporaryId && relationship.relationshipType === 'WORKED_ON'));
  assert.ok(result.facts.some((fact) => fact.subjectTemporaryId === project?.temporaryId && fact.predicate === 'project_url' && fact.value === 'https://orbitpay.example/'));
});
