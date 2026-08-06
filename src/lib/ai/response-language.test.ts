import assert from 'node:assert/strict';
import test from 'node:test';
import { detectResponseLanguage, formatKnowledgeFacts } from './response-language';

test('detects English entity questions', () => {
  for (const query of ['Who is Example?', 'What does Example do?', "Tell me about Example's education"]) {
    assert.equal(detectResponseLanguage(query).detectedLanguage, 'english');
  }
});

test('detects Hinglish and Devanagari Hindi', () => {
  assert.equal(detectResponseLanguage('Example kon hai?').detectedLanguage, 'hinglish');
  assert.equal(detectResponseLanguage('Example ki education batao').detectedLanguage, 'hinglish');
  assert.equal(detectResponseLanguage('उदाहरण कौन है?').detectedLanguage, 'hindi');
});

test('detects Gujarati Roman and preserves exact technical values', () => {
  const detected = detectResponseLanguage('Example shu kare chhe?');
  assert.equal(detected.detectedLanguage, 'gujarati_roman');
  assert.equal(formatKnowledgeFacts({ language: detected.detectedLanguage, kind: 'technology', entity: 'Example', values: ['Next.js', 'MongoDB'] }), 'Example Next.js ane MongoDB sathe kaam kare chhe.');
});

test('formats English graph facts in English', () => {
  assert.equal(formatKnowledgeFacts({ language: 'english', kind: 'owner', entity: 'Example', target: 'Sample AI' }), 'Example is the owner of Sample AI.');
});
