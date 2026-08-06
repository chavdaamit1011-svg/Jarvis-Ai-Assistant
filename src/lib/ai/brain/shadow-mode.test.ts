import assert from 'node:assert/strict';
import test from 'node:test';
import { runShadowComparison } from './shadow-mode';

const context = { requestId: 'shadow-test', assistantMode: 'knowledge_hybrid' };
const old = (capability: string) => ({ capability, entity: null, requestedFields: [], fallbackUsed: false });

test('records a knowledge match without invoking retrieval', async () => {
  const result = await runShadowComparison({ query: 'Example Person projects', context, oldFlow: { ...old('knowledge'), entity: 'Example Person' }, entityHints: [{ type: 'person', name: 'Example Person' }], entityAmbiguous: false, responseLanguage: 'English' });
  assert.equal(result.newBrain.capability, 'knowledge');
  assert.equal(result.comparison.capabilityMatch, true);
});
test('records old general-ai versus new knowledge mismatch', async () => {
  const result = await runShadowComparison({ query: 'Example Person projects', context, oldFlow: old('general_ai'), entityHints: [{ type: 'person', name: 'Example Person' }], entityAmbiguous: false, responseLanguage: 'English' });
  assert.equal(result.newBrain.capability, 'knowledge');
  assert.equal(result.comparison.capabilityMatch, false);
});
test('records web-search versus utility mismatch and incomplete utility clarification', async () => {
  const time = await runShadowComparison({ query: 'Current time in India', context, oldFlow: old('web_search'), entityHints: [], entityAmbiguous: false, responseLanguage: 'English' });
  assert.equal(time.newBrain.capability, 'utility');
  const gst = await runShadowComparison({ query: '1800 ka GST calculate karo', context, oldFlow: old('utility'), entityHints: [], entityAmbiguous: false, responseLanguage: 'Hinglish' });
  assert.equal(gst.newBrain.executorStatus, 'clarification');
});
