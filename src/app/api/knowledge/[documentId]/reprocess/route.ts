import mongoose from 'mongoose';
import { reprocessDocument } from '@/lib/ai/structured-knowledge';

export const runtime = 'nodejs';

export async function POST(_request: Request, context: { params: Promise<{ documentId: string }> }) {
  const { documentId } = await context.params;
  if (!mongoose.isObjectIdOrHexString(documentId)) return Response.json({ error: 'Invalid knowledge document ID.' }, { status: 400 });
  try {
    const result = await reprocessDocument(documentId);
    return Response.json({ success: true, result });
  } catch (error) {
    console.error('[structured-knowledge] reprocess failed', error instanceof Error ? error.message : 'unknown');
    return Response.json({ error: 'Structured knowledge reprocessing failed.' }, { status: 500 });
  }
}
