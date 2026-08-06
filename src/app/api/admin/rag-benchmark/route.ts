import { z } from 'zod';
import { runBenchmark, SAMPLE_BENCHMARK_DATASET, type BenchmarkActual } from '@/lib/ai/evaluation/benchmark';

export const runtime = 'nodejs';
const requestSchema = z.object({ ids: z.array(z.string()).max(100).optional() });

export async function GET() { return Response.json({ dataset: SAMPLE_BENCHMARK_DATASET, total: SAMPLE_BENCHMARK_DATASET.length }, { headers: { 'Cache-Control': 'no-store' } }); }

export async function POST(request: Request) {
  if (process.env.NODE_ENV === 'production') return Response.json({ error: 'Benchmark execution is disabled in production.' }, { status: 403 });
  const parsed = requestSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return Response.json({ error: 'Invalid benchmark request.' }, { status: 400 });
  const selected = parsed.data.ids?.length ? SAMPLE_BENCHMARK_DATASET.filter((test) => parsed.data.ids?.includes(test.id)) : SAMPLE_BENCHMARK_DATASET;
  const origin = new URL(request.url).origin;
  const report = await runBenchmark(selected, async (test): Promise<BenchmarkActual> => {
    const started = performance.now();
    const response = await fetch(`${origin}/api/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [{ role: 'user', content: test.question }], knowledgeMode: 'public', chatMode: 'knowledge_hybrid' }) });
    const answer = await response.text();
    let metadata: Record<string, unknown> = {}; let sources: unknown[] = [];
    try { const raw = response.headers.get('X-Jarvis-Answer-Metadata'); metadata = raw ? JSON.parse(decodeURIComponent(raw)) : {}; const sourceRaw = response.headers.get('X-Jarvis-Knowledge-Sources'); sources = sourceRaw ? JSON.parse(decodeURIComponent(sourceRaw)) : []; } catch { /* Failed responses are measured as failed cases. */ }
    return { answer, route: String(metadata.answerSource ?? (response.ok ? 'unknown' : 'error')), answerSource: String(metadata.answerSource ?? 'error'), retrievedChunks: sources.length, graphEntitiesUsed: Array.isArray(metadata.entitiesUsed) ? metadata.entitiesUsed.map(String) : [], confidence: Number(metadata.confidence ?? 0), evaluationDecision: String(metadata.evaluationDecision ?? 'unknown'), latencyMs: Math.round(performance.now() - started), tokenUsage: null, fallbackUsed: Boolean(metadata.usedFallback), sourceCount: sources.length };
  });
  return Response.json({ report }, { headers: { 'Cache-Control': 'no-store' } });
}
