import 'server-only';
import mammoth from 'mammoth';
import type { ExtractedDocument } from './types';
export async function extractDocx(buffer: Buffer): Promise<ExtractedDocument> { try { const result = await mammoth.extractRawText({ buffer }); const content = result.value.replace(/\r\n/g, '\n').trim(); if (!content) throw new Error('This DOCX file has no readable text.'); return { content, method: 'mammoth.extractRawText' }; } catch { throw new Error('This DOCX file could not be read.'); } }
