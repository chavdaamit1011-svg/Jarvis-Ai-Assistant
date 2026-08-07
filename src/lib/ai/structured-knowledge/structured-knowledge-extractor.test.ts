import assert from 'node:assert/strict';
import test from 'node:test';
import { extractStructuredKnowledge } from './structured-knowledge-extractor';

test('preserves separate sections and atomic resume facts', () => {
  const result = extractStructuredKnowledge('Name: Mira Patel\nEDUCATION\nBachelor of Commerce\nMaster of Computer Application\nSKILLS\nReact.js, Node.js\nPROJECTS\nE-Commerce (Northern Market)');
  assert.deepEqual(result.sections.map((section) => section.heading), ['', 'EDUCATION', 'SKILLS', 'PROJECTS']);
  assert.equal(result.facts.filter((fact) => fact.field.startsWith('education.')).length, 2);
  assert.equal(result.facts.filter((fact) => fact.field === 'skill').length, 2);
});

test('extracts product, policy, contact and exact URL values without inference', () => {
  const result = extractStructuredKnowledge('Company: Alpine Goods\nPOLICIES\nRefund Policy: Refunds are accepted within 30 days.\nPRODUCTS\nTravel Bag, Winter Jacket\nCONTACT\nEmail: support@alpine.example\nWebsite: https://Alpine.example/Support');
  const values = result.facts.map((fact) => fact.value);
  assert.ok(values.includes('Refunds are accepted within 30 days'));
  assert.ok(values.includes('Travel Bag'));
  assert.ok(values.includes('Winter Jacket'));
  assert.ok(values.includes('https://Alpine.example/Support'));
  assert.equal(values.includes('Unknown phone number'), false);
});

test('stores explicit relationships with supporting source text', () => {
  const result = extractStructuredKnowledge('Neel Desai is a Flutter Developer at BlueOrbit Labs.\nNeel created the OrbitPay mobile application.');
  assert.ok(result.relationships.some((relationship) => relationship.relation === 'WORKS_AT' && relationship.sourceText.includes('BlueOrbit Labs')));
  assert.ok(result.relationships.some((relationship) => relationship.relation === 'CREATED' && relationship.sourceText.includes('OrbitPay')));
});
