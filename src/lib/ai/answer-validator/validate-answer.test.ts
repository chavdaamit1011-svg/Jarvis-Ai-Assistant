import assert from 'node:assert/strict';
import test from 'node:test';
import { validateAnswer } from './validate-answer';
import type { AnswerValidationInput } from './validator-types';

const make = (overrides: Partial<AnswerValidationInput> = {}): AnswerValidationInput => ({ plan: { capability: 'knowledge', operation: 'answer', entities: [], requestedFields: ['education'], arguments: {}, responseLanguage: 'English', requiresCurrentInformation: false, requiresKnowledge: true, missingInformation: [], clarificationQuestion: null, confidence: 1 }, evidence: { source: 'knowledge', confidence: 1, language: 'English', facts: ['Bachelor of Commerce', 'Monark University', '2021-2024'], urls: [], citations: [{ documentId: 'd1', chunkId: 'c1' }], rawChunks: [], metadata: {}, warnings: [] }, composedAnswer: { text: '- Bachelor of Commerce\n- Monark University\n- 2021-2024', answerSource: 'knowledge', usedFacts: [], usedUrls: [], citations: [{ documentId: 'd1', chunkId: 'c1' }], confidence: 1, warnings: [], language: 'English' }, ...overrides });

test('accepts a grounded answer', () => assert.equal(validateAnswer(make()).decision, 'accept'));
test('repairs invented projects and education', () => {
  const project = make({ plan: { ...make().plan, requestedFields: ['projects'] }, composedAnswer: { ...make().composedAnswer, text: 'Amit built microservices projects.' } });
  assert.equal(validateAnswer(project).decision, 'repair');
  const degree = make({ composedAnswer: { ...make().composedAnswer, text: 'Amit completed B.Tech and has AWS certification.' } });
  assert.equal(validateAnswer(degree).decision, 'repair');
});
test('repairs changed exact URL, language, utility, and duplicates', () => {
  const url = make({ plan: { ...make().plan, requestedFields: ['linkedin_url'] }, evidence: { ...make().evidence, urls: ['https://example.com/a'] }, composedAnswer: { ...make().composedAnswer, text: 'https://example.com/b' } });
  assert.equal(validateAnswer(url).decision, 'repair');
  const language = make({ composedAnswer: { ...make().composedAnswer, language: 'Hinglish' } }); assert.equal(validateAnswer(language).decision, 'repair');
  const utility = make({ plan: { ...make().plan, capability: 'utility' }, evidence: { ...make().evidence, source: 'utility', metadata: { toolResult: { explanation: 'GST is 324.' } } }, composedAnswer: { ...make().composedAnswer, text: 'GST is 325.', citations: [] } }); assert.equal(validateAnswer(utility).decision, 'repair');
  const duplicate = make({ composedAnswer: { ...make().composedAnswer, text: '- Bachelor of Commerce\n- Bachelor of Commerce' } }); assert.equal(validateAnswer(duplicate).decision, 'repair');
});
test('rejects missing sources, fake general citations, and empty answer', () => {
  const missing = make({ composedAnswer: { ...make().composedAnswer, citations: [] } }); assert.equal(validateAnswer(missing).decision, 'reject');
  const general = make({ evidence: { ...make().evidence, source: 'general' }, composedAnswer: { ...make().composedAnswer, citations: [{ documentId: 'fake' }] } }); assert.equal(validateAnswer(general).decision, 'reject');
  const empty = make({ composedAnswer: { ...make().composedAnswer, text: '' } }); assert.equal(validateAnswer(empty).decision, 'reject');
});
