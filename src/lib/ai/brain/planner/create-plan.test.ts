import assert from 'node:assert/strict';
import test from 'node:test';
import { createPlan } from './create-plan';

const knowledgeQueries = [
  'who is amit',
  'tell me about amit education',
  'amit skills',
  'amit portfolio',
  'amit projects',
  'education of amit',
  'amit ki padhai',
];

test('obvious entity-field knowledge requests consistently select knowledge', async () => {
  for (const query of knowledgeQueries) {
    const plan = await createPlan({ query });
    assert.equal(plan.capability, 'knowledge', query);
    const knowledge = plan.plannerCandidates.find((candidate) => candidate.capability === 'knowledge');
    const general = plan.plannerCandidates.find((candidate) => candidate.capability === 'general_ai');
    assert.ok(knowledge && general && knowledge.confidence > general.confidence, query);
    assert.ok(plan.plannerReasons.length > 0, query);
  }
});

test('known entity hints further increase knowledge confidence', async () => {
  const withoutHint = await createPlan({ query: 'tell me about nora education' });
  const withHint = await createPlan({ query: 'tell me about nora education', entityHints: [{ type: 'person', name: 'Nora Vela' }] });
  assert.equal(withHint.capability, 'knowledge');
  assert.ok(withHint.confidence > withoutHint.confidence);
});

test('creates one canonical semantic plan for equivalent request shapes', async () => {
  const hint = [{ type: 'person', name: 'Nora Vela', id: 'nora' }];
  const count = await createPlan({ query: 'How many projects does Nora Vela have?', entityHints: hint });
  const countMixed = await createPlan({ query: 'Nora Vela ke kitne projects hai?', entityHints: hint });
  assert.equal(count.operation, 'count');
  assert.equal(countMixed.operation, 'count');
  assert.equal(count.concept, 'projects');

  const names = await createPlan({ query: 'Which project names belong to Nora Vela?', entityHints: hint });
  assert.equal(names.operation, 'list');
  assert.deepEqual(names.projection, ['name']);

  const urls = await createPlan({ query: 'Give Nora Vela project links only', entityHints: hint });
  assert.equal(urls.operation, 'list');
  assert.deepEqual(urls.projection, ['url']);
  assert.equal(urls.outputMode, 'only_requested_fields');

  const subset = await createPlan({ query: 'What backend technologies does Nora Vela use?', entityHints: hint });
  assert.equal(subset.concept, 'skills');
  assert.equal(subset.filters?.category, 'backend');
});

test('represents a yes/no proposition as a verification plan without database access', async () => {
  const plan = await createPlan({ query: 'Does Nora Vela live in Surat?', entityHints: [{ type: 'person', name: 'Nora Vela', id: 'nora' }] });
  assert.equal(plan.operation, 'verify');
  assert.equal(plan.concept, 'location');
  assert.deepEqual(plan.arguments.verification, {
    text: 'Does Nora Vela live in Surat', expectedValue: 'Surat', valueKind: 'scalar',
  });
});

test('represents a generic work-on relationship as a verification plan', async () => {
  const plan = await createPlan({ query: 'Does Nora Vela work on OrbitPay?', entityHints: [{ type: 'person', name: 'Nora Vela', id: 'nora' }] });
  assert.equal(plan.operation, 'verify');
  assert.equal(plan.concept, 'projects');
  assert.deepEqual(plan.arguments.verification, {
    text: 'Does Nora Vela work on OrbitPay', expectedValue: 'OrbitPay', valueKind: 'relationship',
  });
});
