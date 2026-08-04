export interface SearchDocument {
  id: string;
  title: string;
  content: string;
}

export interface SemanticSearchResult extends SearchDocument {
  score: number;
}

export class EmbeddingError extends Error {
  constructor(message: string, public readonly code: 'INPUT' | 'INITIALIZATION' | 'INFERENCE') {
    super(message);
    this.name = 'EmbeddingError';
  }
}
