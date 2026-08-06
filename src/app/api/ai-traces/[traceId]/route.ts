import { getTraceById, sanitizeTrace } from '@/lib/ai/trace';

export const runtime = 'nodejs';

export async function GET(_request: Request, { params }: { params: Promise<{ traceId: string }> }) {
  if (process.env.NODE_ENV === 'production') return Response.json({ error: 'Not found' }, { status: 404 });
  const { traceId } = await params;
  if (!/^[a-zA-Z0-9-]{1,100}$/.test(traceId)) return Response.json({ error: 'Invalid trace ID.' }, { status: 400 });
  try {
    const trace = await getTraceById(traceId);
    if (!trace) return Response.json({ error: 'Not found' }, { status: 404 });
    return Response.json({ trace: sanitizeTrace(trace) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json({ error: 'Unable to load trace.' }, { status: 503 });
  }
}
