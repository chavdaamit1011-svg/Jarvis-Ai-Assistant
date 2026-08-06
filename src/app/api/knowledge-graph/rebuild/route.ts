import { rebuildKnowledgeGraph } from '@/lib/ai/knowledge-graph';

export const runtime = 'nodejs';

export async function POST() {
  try {
    const rebuild = await rebuildKnowledgeGraph();
    return Response.json({ success: true, rebuild }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Knowledge graph rebuild failed.';
    const status = message.includes('already running') ? 409 : 500;
    return Response.json({ error: status === 409 ? message : 'Knowledge graph rebuild failed.' }, { status, headers: { 'Cache-Control': 'no-store' } });
  }
}
