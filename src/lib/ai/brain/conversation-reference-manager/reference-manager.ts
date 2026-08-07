import type { ConversationReferenceState, ReferenceResolution, ReferenceResultItem } from './reference-types';

const EMPTY = (): ConversationReferenceState => ({ activeEntityIds: [], activeEntityName: null, activeResultSet: [], selectedEntityIds: [], selectedEntityNames: [], lastOperation: null, lastConcept: null, lastProjection: [], lastMentionedEntities: [], updatedAt: new Date().toISOString() });
const POSITION = /\b(first|second|third|fourth|fifth|last)\s+(?:one|project|item)?\b/i;
const POSITION_INDEX: Record<string, number> = { first: 0, second: 1, third: 2, fourth: 3, fifth: 4 };
const LIST_REFERENCE = /\b(?:which\s+(?:one|ones)|which\s+(?:are|were)\s+they|list\s+them)\b/i;
const REMAINING_REFERENCE = /\b(?:remaining|other\s+one|the\s+other)\b/i;
const LINK_REFERENCE = /\b(?:its|his|her|their|uska|uski|uske|wo|woh|that)\s+(?:link|url|website|profile)\b|\b(?:link|url)\s+(?:of|for)\s+(?:it|that)\b/i;
const TECHNOLOGY_SELECTOR = /\b([\p{L}\p{N}.+#-]+)\s+one\b/iu;

function uniqueItems(items: ReferenceResultItem[]) {
  return [...new Map(items.filter((item) => item.name.trim()).map((item) => [`${item.type}:${item.name.toLocaleLowerCase()}`, item])).values()];
}

function selectedQuery(state: ConversationReferenceState, item: ReferenceResultItem, query: string) {
  const subject = state.activeEntityName ? `${state.activeEntityName} ` : '';
  return LINK_REFERENCE.test(query) ? `${subject}${item.name} project link only` : `Give ${subject}${item.name} project name only`;
}

/** Conversation-scoped ordered-result memory. It never invents an order: the
 * only positional selections it accepts are items explicitly returned earlier. */
export class ConversationReferenceManager {
  private readonly states = new Map<string, ConversationReferenceState>();

  restore(conversationId: string, input: Partial<ConversationReferenceState> | null | undefined) {
    if (!input) return this.get(conversationId);
    const state: ConversationReferenceState = {
      ...EMPTY(), ...input,
      activeResultSet: uniqueItems(input.activeResultSet ?? []),
      lastMentionedEntities: uniqueItems(input.lastMentionedEntities ?? []),
      selectedEntityIds: input.selectedEntityIds ?? [], selectedEntityNames: input.selectedEntityNames ?? [],
    };
    this.states.set(conversationId, state);
    return state;
  }

  get(conversationId: string) { return this.states.get(conversationId) ?? EMPTY(); }

  set(conversationId: string, input: Partial<ConversationReferenceState>) {
    const previous = this.get(conversationId);
    const state: ConversationReferenceState = {
      ...previous, ...input,
      activeResultSet: uniqueItems(input.activeResultSet ?? previous.activeResultSet),
      lastMentionedEntities: uniqueItems(input.lastMentionedEntities ?? previous.lastMentionedEntities),
      updatedAt: new Date().toISOString(),
    };
    this.states.set(conversationId, state);
    return state;
  }

  clear(conversationId: string) { this.states.delete(conversationId); }

  resolve(conversationId: string, query: string): ReferenceResolution {
    const state = this.get(conversationId);
    const resultSet = state.activeResultSet;
    const base = { query, resolvedReferences: [] as string[], selectedEntities: [] as ReferenceResultItem[], requiresClarification: false, clarificationQuestion: null, method: 'none' as const };
    const positional = query.match(POSITION);
    if (positional) {
      if (!resultSet.length) return { ...base, resolvedQuery: query, requiresClarification: true, clarificationQuestion: 'Which previous result are you referring to?', method: 'missing_context' };
      const index = positional[1].toLowerCase() === 'last' ? resultSet.length - 1 : POSITION_INDEX[positional[1].toLowerCase()];
      const item = resultSet[index];
      if (!item) return { ...base, resolvedQuery: query, requiresClarification: true, clarificationQuestion: `I only have ${resultSet.length} ordered results. Which one do you mean?`, method: 'missing_context' };
      this.set(conversationId, { selectedEntityIds: item.id ? [item.id] : [], selectedEntityNames: [item.name], lastMentionedEntities: [item] });
      return { ...base, resolvedQuery: selectedQuery(state, item, query), resolvedReferences: [positional[0]], selectedEntities: [item], method: 'positional' };
    }
    if (LIST_REFERENCE.test(query)) {
      if (!resultSet.length) return { ...base, resolvedQuery: query, requiresClarification: true, clarificationQuestion: 'Which previous results would you like me to list?', method: 'missing_context' };
      const subject = state.activeEntityName ? ` for ${state.activeEntityName}` : '';
      const concept = state.lastConcept ?? 'results';
      return { ...base, resolvedQuery: `List ${concept} names only${subject}: ${resultSet.map((item) => item.name).join(', ')}`, resolvedReferences: [query], selectedEntities: resultSet, method: 'result_set' };
    }
    if (REMAINING_REFERENCE.test(query)) {
      if (!resultSet.length) return { ...base, resolvedQuery: query, requiresClarification: true, clarificationQuestion: 'Which previous list should I use to find the remaining items?', method: 'missing_context' };
      const selected = new Set(state.selectedEntityNames.map((name) => name.toLocaleLowerCase()));
      const remaining = resultSet.filter((item) => !selected.has(item.name.toLocaleLowerCase()));
      if (!remaining.length) return { ...base, resolvedQuery: query, requiresClarification: true, clarificationQuestion: 'There are no remaining items in the previous result set.', method: 'missing_context' };
      const subject = state.activeEntityName ? ` for ${state.activeEntityName}` : '';
      const concept = state.lastConcept ?? 'results';
      return { ...base, resolvedQuery: `List ${concept} names only${subject}: ${remaining.map((item) => item.name).join(', ')}`, resolvedReferences: [query], selectedEntities: remaining, method: 'remaining' };
    }
    const technology = query.match(TECHNOLOGY_SELECTOR)?.[1];
    if (technology && resultSet.length) {
      const subject = state.activeEntityName ? `${state.activeEntityName} ` : '';
      return { ...base, resolvedQuery: `Which project of ${subject}uses ${technology} among ${resultSet.map((item) => item.name).join(', ')}?`, resolvedReferences: [technology], selectedEntities: resultSet, method: 'result_set' };
    }
    if (LINK_REFERENCE.test(query)) {
      const selectedName = state.selectedEntityNames[0];
      const item = resultSet.find((candidate) => candidate.name === selectedName) ?? state.lastMentionedEntities[0];
      if (!item) return { ...base, resolvedQuery: query, requiresClarification: true, clarificationQuestion: 'Whose link would you like?', method: 'missing_context' };
      return { ...base, resolvedQuery: selectedQuery(state, item, query), resolvedReferences: [item.name], selectedEntities: [item], method: 'selected_entity' };
    }
    return { ...base, resolvedQuery: query };
  }
}

export const conversationReferenceManager = new ConversationReferenceManager();
