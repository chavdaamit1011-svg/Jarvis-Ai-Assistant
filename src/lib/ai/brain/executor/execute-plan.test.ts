import assert from 'node:assert/strict';
import test from 'node:test';
import { CapabilityRegistry } from './capability-registry';
import { createDefaultCapabilityRegistry, executePlan } from './index';
import type { CapabilityHandler, ExecutionPlan } from './executor-types';

const base = (capability: ExecutionPlan['capability']): ExecutionPlan => ({ capability, operation: 'test', entities: [], requestedFields: [], arguments: {}, responseLanguage: 'en', requiresCurrentInformation: false, requiresKnowledge: capability === 'knowledge', missingInformation: [], clarificationQuestion: null, confidence: 1 });
const context = { requestId: 'test', assistantMode: 'knowledge_hybrid' };

test('selects registered adapters by planned capability', async () => {
  const registry = createDefaultCapabilityRegistry({ knowledge: async (plan) => ({ status: 'success', capability: plan.capability, answerSource: 'knowledge_graph', data: 'knowledge', supportedFacts: [], sources: [], conflicts: [], fallbackAllowed: false, fallbackReason: null, errorCode: null, traceMetadata: {} }), general_ai: async (plan) => ({ status: 'success', capability: plan.capability, answerSource: 'general_ai', data: 'groq', supportedFacts: [], sources: [], conflicts: [], fallbackAllowed: false, fallbackReason: null, errorCode: null, traceMetadata: {} }) });
  assert.equal((await executePlan(base('knowledge'), context, registry)).answerSource, 'knowledge_graph');
  assert.equal((await executePlan(base('general_ai'), context, registry)).answerSource, 'general_ai');
});
test('utility with complete arguments uses the Utility handler', async () => {
  const registry = createDefaultCapabilityRegistry();
  const plan = { ...base('utility'), arguments: { action: 'gst', amount: 1800, percentage: 18 } };
  const result = await executePlan(plan, context, registry);
  assert.equal(result.status, 'success');
  assert.equal(result.answerSource, 'tool');
});
test('utility with a missing percentage clarifies and web/file are unavailable', async () => {
  const registry = createDefaultCapabilityRegistry();
  const incompleteUtility = { ...base('utility'), arguments: { action: 'gst', amount: 1800 } };
  assert.equal((await executePlan(incompleteUtility, context, registry)).status, 'clarification');
  assert.equal((await executePlan(base('web_search'), context, registry)).status, 'unavailable');
  assert.equal((await executePlan(base('file'), context, registry)).status, 'unavailable');
});
test('rejects duplicate and disabled handlers', () => {
  const registry = new CapabilityRegistry();
  const handler: CapabilityHandler = { capability: 'utility', timeout: 1, enabled: false, canHandle: () => true, execute: async () => { throw new Error('no'); } };
  registry.register(handler);
  assert.throws(() => registry.register(handler));
  assert.throws(() => registry.get('utility'));
});
test('returns safe timeout and abort failures', async () => {
  const slow: CapabilityHandler = { capability: 'general_ai', timeout: 1, enabled: true, canHandle: () => true, execute: async (plan) => new Promise((resolve) => setTimeout(() => resolve({ status: 'success', capability: plan.capability, answerSource: 'general_ai', data: null, supportedFacts: [], sources: [], conflicts: [], fallbackAllowed: false, fallbackReason: null, errorCode: null, traceMetadata: {} }), 20)) };
  const timed = new CapabilityRegistry().register(slow);
  assert.equal((await executePlan(base('general_ai'), context, timed)).errorCode, 'TIMEOUT');
  const controller = new AbortController(); controller.abort();
  assert.equal((await executePlan(base('general_ai'), { ...context, abortSignal: controller.signal }, timed)).errorCode, 'ABORTED');
});
