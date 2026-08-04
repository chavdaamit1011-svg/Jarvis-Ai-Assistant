export type KnowledgeVisibility = 'private' | 'public';

export interface TextChunk { chunkIndex: number; content: string; characterCount: number; estimatedTokenCount: number; }
export interface RetrievedChunk { chunkId: string; documentId: string; documentTitle: string; content: string; score: number; chunkIndex: number; visibility: KnowledgeVisibility; }
export interface RetrievedContext { chunks: RetrievedChunk[]; context: string; }
