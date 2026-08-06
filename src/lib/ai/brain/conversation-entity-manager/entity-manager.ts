import type { ActiveConversationEntity, ConversationEntityType, PronounResolution, SetActiveEntityOptions } from './entity-types';

const DEFAULT_PRONOUNS = ['he', 'his', 'him', 'she', 'her', 'they', 'their', 'it', 'vo', 'wo', 'uska', 'uski', 'uske', 'ye', 'iski', 'iske'];
const REFERENCE_PATTERN = new RegExp(`\\b(?:${DEFAULT_PRONOUNS.join('|')})\\b`, 'giu');

function cleanNames(values: string[]) { return [...new Set(values.map((value) => value.trim()).filter(Boolean))]; }
function debug(event: string, entity: ActiveConversationEntity | null, query?: string) {
  if (process.env.NODE_ENV !== 'production') console.info('[ConversationEntityManager]', { event, activeEntity: entity?.name ?? null, entityType: entity?.type ?? null, resolvedQuery: query });
}

/**
 * In-memory, conversation-scoped entity state. Persistence is deliberately
 * left to the conversation store integration, rather than hidden in this
 * manager, so the API stays usable with MongoDB or another backend later.
 */
export class ConversationEntityManager {
  private readonly entities = new Map<string, ActiveConversationEntity[]>();

  setActiveEntity(conversationId: string, input: { id?: string; name: string; type: ConversationEntityType }, options: SetActiveEntityOptions = {}) {
    const entity: ActiveConversationEntity = { id: input.id, name: input.name.trim(), type: input.type, aliases: cleanNames([input.name, ...(options.aliases ?? [])]), pronouns: cleanNames(options.pronouns ?? DEFAULT_PRONOUNS), timestamp: (options.timestamp ?? new Date()).toISOString() };
    if (!entity.name) throw new Error('An active entity name is required.');
    const existing = this.entities.get(conversationId) ?? [];
    const next = options.multiEntityMode ? [...existing.filter((item) => (entity.id && item.id ? item.id !== entity.id : item.name.toLowerCase() !== entity.name.toLowerCase())), entity] : [entity];
    this.entities.set(conversationId, next);
    debug('setActiveEntity', entity);
    return entity;
  }

  getActiveEntity(conversationId: string) {
    const entities = this.entities.get(conversationId) ?? [];
    return entities.length === 1 ? entities[0] : null;
  }

  clearActiveEntity(conversationId: string) { this.entities.delete(conversationId); debug('clearActiveEntity', null); }

  resolvePronouns(conversationId: string, query: string): PronounResolution {
    const references = [...query.matchAll(REFERENCE_PATTERN)];
    if (!references.length) return { query, resolvedQuery: query, entity: null, resolved: false, reason: 'no_reference' };
    const entities = this.entities.get(conversationId) ?? [];
    if (!entities.length) { debug('resolvePronouns:no_active_entity', null, query); return { query, resolvedQuery: query, entity: null, resolved: false, reason: 'no_active_entity' }; }
    if (entities.length > 1) { debug('resolvePronouns:ambiguous', null, query); return { query, resolvedQuery: query, entity: null, resolved: false, reason: 'ambiguous' }; }
    const entity = entities[0];
    const resolvedQuery = `${entity.name} ${query}`;
    debug('resolvePronouns:resolved', entity, resolvedQuery);
    return { query, resolvedQuery, entity, resolved: true, reason: 'resolved' };
  }
}

export const conversationEntityManager = new ConversationEntityManager();
