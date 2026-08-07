export type ReferenceResultItem = {
  id?: string;
  name: string;
  type: 'person' | 'company' | 'organization' | 'product' | 'project' | 'other';
};

export type ConversationReferenceState = {
  activeEntityIds: string[];
  activeEntityName: string | null;
  activeResultSet: ReferenceResultItem[];
  selectedEntityIds: string[];
  selectedEntityNames: string[];
  lastOperation: string | null;
  lastConcept: string | null;
  lastProjection: string[];
  lastMentionedEntities: ReferenceResultItem[];
  updatedAt: string;
};

export type ReferenceResolution = {
  query: string;
  resolvedQuery: string;
  resolvedReferences: string[];
  selectedEntities: ReferenceResultItem[];
  requiresClarification: boolean;
  clarificationQuestion: string | null;
  method: 'none' | 'result_set' | 'positional' | 'remaining' | 'selected_entity' | 'missing_context';
};
