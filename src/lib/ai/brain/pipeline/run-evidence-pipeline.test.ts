import assert from 'node:assert/strict';
import test from 'node:test';
import { CapabilityRegistry } from '../executor';
import type { CapabilityHandler, ExecutionPlan } from '../executor';
import { runEvidencePipeline } from './run-evidence-pipeline';
import { compareEvidencePipeline, isEvidenceShadowModeEnabled } from './pipeline-comparison';
import { buildEvidence } from '@/lib/ai/evidence-builder';
import { composeDeterministically } from '@/lib/ai/answer';
import { normalizeRequestedField } from '@/lib/ai/query-understanding/field-normalization';

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

const rawResume = `Nora Vela is a Flutter developer focused on mobile applications.\nSKILLS\nFlutter, Firebase, Dart, Node.js\nEDUCATION\nBachelor of Computer Applications, BlueOrbit University, 2020 - 2023.\nCERTIFICATION\nCompleted mobile development course.\nPROJECTS\nCreated OrbitPay application using Flutter and Firebase.\nRAW_RESUME_MARKER_DO_NOT_RENDER`;
const resumeResult = () => ({ capability: 'knowledge' as const, answerSource: 'rag' as const, data: null, supportedFacts: [rawResume], sources: [{ documentId: 'neel-doc', chunkId: 'neel-chunk', documentTitle: 'Neel profile', chunkIndex: 0, content: rawResume }], conflicts: [], traceMetadata: { confidence: 0.9, language: 'English' } });

test('profile summary is short and does not render the raw resume chunk', () => {
  const evidence = buildEvidence(resumeResult(), { requestedFields: ['summary'] });
  const answer = composeDeterministically({ userQuery: 'Tell me about Nora', plan: plan('knowledge', ['summary']), evidence });
  assert.match(answer.text, /Flutter developer/i);
  assert.doesNotMatch(answer.text, /RAW_RESUME_MARKER|Bachelor of Computer Applications|OrbitPay/i);
});

test('study and university requests keep education evidence only', () => {
  const evidence = buildEvidence(resumeResult(), { requestedFields: ['education'] });
  const answer = composeDeterministically({ userQuery: 'Which university did Nora attend?', plan: plan('knowledge', ['education']), evidence });
  assert.match(answer.text, /BlueOrbit University/i);
  assert.match(answer.text, /Bachelor of Computer Applications/i);
  assert.doesNotMatch(answer.text, /Flutter, Firebase|OrbitPay|RAW_RESUME_MARKER/i);
});

test('supported education is never marked unavailable', () => {
  const evidence = buildEvidence(resumeResult(), { requestedFields: ['education'] });
  const answer = composeDeterministically({ userQuery: 'Where did Nora study?', plan: plan('knowledge', ['education']), evidence });
  assert.ok(evidence.facts.length > 0);
  assert.doesNotMatch(answer.text, /does not contain supported|available nahi/i);
});

test('study and attendance wording resolve to the canonical education field', () => {
  assert.deepEqual(normalizeRequestedField('Where did this person study?').requestedFields, ['education']);
  assert.deepEqual(normalizeRequestedField('Which university did they attend?').requestedFields, ['education']);
});

test('no final answer contains a complete raw chunk', () => {
  const education = composeDeterministically({ userQuery: 'Education', plan: plan('knowledge', ['education']), evidence: buildEvidence(resumeResult(), { requestedFields: ['education'] }) });
  const summary = composeDeterministically({ userQuery: 'Profile', plan: plan('knowledge', ['summary']), evidence: buildEvidence(resumeResult(), { requestedFields: ['summary'] }) });
  assert.ok(education.text.length < rawResume.length / 2);
  assert.ok(summary.text.length < rawResume.length / 2);
  assert.doesNotMatch(`${education.text}\n${summary.text}`, /RAW_RESUME_MARKER/);
});
