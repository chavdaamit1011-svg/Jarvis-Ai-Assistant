import 'server-only';
import type { DocumentFileType, ValidatedFile } from './types';
export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
const allowed: Record<DocumentFileType, string> = { pdf: 'application/pdf', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', txt: 'text/plain' };
export async function validateUpload(file: File): Promise<ValidatedFile> { const name = file.name.replace(/[^a-zA-Z0-9._ -]/g, '_'); const extension = name.split('.').pop()?.toLowerCase(); if (!extension || !['pdf', 'docx', 'txt'].includes(extension)) throw new Error('Only PDF, DOCX, and TXT files are supported.'); const type = extension as DocumentFileType; if (file.type !== allowed[type]) throw new Error('File type does not match its extension.'); if (!file.size || file.size > MAX_UPLOAD_BYTES) throw new Error('File must be between 1 byte and 15 MB.'); return { name, type, mimeType: file.type, size: file.size, buffer: Buffer.from(await file.arrayBuffer()) }; }
