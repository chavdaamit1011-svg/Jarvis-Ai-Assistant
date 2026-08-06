import { getKnowledgeGraphRebuildStatus } from '@/lib/ai/knowledge-graph';

export const runtime = 'nodejs';

export async function GET() {
  try {
    return Response.json({ rebuild: await getKnowledgeGraphRebuildStatus() }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json({ error: 'Unable to load knowledge graph rebuild status.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
