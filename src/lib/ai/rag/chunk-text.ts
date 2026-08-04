import { RAG_CONFIG } from './rag-config';
import type { TextChunk } from './rag-types';

export function cleanKnowledgeText(text: string) {
  return text.replace(/\r\n/g, '\n').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

export function chunkText(text: string, options: Partial<{ chunkCharacters: number; overlapCharacters: number }> = {}): TextChunk[] {
  const cleaned = cleanKnowledgeText(text);
  const size = options.chunkCharacters ?? RAG_CONFIG.chunkCharacters;
  const overlap = options.overlapCharacters ?? RAG_CONFIG.chunkOverlapCharacters;
  if (!cleaned) throw new Error('Knowledge content must not be empty.');
  if (cleaned.length > RAG_CONFIG.maxDocumentCharacters) throw new Error(`Knowledge content must be ${RAG_CONFIG.maxDocumentCharacters} characters or fewer.`);
  if (size < 200 || overlap < 0 || overlap >= size) throw new Error('Invalid chunk configuration.');
  const paragraphs = cleaned.split(/\n\n+/); const pieces: string[] = []; let current = '';
  for (const paragraph of paragraphs) {
    if (paragraph.length > size) {
      if (current) { pieces.push(current); current = ''; }
      for (let start = 0; start < paragraph.length; start += size - overlap) pieces.push(paragraph.slice(start, start + size));
      continue;
    }
    const proposed = current ? `${current}\n\n${paragraph}` : paragraph;
    if (proposed.length > size && current) { pieces.push(current); current = paragraph; } else current = proposed;
  }
  if (current) pieces.push(current);
  if (pieces.length > RAG_CONFIG.maxChunksPerDocument) throw new Error('Document creates too many chunks. Reduce its length.');
  return pieces.map((content, chunkIndex) => ({ chunkIndex, content, characterCount: content.length, estimatedTokenCount: Math.ceil(content.length / 4) }));
}
