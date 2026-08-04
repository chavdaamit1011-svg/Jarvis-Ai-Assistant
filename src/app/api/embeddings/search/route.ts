import { z } from 'zod';
import { EmbeddingError, semanticSearch } from '@/lib/ai/embeddings';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_DOCUMENTS = 10;
const documentSchema = z.object({
  id: z.string().trim().min(1).max(100),
  title: z.string().trim().min(1).max(160),
  content: z.string().trim().min(1).max(3_500),
});

const requestSchema = z.object({
  query: z.string().trim().min(1).max(1_000),
  documents: z.array(documentSchema).min(1).max(MAX_DOCUMENTS),
  limit: z.number().int().min(1).max(MAX_DOCUMENTS).optional(),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON request body.' }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: `Provide a query and 1-${MAX_DOCUMENTS} valid documents.` }, { status: 400 });
  }

  try {
    const results = await semanticSearch(parsed.data.query, parsed.data.documents, parsed.data.limit);
    return Response.json({ results }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error: unknown) {
    if (error instanceof EmbeddingError && error.code === 'INPUT') {
      return Response.json({ error: error.message }, { status: 400 });
    }

    console.error('[API /api/embeddings/search] Embedding error:', error);
    return Response.json(
      { error: 'The local embedding service is temporarily unavailable. Please try again shortly.' },
      { status: 503 }
    );
  }
}
