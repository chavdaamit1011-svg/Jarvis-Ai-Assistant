import assert from 'node:assert/strict';
import test from 'node:test';
import {
  knowledgeFactDedupeKey,
  knowledgeFactInputSchema,
  knowledgeRelationshipDedupeKey,
  knowledgeRelationshipInputSchema,
} from './validation';

const ids = {
  entity: '65a000000000000000000001',
  entityTwo: '65a000000000000000000002',
  document: '65a000000000000000000003',
  section: '65a000000000000000000004',
};

function fact(overrides: Record<string, unknown> = {}) {
  return {
    entityId: ids.entity,
    field: 'contact.linkedin_url',
    value: 'https://www.LinkedIn.com/in/Exact-Path',
    normalizedValue: 'linkedin.com/in/exact-path',
    valueType: 'url' as const,
    status: 'active' as const,
    qualifiers: {},
    sourceDocumentId: ids.document,
    sourceSectionId: ids.section,
    sourceText: 'LinkedIn: https://www.LinkedIn.com/in/Exact-Path',
    confidence: 0.99,
    ...overrides,
  };
}

test('uses a stable source-scoped key to prevent duplicate fact extraction', () => {
  assert.equal(knowledgeFactDedupeKey(fact()), knowledgeFactDedupeKey(fact({ sourceText: 'Different whitespace does not create a new fact.' })));
  assert.notEqual(knowledgeFactDedupeKey(fact()), knowledgeFactDedupeKey(fact({ sourceSectionId: '65a000000000000000000005' })));
});

test('preserves exact URLs instead of normalizing the stored value', () => {
  const parsed = knowledgeFactInputSchema.parse(fact());
  assert.equal(parsed.value, 'https://www.LinkedIn.com/in/Exact-Path');
  assert.equal(parsed.normalizedValue, 'linkedin.com/in/exact-path');
});

test('allows multiple atomic facts with the same dynamic field', () => {
  const first = knowledgeFactInputSchema.parse(fact({ field: 'education.degree', value: 'Bachelor of Commerce', normalizedValue: 'bachelor of commerce' }));
  const second = knowledgeFactInputSchema.parse(fact({ field: 'education.degree', value: 'Master of Computer Application', normalizedValue: 'master of computer application' }));
  assert.notEqual(knowledgeFactDedupeKey(first), knowledgeFactDedupeKey(second));
});

test('validates a source-mapped dynamic relationship', () => {
  const relation = knowledgeRelationshipInputSchema.parse({
    subjectEntityId: ids.entity,
    relation: 'BUILT_FOR',
    objectEntityId: ids.entityTwo,
    qualifiers: { role: 'lead' },
    sourceDocumentId: ids.document,
    sourceSectionId: ids.section,
    confidence: 0.91,
  });
  assert.equal(relation.relation, 'BUILT_FOR');
  assert.ok(knowledgeRelationshipDedupeKey(relation).includes(ids.section));
});

test('accepts unknown future fields without a resume-specific enum', () => {
  const parsed = knowledgeFactInputSchema.parse(fact({ field: 'policy.return_window_days', value: 30, normalizedValue: '30', valueType: 'number' }));
  assert.equal(parsed.field, 'policy.return_window_days');
  assert.equal(parsed.value, 30);
});
