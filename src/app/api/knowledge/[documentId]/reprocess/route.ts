import mongoose from 'mongoose';
import { auditStructuredKnowledgeDocument, reprocessExistingDocument } from '@/lib/ai/structured-knowledge';

export const runtime = 'nodejs';

export async function POST(_request: Request, context: { params: Promise<{ documentId: string }> }) {
  const { documentId } = await context.params;
  if (!mongoose.isObjectIdOrHexString(documentId)) return Response.json({ error: 'Invalid knowledge document ID.' }, { status: 400 });
  try {
    const result = await reprocessExistingDocument(documentId);
    return Response.json({ success: true, result });
  } catch (error) {
    console.error('[structured-knowledge] reprocess failed', error instanceof Error ? error.message : 'unknown');
    return Response.json({ error: 'Structured knowledge reprocessing failed.' }, { status: 500 });
  }
}

export async function GET(_request: Request, context: { params: Promise<{ documentId: string }> }) {
  const { documentId } = await context.params;
  if (!mongoose.isObjectIdOrHexString(documentId)) return Response.json({ error: 'Invalid knowledge document ID.' }, { status: 400 });
  try {
    return Response.json({ success: true, report: await auditStructuredKnowledgeDocument(documentId) });
  } catch (error) {
    console.error('[structured-knowledge] audit failed', error instanceof Error ? error.message : 'unknown');
    return Response.json({ error: 'Structured knowledge audit failed.' }, { status: 500 });
  }
}
