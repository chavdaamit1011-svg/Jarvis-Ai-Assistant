import assert from 'node:assert/strict';
import test from 'node:test';
import { CapabilityRegistry } from '../executor';
import type { CapabilityHandler, ExecutionPlan } from '../executor';
import { runEvidencePipeline } from './run-evidence-pipeline';
import { compareEvidencePipeline, isEvidenceShadowModeEnabled } from './pipeline-comparison';

const plan = (capability: ExecutionPlan['capability'], fields: string[] = []): ExecutionPlan => ({ capability, operation: 'answer', entities: [], requestedFields: fields, arguments: {}, responseLanguage: 'English', requiresCurrentInformation: false, requiresKnowledge: capability === 'knowledge', missingInformation: [], clarificationQuestion: null, confidence: 1 });
const context = { requestId: 'pipeline-test', assistantMode: 'knowledge_hybrid' };
const knowledgeHandler = (): CapabilityHandler => ({ capability: 'knowledge', timeout: 100, enabled: true, canHandle: () => true, execute: async (value) => ({ status: 'success', capability: value.capability, answerSource: 'knowledge_graph', data: null, supportedFacts: ['Bachelor of Commerce', 'Monark University', '2021-2024'], sources: [{ documentId: 'd1', chunkId: 'c1', documentTitle: 'Resume', chunkIndex: 0 }], conflicts: [], fallbackAllowed: false, fallbackReason: null, errorCode: null, traceMetadata: { confidence: 1, language: 'English' } }) });

test('accepts grounded knowledge and marks unsupported old output as improved', async () => {
  const registry = new CapabilityRegistry().register(knowledgeHandler());
  const result = await runEvidencePipeline({ userQuery: 'Education', plan: plan('knowledge', ['education']), context, registry });
  assert.equal(result.status, 'success'); assert.equal(result.validationResult?.decision, 'accept');
  const comparison = compareEvidencePipeline({ oldAnswerSource: 'rag', oldAnswerPreview: 'They may have built microservices projects.', pipeline: result });
  assert.equal(comparison.overallStatus, 'improved');
});
test('returns safe unavailable candidate when knowledge is missing', async () => {
  const unavailable: CapabilityHandler = { capability: 'knowledge', timeout: 100, enabled: true, canHandle: () => true, execute: async (value) => ({ status: 'unavailable', capability: value.capability, answerSource: 'knowledge_graph', data: null, supportedFacts: [], sources: [], conflicts: [], fallbackAllowed: true, fallbackReason: 'none', errorCode: null, traceMetadata: {} }) };
  const result = await runEvidencePipeline({ userQuery: 'Projects', plan: plan('knowledge', ['projects']), context, registry: new CapabilityRegistry().register(unavailable) });
  assert.equal(result.status, 'unavailable'); assert.match(result.finalCandidateAnswer, /Uploaded knowledge/i);
});
test('preserves utility result and removes unsupported project claims', async () => {
  const utility: CapabilityHandler = { capability: 'utility', timeout: 100, enabled: true, canHandle: () => true, execute: async (value) => ({ status: 'success', capability: value.capability, answerSource: 'tool', data: { explanation: 'GST amount is 324; total is 2124.', metadata: { amount: 1800, percentage: 18 } }, supportedFacts: [], sources: [], conflicts: [], fallbackAllowed: false, fallbackReason: null, errorCode: null, traceMetadata: {} }) };
  const result = await runEvidencePipeline({ userQuery: 'GST', plan: { ...plan('utility'), arguments: { action: 'gst', amount: 1800, percentage: 18 } }, context, registry: new CapabilityRegistry().register(utility) });
  assert.equal(result.finalCandidateAnswer, 'GST amount is 324; total is 2124.');
  const projects = await runEvidencePipeline({ userQuery: 'Projects', plan: plan('knowledge', ['projects']), context, registry: new CapabilityRegistry().register(knowledgeHandler()) });
  assert.doesNotMatch(projects.finalCandidateAnswer, /microservices/i);
});
test('shadow-mode gate defaults to disabled', () => {
  assert.equal(isEvidenceShadowModeEnabled('false'), false); assert.equal(isEvidenceShadowModeEnabled('true'), true);
});
