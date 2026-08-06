'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, ChevronDown, ChevronUp, Loader2, X } from 'lucide-react';

type Trace = Record<string, unknown>;

type DebugTraceDrawerProps = {
  traceId?: string;
  open: boolean;
  onClose: () => void;
};

const sections: Array<{ key: string; label: string }> = [
  { key: 'queryUnderstanding', label: 'Intent & requested fields' },
  { key: 'entityResolution', label: 'Entity' },
  { key: 'routing', label: 'Capability & reason' },
  { key: 'knowledgeGraph', label: 'Knowledge Graph match' },
  { key: 'retrieval', label: 'Retrieved chunks & similarity scores' },
  { key: 'evaluation', label: 'Final selected chunks & evaluation' },
  { key: 'toolCalling', label: 'Tool calls' },
  { key: 'generation', label: 'Groq usage & fallback' },
];

function value(trace: Trace, key: string) {
  return trace[key] ?? null;
}

function TraceSection({ label, data }: { label: string; data: unknown }) {
  const [expanded, setExpanded] = useState(label === 'Intent & requested fields' || label === 'Capability & reason');
  if (!data || (typeof data === 'object' && !Array.isArray(data) && !Object.keys(data as Record<string, unknown>).length)) return null;

  return (
    <section className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)]/45">
      <button
        type="button"
        onClick={() => setExpanded((current) => !current)}
        className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm font-medium text-[var(--text-primary)]"
      >
        {label}
        {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
      </button>
      {expanded && (
        <pre className="max-h-64 overflow-auto border-t border-[var(--border-color)] px-3 py-2.5 text-xs leading-relaxed text-[var(--text-secondary)] whitespace-pre-wrap break-words">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </section>
  );
}

/** Development-only, read-only view of the trace already produced by the backend. */
export function DebugTraceDrawer({ traceId, open, onClose }: DebugTraceDrawerProps) {
  const [trace, setTrace] = useState<Trace | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !traceId) return;

    let active = true;
    void Promise.resolve().then(() => {
      if (active) setLoading(true);
    });
    void fetch('/api/admin/ai-traces', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error('Debug traces are unavailable.');
        const payload = await response.json() as { traces?: Trace[] };
        return (payload.traces ?? []).find((item) => item.traceId === traceId) ?? null;
      })
      .then((found) => {
        if (!active) return;
        if (!found) setError('The related trace has expired or is no longer available.');
        else setTrace(found);
      })
      .catch(() => {
        if (active) setError('Unable to load this debug trace.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [open, traceId]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-label="AI debug trace">
      <button type="button" className="absolute inset-0 bg-slate-950/40" aria-label="Close debug drawer" onClick={onClose} />
      <aside className="absolute inset-y-0 right-0 flex w-full max-w-xl flex-col border-l border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-[var(--border-color)] px-5 py-4">
          <div>
            <p className="font-mono text-xs text-[var(--accent-cyan)]">DEVELOPMENT ONLY</p>
            <h2 className="mt-1 text-lg font-semibold text-[var(--text-primary)]">View Debug</h2>
            {traceId && <p className="mt-1 break-all font-mono text-[11px] text-[var(--text-muted)]">Trace: {traceId}</p>}
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-2 text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]" aria-label="Close debug drawer">
            <X size={18} />
          </button>
        </header>

        <div className="flex-1 space-y-3 overflow-y-auto p-5">
          {loading && traceId && <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]"><Loader2 size={16} className="animate-spin" /> Loading trace…</div>}
          {!traceId && <div className="flex gap-2 rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-700 dark:text-amber-300"><AlertCircle size={17} className="mt-0.5 shrink-0" />This older response does not have a debug trace attached.</div>}
          {traceId && error && <div className="flex gap-2 rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-700 dark:text-amber-300"><AlertCircle size={17} className="mt-0.5 shrink-0" />{error}</div>}
          {trace && <>
            <section className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)]/45 p-3">
              <p className="text-[11px] font-mono text-[var(--text-muted)]">ORIGINAL QUERY</p>
              <p className="mt-1 text-sm text-[var(--text-primary)]">{String(value(trace, 'userQuery') ?? '—')}</p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-[var(--text-secondary)]">
                <span>Confidence: {String((value(trace, 'routing') as Record<string, unknown> | null)?.confidence ?? '—')}</span>
                <span>Latency: {String(value(trace, 'durationMs') ?? '—')} ms</span>
              </div>
            </section>
            {sections.map((section) => <TraceSection key={section.key} label={section.label} data={value(trace, section.key)} />)}
            {Array.isArray(value(trace, 'errors')) && (value(trace, 'errors') as unknown[]).length > 0 && <TraceSection label="Errors" data={value(trace, 'errors')} />}
          </>}
        </div>
      </aside>
    </div>
  );
}
