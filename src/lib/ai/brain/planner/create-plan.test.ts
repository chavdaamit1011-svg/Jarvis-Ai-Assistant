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
