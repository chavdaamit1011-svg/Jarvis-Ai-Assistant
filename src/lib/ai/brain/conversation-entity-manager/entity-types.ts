export type ConversationEntityType = 'person' | 'company' | 'organization' | 'product' | 'project' | 'other';
export type ActiveConversationEntity = { id?: string; name: string; type: ConversationEntityType; aliases: string[]; pronouns: string[]; timestamp: string };
export type SetActiveEntityOptions = { multiEntityMode?: boolean; aliases?: string[]; pronouns?: string[]; timestamp?: Date };
export type PronounResolution = { query: string; resolvedQuery: string; entity: ActiveConversationEntity | null; resolved: boolean; reason: 'no_reference' | 'no_active_entity' | 'resolved' | 'ambiguous' };
