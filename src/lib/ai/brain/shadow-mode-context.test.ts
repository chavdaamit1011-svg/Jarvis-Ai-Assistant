import assert from 'node:assert/strict';
import test from 'node:test';
import { runShadowComparison } from './shadow-mode';

const input = (query: string) => ({ query, context: { requestId: 'context-shadow', assistantMode: 'knowledge_hybrid' }, oldFlow: { capability: 'knowledge', entity: null, requestedFields: [], fallbackUsed: false }, entityHints: [], entityAmbiguous: false, responseLanguage: 'English' });

test('keeps direct standalone requests independent', async () => {
  const result = await runShadowComparison({ ...input('Explain binary search'), recentMessages: [] });
  assert.equal(result.context.failed, false); assert.equal(result.context.standaloneQuery, 'Explain binary search');
});
test('resolves a single-entity pronoun follow-up from limited recent context', async () => {
  const result = await runShadowComparison({ ...input('uske projects batao'), recentMessages: [{ role: 'user', content: 'Tell me about Nora education' }] });
  assert.match(result.context.standaloneQuery, /^Nora /); assert.equal(result.comparison.contextUsed, true);
});
test('uses context for another attribute and handles mixed language', async () => {
  const result = await runShadowComparison({ ...input('uski skills explain please'), recentMessages: [{ role: 'user', content: 'Nora education details' }] });
  assert.ok(result.context.requestedAttributes.includes('skills')); assert.equal(result.context.failed, false);
});
test('does not guess when two entities are active or no context exists', async () => {
  const multiple = await runShadowComparison({ ...input('their projects'), entityHints: [{ type: 'person', name: 'Nora Vela' }, { type: 'organization', name: 'Blue Harbor' }] });
  assert.equal(multiple.newBrain.capability, 'clarification');
  const none = await runShadowComparison({ ...input('uski education'), recentMessages: [] });
  assert.equal(none.newBrain.capability, 'clarification');
});
test('falls back to the original query when the context resolver times out', async () => {
  const result = await runShadowComparison({ ...input('Explain binary search'), contextTimeoutMs: 1, contextResolver: () => new Promise(() => undefined) });
  assert.equal(result.context.failed, true); assert.equal(result.context.standaloneQuery, 'Explain binary search');
});
