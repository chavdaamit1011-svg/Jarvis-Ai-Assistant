import { RAG_CONFIG } from './rag-config';
import type { TextChunk } from './rag-types';

export function cleanKnowledgeText(text: string) {
  return text.replace(/\r\n/g, '\n')
    // PDF soft wraps: “front-\nend” is one word, while real paragraphs stay intact.
    .replace(/([\p{L}])-[ \t]*\n[ \t]*([\p{Ll}])/gu, '$1-$2')
    .replace(/[ \t]+\n/g, '\n').replace(/\n[ \t]+/g, '\n')
    .replace(/[ \t]{2,}/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

function meaningful(value: string) { return /[\p{L}\p{N}]/u.test(value) && value.replace(/[^\p{L}\p{N}]/gu, '').length >= 3; }
function splitParagraph(paragraph: string, size: number) {
  if (paragraph.length <= size) return [paragraph];
  const sentences = paragraph.match(/[^.!?]+[.!?]+(?:\s+|$)|[^.!?]+$/g)?.map((item) => item.trim()).filter(Boolean) ?? [paragraph];
  const parts: string[] = []; let current = '';
  for (const sentence of sentences) {
    const proposal = current ? `${current} ${sentence}` : sentence;
    if (proposal.length <= size) { current = proposal; continue; }
    if (current) parts.push(current);
    // A single long sentence is split only at whitespace, never through a URL.
    if (sentence.length > size) { const words = sentence.split(/\s+/); let line = ''; for (const word of words) { const next = line ? `${line} ${word}` : word; if (next.length > size && line) { parts.push(line); line = word; } else line = next; } current = line; } else current = sentence;
  }
  if (current) parts.push(current); return parts;
}

export function chunkText(text: string, options: Partial<{ chunkCharacters: number; overlapCharacters: number; minimumChunkCharacters: number }> = {}): TextChunk[] {
  const cleaned = cleanKnowledgeText(text); const size = options.chunkCharacters ?? RAG_CONFIG.chunkCharacters; const overlap = options.overlapCharacters ?? RAG_CONFIG.chunkOverlapCharacters; const minimum = options.minimumChunkCharacters ?? RAG_CONFIG.minimumChunkCharacters;
  if (!cleaned) throw new Error('Knowledge content must not be empty.'); if (cleaned.length > RAG_CONFIG.maxDocumentCharacters) throw new Error(`Knowledge content must be ${RAG_CONFIG.maxDocumentCharacters} characters or fewer.`); if (size < 200 || overlap < 0 || overlap >= size) throw new Error('Invalid chunk configuration.');
  // Keep short resumes and profiles coherent, while staying below the embedding input limit.
  const effectiveSize = cleaned.length <= RAG_CONFIG.shortDocumentCharacters ? 3_500 : size;
  const paragraphs = cleaned.split(/\n\n+/).flatMap((paragraph) => splitParagraph(paragraph.trim(), effectiveSize)).filter(meaningful);
  const pieces: string[] = []; let current = '';
  for (const paragraph of paragraphs) { const proposal = current ? `${current}\n\n${paragraph}` : paragraph; if (proposal.length > effectiveSize && current) { pieces.push(current); current = paragraph; } else current = proposal; }
  if (current) pieces.push(current);
  // Join tiny final fragments (the prior blind slicing produced “ucation.” chunks).
  const merged = pieces.reduce<string[]>((all, piece) => { if (!meaningful(piece)) return all; if (piece.length < minimum && all.length) { all[all.length - 1] = `${all[all.length - 1]}\n\n${piece}`; } else all.push(piece); return all; }, []);
  if (merged.length > RAG_CONFIG.maxChunksPerDocument) throw new Error('Document creates too many chunks. Reduce its length.');
  return merged.map((content, chunkIndex) => ({ chunkIndex, content, characterCount: content.length, estimatedTokenCount: Math.ceil(content.length / 4) }));
}
