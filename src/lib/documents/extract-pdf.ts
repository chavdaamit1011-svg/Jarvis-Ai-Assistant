import 'server-only';
import { extractText, getDocumentProxy } from 'unpdf';
import type { ExtractedDocument } from './types';
export async function extractPdf(buffer: Buffer): Promise<ExtractedDocument> { try { const pdf = await getDocumentProxy(new Uint8Array(buffer)); const extracted = await extractText(pdf, { mergePages: false }); const content = extracted.text.join('\n\n').trim(); if (!content) throw new Error('empty'); return { content, method: 'unpdf.extractText', pageCount: extracted.totalPages }; } catch (error) { if (error instanceof Error && error.message === 'empty') throw new Error('This PDF appears to contain images instead of extractable text. OCR is not enabled yet.'); throw new Error('This PDF could not be read. It may be encrypted or corrupted.'); } }
