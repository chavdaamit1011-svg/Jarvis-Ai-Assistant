export type DocumentFileType = 'pdf' | 'docx' | 'txt';
export interface ValidatedFile { name: string; type: DocumentFileType; mimeType: string; size: number; buffer: Buffer; }
export interface ExtractedDocument { content: string; method: string; pageCount?: number; }
