'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { BookOpen, ChevronDown, Database, FileUp, LoaderCircle, RefreshCw, Trash2, X } from 'lucide-react';

type KnowledgeDocument = { id: string; title: string; status: string; chunkCount: number; visibility: string; fileName?: string; fileType?: string; fileSize?: number; pageCount?: number; errorMessage?: string };
type Chunk = { id: string; chunkIndex: number; content: string };
type RebuildStatus = { status: 'pending' | 'running' | 'completed' | 'completed_with_failures' | 'failed'; graphVersion: string; progress: { totalDocuments: number; processedDocuments: number; totalChunks: number; processedChunks: number; entitiesCreated: number; factsCreated: number; relationshipsCreated: number; conflictsFound: number; failedChunks: number }; completedAt?: string; errorMessage?: string };

const SAMPLES = [
  ['Refund Policy', 'Customers may request a full refund within 30 days of purchase. Refunds return to the original payment method within 5 to 10 business days.'],
  ['JavaScript Learning Guide', 'Learn JavaScript by practising variables, functions, arrays, objects, and async programming in small web projects.'],
  ['Digital Marketing Guide', 'Small businesses can grow online with a clear audience, social media content, SEO, email newsletters, and measured paid advertising.'],
  ['Pharmacy Safety Information', 'Prescription medicine should be used exactly as directed by a qualified healthcare professional. Never change dosage without medical advice.'],
] as const;
const formatBytes = (value?: number) => value ? `${(value / 1024 / 1024).toFixed(2)} MB` : '—';

