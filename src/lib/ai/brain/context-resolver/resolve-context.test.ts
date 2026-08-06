import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveConversationContext } from './resolve-context';

const entity = { type: 'person', name: 'Nora Vela' };
const base = { recentMessages: [], activeEntities: [entity] };

test('keeps direct entity requests standalone', () => {
  const result = resolveConversationContext({ ...base, currentQuery: 'Tell me about Nora education' });
  assert.equal(result.requiresClarification, false); assert.ok(result.requestedAttributes.includes('education'));
});
test('resolves a pronoun follow-up with one active entity', () => {
  const result = resolveConversationContext({ ...base, currentQuery: 'uske projects batao' });
  assert.equal(result.requiresClarification, false); assert.match(result.standaloneQuery, /^Nora Vela /); assert.ok(result.requestedAttributes.includes('projects'));
});
test('normalizes changed wording to the same semantic attribute', () => {
  const result = resolveConversationContext({ ...base, currentQuery: 'vo konsi college me the?' });
  assert.equal(result.informationNeed, 'education');
});
test('asks only when references are ambiguous or unsupported', () => {
  const ambiguous = resolveConversationContext({ currentQuery: 'their projects', recentMessages: [], activeEntities: [entity, { type: 'organization', name: 'Blue Harbor' }] });
  assert.equal(ambiguous.requiresClarification, true);
  const unknown = resolveConversationContext({ currentQuery: 'uski skills', recentMessages: [], activeEntities: [] });
  assert.equal(unknown.requiresClarification, true);
});
test('supports no-context and mixed-language follow-ups safely', () => {
  const direct = resolveConversationContext({ currentQuery: 'binary search explain karo', recentMessages: [], activeEntities: [] });
  assert.equal(direct.requiresClarification, false);
  const mixed = resolveConversationContext({ ...base, currentQuery: 'uski education explain please' });
  assert.equal(mixed.requiresClarification, false); assert.match(mixed.standaloneQuery, /^Nora Vela /);
});
