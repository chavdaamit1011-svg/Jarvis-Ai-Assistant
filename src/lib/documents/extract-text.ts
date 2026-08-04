import 'server-only';
import { extractDocx } from './extract-docx'; import { extractPdf } from './extract-pdf'; import { extractTxt } from './extract-txt'; import type { ExtractedDocument, ValidatedFile } from './types';
export async function extractText(file: ValidatedFile): Promise<ExtractedDocument> { if (file.type === 'pdf') return extractPdf(file.buffer); if (file.type === 'docx') return extractDocx(file.buffer); return extractTxt(file.buffer); }
