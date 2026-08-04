import { z } from 'zod';
import { retrieveContext } from '@/lib/ai/rag';

export const runtime = 'nodejs';
const schema = z.object({ query: z.string().trim().min(1).max(4_000), limit: z.number().int().min(1).max(5).optional(), visibility: z.enum(['public', 'private']).default('public') });

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ error: 'Invalid JSON request body.' }, { status: 400 }); }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return Response.json({ error: 'Provide a valid query, visibility, and limit.' }, { status: 400 });
  try {
    const result = await retrieveContext(parsed.data);
    return Response.json({ results: result.chunks.map((chunk) => ({ chunkId: chunk.chunkId, documentId: chunk.documentId, documentTitle: chunk.documentTitle, content: chunk.content, score: chunk.score, chunkIndex: chunk.chunkIndex })), context: result.context });
  } catch (error) {
    console.error('[Knowledge] Search failed:', error instanceof Error ? error.message : 'unknown');
    return Response.json({ error: 'Knowledge search is temporarily unavailable.' }, { status: 503 });
  }
}
