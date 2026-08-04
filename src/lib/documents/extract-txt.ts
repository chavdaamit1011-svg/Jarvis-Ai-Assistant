import 'server-only';
import type { ExtractedDocument } from './types';
export function extractTxt(buffer: Buffer): ExtractedDocument { const content = new TextDecoder('utf-8', { fatal: true }).decode(buffer).replace(/\r\n/g, '\n').trim(); if (!content || /\x00/.test(content)) throw new Error('This text file has no readable text.'); return { content, method: 'utf-8' }; }
