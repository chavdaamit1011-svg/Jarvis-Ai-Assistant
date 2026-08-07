import assert from 'node:assert/strict';
import test from 'node:test';
import { ConversationReferenceManager } from './reference-manager';

const projects = [
  { id: 'p1', name: 'OrbitPay', type: 'project' as const },
  { id: 'p2', name: 'Harbor Shop', type: 'project' as const },
  { id: 'p3', name: 'Northstar CRM', type: 'project' as const },
];

function seeded() {
  const manager = new ConversationReferenceManager();
  manager.set('c1', { activeEntityIds: ['person-1'], activeEntityName: 'Nora Vela', activeResultSet: projects, lastOperation: 'count', lastConcept: 'projects', lastProjection: ['name'], lastMentionedEntities: projects });
  return manager;
}

test('resolves a result-set list request without inventing any ordering', () => {
  const result = seeded().resolve('c1', 'Which ones?');
  assert.equal(result.method, 'result_set');
  assert.match(result.resolvedQuery, /OrbitPay, Harbor Shop, Northstar CRM/);
});

test('resolves positional and selected-item links from the previous ordered result set', () => {
  const manager = seeded();
  const second = manager.resolve('c1', 'second one');
  assert.equal(second.method, 'positional');
  assert.deepEqual(second.selectedEntities.map((item) => item.name), ['Harbor Shop']);
  const link = manager.resolve('c1', 'its link?');
  assert.equal(link.method, 'selected_entity');
  assert.match(link.resolvedQuery, /Harbor Shop project link only/);
});

test('resolves remaining and technology selectors only against explicit prior results', () => {
  const manager = seeded();
  manager.resolve('c1', 'first one');
  const remaining = manager.resolve('c1', 'remaining?');
  assert.equal(remaining.method, 'remaining');
  assert.doesNotMatch(remaining.resolvedQuery, /OrbitPay/);
  const technology = manager.resolve('c1', 'React one?');
  assert.equal(technology.method, 'result_set');
  assert.match(technology.resolvedQuery, /uses React/);
});

test('asks for clarification when no ordered result set exists', () => {
  const result = new ConversationReferenceManager().resolve('empty', 'second one');
  assert.equal(result.requiresClarification, true);
  assert.equal(result.method, 'missing_context');
});

test('restores persisted state after a reload', () => {
  const first = seeded();
  const restored = new ConversationReferenceManager();
  restored.restore('c1', first.get('c1'));
  assert.equal(restored.resolve('c1', 'last one').selectedEntities[0]?.name, 'Northstar CRM');
});