export default function KnowledgePage() {
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [tab, setTab] = useState<'manual' | 'upload'>('manual');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [visibility, setVisibility] = useState('public');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState('');
  const [error, setError] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [chunks, setChunks] = useState<Chunk[]>([]);
  const [rebuild, setRebuild] = useState<RebuildStatus | null>(null);
  const [rebuilding, setRebuilding] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    try {
      const response = await fetch('/api/knowledge');
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setDocuments(data.documents);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load knowledge documents.');
    }
  };
  const loadRebuildStatus = async () => {
    try {
      const response = await fetch('/api/knowledge-graph/status');
      const data = await response.json();
      if (response.ok) setRebuild(data.rebuild);
    } catch { /* The document UI remains usable if graph status is unavailable. */ }
  };
  useEffect(() => {
    const timer = setTimeout(() => { void load(); void loadRebuildStatus(); }, 0);
    return () => clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (rebuild?.status !== 'running') return;
    const timer = window.setInterval(() => void loadRebuildStatus(), 1200);
    return () => window.clearInterval(timer);
  }, [rebuild?.status]);

  const chooseFile = (candidate: File | undefined) => {
    setError('');
    if (!candidate) return;
    const extension = candidate.name.split('.').pop()?.toLowerCase();
    if (!['pdf', 'docx', 'txt'].includes(extension || '') || candidate.size > 15 * 1024 * 1024) {
      setError('Choose a PDF, DOCX, or TXT file up to 15 MB.');
      return;
    }
    setFile(candidate);
    if (!title) setTitle(candidate.name.replace(/\.[^.]+$/, ''));
  };
  const saveManual = async () => {
    if (!title.trim() || !content.trim()) return;
    setLoading(true); setError(''); setStage('Chunking and generating embeddings…');
    try {
      const response = await fetch('/api/knowledge', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, description, content, visibility }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setTitle(''); setDescription(''); setContent(''); setStage('Success — knowledge is ready.'); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to process document.'); }
    finally { setLoading(false); }
  };
  const upload = async () => {
    if (!file || loading) return;
    setLoading(true); setError(''); setStage('Uploading and extracting text…');
    try {
      const form = new FormData(); form.set('file', file); form.set('title', title); form.set('description', description); form.set('visibility', visibility);
      const response = await fetch('/api/knowledge/upload', { method: 'POST', body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setStage('Success — chunking and embeddings are ready.'); setFile(null); setTitle(''); setDescription(''); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Upload failed.'); }
    finally { setLoading(false); }
  };
  const view = async (id: string) => {
    if (openId === id) return setOpenId(null);
    const response = await fetch(`/api/knowledge/${id}`); const data = await response.json();
    if (!response.ok) return setError(data.error);
    setOpenId(id); setChunks(data.chunks);
  };
  const remove = async (id: string) => {
    if (!window.confirm('Delete this document and all related chunks?')) return;
    const response = await fetch(`/api/knowledge/${id}`, { method: 'DELETE' });
    if (!response.ok) return setError((await response.json()).error);
    await load();
  };
  const startRebuild = async () => {
    if (rebuilding || rebuild?.status === 'running') return;
    setRebuilding(true); setError('');
    try {
      const response = await fetch('/api/knowledge-graph/rebuild', { method: 'POST' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setRebuild(data.rebuild);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Knowledge graph rebuild failed.'); }
    finally { setRebuilding(false); await loadRebuildStatus(); }
  };

  const progress = rebuild?.progress;
  return <main className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
    <header className="border-b border-[var(--border-color)]"><div className="mx-auto flex max-w-6xl justify-between p-5"><Link href="/" className="text-xs font-mono text-[var(--accent-cyan)]">← Jarvis AI</Link><span className="flex gap-2 font-semibold"><Database size={17} />Knowledge Base</span></div></header>
    <div className="mx-auto grid max-w-6xl gap-6 p-5 lg:grid-cols-2">
      <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-5">
        <div className="flex items-center justify-between gap-3"><h1 className="text-xl font-bold">Add knowledge</h1><button onClick={() => void startRebuild()} disabled={rebuilding || rebuild?.status === 'running'} className="flex items-center gap-1 rounded-lg border border-[var(--accent-cyan)]/50 px-2.5 py-1.5 text-xs text-[var(--accent-cyan)] disabled:opacity-50"><RefreshCw size={13} className={rebuilding || rebuild?.status === 'running' ? 'animate-spin' : ''} />Rebuild Knowledge Index</button></div>
        {rebuild && <div className="mt-3 rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] p-3 text-xs text-[var(--text-secondary)]"><div className="flex justify-between gap-2"><span>Graph: {rebuild.status.replaceAll('_', ' ')}</span><span>{rebuild.graphVersion}</span></div>{progress && <p className="mt-1">Documents {progress.processedDocuments}/{progress.totalDocuments} · Chunks {progress.processedChunks}/{progress.totalChunks} · Entities {progress.entitiesCreated} · Facts {progress.factsCreated} · Relationships {progress.relationshipsCreated}{progress.conflictsFound ? ` · Conflicts ${progress.conflictsFound}` : ''}{progress.failedChunks ? ` · Failed ${progress.failedChunks}` : ''}</p>}{rebuild.completedAt && <p className="mt-1 text-[var(--text-muted)]">Last rebuild: {new Date(rebuild.completedAt).toLocaleString()}</p>}{rebuild.errorMessage && <p className="mt-1 text-rose-400">{rebuild.errorMessage}</p>}</div>}
        <div className="mt-4 flex rounded-xl bg-[var(--bg-primary)] p-1"><button onClick={() => setTab('manual')} className={`flex-1 rounded-lg px-3 py-2 text-sm ${tab === 'manual' ? 'bg-[var(--accent-cyan)] font-bold text-slate-950' : ''}`}>Manual Text</button><button onClick={() => setTab('upload')} className={`flex-1 rounded-lg px-3 py-2 text-sm ${tab === 'upload' ? 'bg-[var(--accent-cyan)] font-bold text-slate-950' : ''}`}>Upload Document</button></div>
        {tab === 'manual' ? <><div className="mt-4 flex flex-wrap gap-2">{SAMPLES.map((sample) => <button key={sample[0]} onClick={() => { setTitle(sample[0]); setContent(sample[1]); }} className="rounded-lg border border-[var(--border-color)] px-2 py-1 text-xs">Use {sample[0]}</button>)}</div><textarea value={content} onChange={(event) => setContent(event.target.value)} placeholder="Paste knowledge text" rows={10} className="mt-4 w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] p-3" /></> : <><input ref={inputRef} type="file" accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain" className="hidden" onChange={(event) => chooseFile(event.target.files?.[0])} /><div onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); chooseFile(event.dataTransfer.files[0]); }} onClick={() => inputRef.current?.click()} className="mt-4 cursor-pointer rounded-xl border-2 border-dashed border-[var(--accent-cyan)]/50 p-8 text-center hover:bg-[var(--bg-tertiary)]"><FileUp className="mx-auto text-[var(--accent-cyan)]" /><p className="mt-2 font-semibold">Drag & drop a document here</p><p className="mt-1 text-xs text-[var(--text-muted)]">PDF, DOCX, TXT · Maximum 15 MB · or browse file</p></div>{file && <div className="mt-3 flex items-center justify-between rounded-lg border border-[var(--border-color)] p-3 text-sm"><span>{file.name} · {formatBytes(file.size)} · {file.type || 'unknown'}</span><button onClick={() => setFile(null)}><X size={16} /></button></div>}</>}
        <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Document title" maxLength={120} className="mt-4 w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] p-2.5" /><input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Optional description" maxLength={500} className="mt-3 w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] p-2.5" /><select value={visibility} onChange={(event) => setVisibility(event.target.value)} className="mt-3 w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] p-2.5"><option value="public">Public knowledge chat</option><option value="private">Private knowledge chat</option></select>{stage && <p className="mt-3 text-xs text-[var(--accent-cyan)]">{stage}</p>}{error && <p className="mt-3 text-sm text-rose-400">{error}</p>}<button onClick={() => void (tab === 'manual' ? saveManual() : upload())} disabled={loading || !title.trim() || (tab === 'manual' ? !content.trim() : !file)} className="mt-4 flex w-full justify-center gap-2 rounded-xl bg-[var(--accent-cyan)] p-3 font-bold text-slate-950 disabled:opacity-50">{loading && <LoaderCircle size={16} className="animate-spin" />}{loading ? stage || 'Processing…' : tab === 'manual' ? 'Save and process' : 'Upload and process'}</button>
      </section>
      <section><h2 className="text-xl font-bold">Your documents</h2><div className="mt-4 space-y-3">{documents.length === 0 ? <div className="rounded-2xl border border-dashed border-[var(--border-color)] p-8 text-center text-sm text-[var(--text-secondary)]"><BookOpen className="mx-auto mb-3" />No documents yet.</div> : documents.map((document) => <article key={document.id} className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4"><div className="flex justify-between"><div><h3 className="font-semibold">{document.title}</h3><p className="text-xs text-[var(--text-muted)]">{document.status} · {document.chunkCount} chunks · {document.visibility}</p>{document.fileName && <p className="mt-1 text-xs text-[var(--text-muted)]">{document.fileName} · {document.fileType?.toUpperCase()} · {formatBytes(document.fileSize)}{document.pageCount ? ` · ${document.pageCount} pages` : ''}</p>}{document.errorMessage && <p className="text-xs text-rose-400">{document.errorMessage}</p>}</div><button onClick={() => void remove(document.id)} className="text-rose-400"><Trash2 size={16} /></button></div><button onClick={() => void view(document.id)} className="mt-3 flex gap-1 text-xs text-[var(--accent-cyan)]">View chunks <ChevronDown size={14} /></button>{openId === document.id && <div className="mt-3 space-y-2">{chunks.map((chunk) => <div key={chunk.id} className="rounded-lg bg-[var(--bg-primary)] p-3 text-xs"><span className="text-[var(--accent-cyan)]">Chunk {chunk.chunkIndex + 1}</span><p className="mt-1 whitespace-pre-wrap text-[var(--text-secondary)]">{chunk.content}</p></div>)}</div>}</article>)}</div></section>
    </div>
  </main>;
}
