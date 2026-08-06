import assert from 'node:assert/strict';
import test from 'node:test';
import { ConversationEntityManager } from './entity-manager';

test('tracks one active entity by default and resolves references', () => {
  const manager = new ConversationEntityManager();
  manager.setActiveEntity('c1', { id: 'e1', name: 'Nora Vela', type: 'person' }, { aliases: ['Nora'] });
  assert.equal(manager.getActiveEntity('c1')?.name, 'Nora Vela');
  const result = manager.resolvePronouns('c1', 'uske projects batao');
  assert.equal(result.resolved, true); assert.match(result.resolvedQuery, /^Nora Vela /);
});
test('replaces a single active entity and clears it', () => {
  const manager = new ConversationEntityManager();
  manager.setActiveEntity('c1', { name: 'Nora Vela', type: 'person' });
  manager.setActiveEntity('c1', { name: 'Blue Harbor', type: 'company' });
  assert.equal(manager.getActiveEntity('c1')?.name, 'Blue Harbor');
  manager.clearActiveEntity('c1'); assert.equal(manager.getActiveEntity('c1'), null);
});
test('does not guess when multi-entity mode is active or context is absent', () => {
  const manager = new ConversationEntityManager();
  assert.equal(manager.resolvePronouns('c1', 'their work').reason, 'no_active_entity');
  manager.setActiveEntity('c1', { name: 'Nora Vela', type: 'person' });
  manager.setActiveEntity('c1', { name: 'Blue Harbor', type: 'company' }, { multiEntityMode: true });
  assert.equal(manager.resolvePronouns('c1', 'their work').reason, 'ambiguous');
});
