import { rebuildKnowledgeIndex } from '@/lib/ai/knowledge-index';

export const runtime = 'nodejs';

export async function POST() {
  try {
    const result = await rebuildKnowledgeIndex();
    return Response.json({ success: true, ...result });
  } catch (error) {
    console.error('[Knowledge index rebuild] failed:', error instanceof Error ? error.message : 'unknown');
    return Response.json({ error: 'Knowledge index rebuild failed.' }, { status: 500 });
  }
}
