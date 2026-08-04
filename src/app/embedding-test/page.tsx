'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, BrainCircuit, Play, Search, Sparkles } from 'lucide-react';

interface DocumentInput { id: string; title: string; content: string; }
interface SearchResult extends DocumentInput { score: number; }

const INITIAL_DOCUMENTS: DocumentInput[] = [
  { id: 'javascript', title: 'JavaScript Development', content: 'JavaScript powers interactive web applications. Learn modern syntax, DOM APIs, TypeScript, React, and Node.js.' },
  { id: 'marketing', title: 'Digital Marketing', content: 'Promote a business online with search engine optimization, social media campaigns, helpful content, email marketing, and paid advertising.' },
  { id: 'pharmacy', title: 'Pharmacy Basics', content: 'Pharmacy professionals help people understand medicines, safe storage, prescriptions, and when to speak with a clinician.' },
  { id: 'cooking', title: 'Home Cooking', content: 'Learn cooking techniques, meal planning, seasoning, food safety, and simple recipes for everyday meals.' },
  { id: 'travel', title: 'Travel Planning', content: 'Plan a trip by researching destinations, setting a budget, booking transport and accommodation, and preparing an itinerary.' },
];

export function EmbeddingPractical() {
  const [query, setQuery] = useState('How do I promote my business online?');
  const [documents, setDocuments] = useState(INITIAL_DOCUMENTS);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateDocument = (id: string, field: 'title' | 'content', value: string) => {
    setDocuments((current) => current.map((document) => document.id === id ? { ...document, [field]: value } : document));
  };

  const runSearch = async () => {
    setIsLoading(true); setError(null);
    try {
      const response = await fetch('/api/embeddings/search', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query, documents, limit: 5 }),
      });
      const payload = await response.json() as { results?: SearchResult[]; error?: string };
      if (!response.ok) throw new Error(payload.error ?? 'Semantic search failed.');
      setResults(payload.results ?? []);
    } catch (searchError: unknown) {
      setError(searchError instanceof Error ? searchError.message : 'Semantic search failed.');
      setResults([]);
    } finally { setIsLoading(false); }
  };

  return <main className="min-h-screen bg-[var(--bg-primary)] px-4 py-6 text-[var(--text-primary)] md:px-8">
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-color)] pb-5">
        <div className="flex items-center gap-3"><div className="rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 p-2 text-white arc-glow"><BrainCircuit size={20} /></div><div><p className="font-mono text-[10px] uppercase tracking-wider text-[var(--accent-cyan)]">Developer test page</p><h1 className="text-lg font-bold">Local Semantic Search</h1></div></div>
        <Link href="/" className="flex items-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-3 py-2 text-xs font-mono hover:border-[var(--accent-cyan)]/60"><ArrowLeft size={14} />Back to Jarvis AI</Link>
      </header>

      <section className="glass-panel space-y-4 rounded-2xl p-4 md:p-5">
        <label className="block text-xs font-mono font-semibold text-[var(--text-muted)]">SEARCH QUERY</label>
        <div className="flex gap-3"><input value={query} onChange={(event) => setQuery(event.target.value)} maxLength={1000} className="min-w-0 flex-1 rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-3 py-2 text-sm outline-none focus:border-[var(--accent-cyan)]" />
          <button onClick={runSearch} disabled={isLoading || !query.trim()} className="flex items-center gap-2 rounded-xl bg-[var(--accent-cyan)] px-4 py-2 text-xs font-bold text-slate-950 disabled:opacity-50"><Play size={14} />{isLoading ? 'Loading model…' : 'Run Semantic Search'}</button></div>
        <p className="text-xs text-[var(--text-muted)]">The first request downloads and initializes the local model; later searches reuse it in the server process.</p>
      </section>

      <section className="grid gap-4 md:grid-cols-2">{documents.map((document) => <article key={document.id} className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4 space-y-2"><input value={document.title} onChange={(event) => updateDocument(document.id, 'title', event.target.value)} maxLength={160} className="w-full bg-transparent text-sm font-semibold outline-none focus:text-[var(--accent-cyan)]" /><textarea value={document.content} onChange={(event) => updateDocument(document.id, 'content', event.target.value)} maxLength={3500} rows={3} className="w-full resize-none rounded-lg bg-[var(--bg-primary)] p-2 text-xs text-[var(--text-secondary)] outline-none focus:ring-1 focus:ring-[var(--accent-cyan)]" /></article>)}</section>

      {(error || results.length > 0) && <section className="space-y-3"><div className="flex items-center gap-2 text-sm font-semibold"><Search size={16} className="text-[var(--accent-cyan)]" />Ranked results</div>{error && <p className="rounded-xl border border-rose-500/40 bg-rose-950/20 p-3 text-sm text-rose-200">{error}</p>}{results.map((result, index) => <article key={result.id} className={`rounded-2xl border p-4 ${index === 0 ? 'border-[var(--accent-cyan)] bg-[var(--accent-cyan)]/10 shadow-lg' : 'border-[var(--border-color)] bg-[var(--bg-secondary)]'}`}><div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-2"><h2 className="font-semibold">{result.title}</h2>{index === 0 && <span className="flex items-center gap-1 rounded-full bg-[var(--accent-cyan)] px-2 py-0.5 text-[10px] font-mono text-slate-950"><Sparkles size={11} />Best match</span>}</div><p className="mt-1 text-sm text-[var(--text-secondary)]">{result.content}</p></div><span className="rounded-lg bg-[var(--bg-primary)] px-2 py-1 font-mono text-xs text-[var(--accent-cyan)]">{(result.score * 100).toFixed(1)}%</span></div></article>)}</section>}
    </div>
  </main>;
}

export default function EmbeddingTestPage() { return <EmbeddingPractical />; }
