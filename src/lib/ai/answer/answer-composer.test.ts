import assert from 'node:assert/strict';
import test from 'node:test';
import { composeAnswer } from './answer-composer';
import type { AnswerInput } from './answer-types';

const input = (fields: string[], facts: string[], overrides: Partial<AnswerInput['evidence']> = {}): AnswerInput => ({ userQuery: 'test', plan: { capability: 'knowledge', operation: 'answer', entities: [], requestedFields: fields, arguments: {}, responseLanguage: 'English', requiresCurrentInformation: false, requiresKnowledge: true, missingInformation: [], clarificationQuestion: null, confidence: 1 }, evidence: { source: 'knowledge', confidence: 1, language: 'English', facts, urls: [], citations: [], rawChunks: [], metadata: {}, warnings: [], ...overrides } });

test('formats only supported education facts', async () => {
  const answer = await composeAnswer(input(['education'], ['Bachelor of Commerce', 'Monark University', '2021-2024']));
  assert.match(answer.text, /Bachelor of Commerce/); assert.doesNotMatch(answer.text, /developer/i);
});
test('formats only supported projects and never derives projects from skills', async () => {
  const projects = await composeAnswer(input(['projects'], ['E-Commerce (Sugar Cosmetics): responsive storefront', 'E-Commerce (The Dark Store): Node.js project', 'Node.js, React.js']));
  assert.match(projects.text, /Sugar Cosmetics/); assert.match(projects.text, /Dark Store/); assert.doesNotMatch(projects.text, /^- Node\.js/m);
  const noProjects = await composeAnswer(input(['projects'], ['Node.js, React.js, MongoDB']));
  assert.match(noProjects.text, /does not contain supported project information/i);
});
test('preserves exact URL and utility result', async () => {
  const url = await composeAnswer(input(['linkedin_url'], [], { urls: ['https://www.linkedin.com/in/example/'] }));
  assert.equal(url.text, 'https://www.linkedin.com/in/example/');
  const utility = await composeAnswer(input([], ['1800', '18'], { source: 'utility', metadata: { toolResult: { explanation: 'GST amount is 324; total is 2124.' } } }));
  assert.equal(utility.text, 'GST amount is 324; total is 2124.');
});
test('uses the response language for unavailable knowledge', async () => {
  const english = await composeAnswer(input(['projects'], []));
  assert.match(english.text, /Uploaded knowledge/i);
  const hinglish = await composeAnswer({ ...input(['projects'], []), plan: { ...input(['projects'], []).plan, responseLanguage: 'Hinglish' } });
  assert.match(hinglish.text, /available nahi hai/i);
});
