'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { BookOpen, CheckCircle2, ChevronRight, Circle, Clock3, GraduationCap, LockKeyhole, PlayCircle, Sparkles, Wrench } from 'lucide-react';
import { LEARNING_TOPICS } from '@/lib/learning/topics';
import { EMPTY_LEARNING_PROGRESS, readLearningProgress, statusLabel, writeLearningProgress } from '@/lib/learning/progress';
import type { LearningProgressState, LearningStatus } from '@/lib/learning/types';

export function LearnDashboard() {
  const [progress, setProgress] = useState<LearningProgressState>(EMPTY_LEARNING_PROGRESS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => { setProgress(readLearningProgress()); setReady(true); }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  const completed = useMemo(() => LEARNING_TOPICS.filter((topic) => progress.topics[topic.slug]?.status === 'completed').length, [progress]);
  const lastTopic = progress.lastTopic ? LEARNING_TOPICS.find((topic) => topic.slug === progress.lastTopic) : undefined;

  const update = (next: LearningProgressState) => { setProgress(next); writeLearningProgress(next); };
  const toggleDeveloperUnlock = () => update({ ...progress, developerUnlock: !progress.developerUnlock });

  return <main className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
    <header className="sticky top-0 z-20 border-b border-[var(--border-color)] bg-[var(--bg-primary)]/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
        <Link href="/" className="rounded-xl border border-[var(--border-color)] px-3 py-2 text-xs font-mono hover:border-[var(--accent-cyan)]">← Jarvis AI</Link>
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--accent-cyan)]"><GraduationCap size={18} /> Learn AI</div>
      </div>
    </header>
    <div className="mx-auto max-w-7xl px-5 py-8">
      <section className="rounded-3xl border border-[var(--accent-cyan)]/30 bg-gradient-to-br from-cyan-950/35 via-[var(--bg-secondary)] to-[var(--bg-secondary)] p-6 md:p-9">
        <div className="flex items-center gap-2 text-xs font-mono text-[var(--accent-cyan)]"><Sparkles size={16} /> JARVIS AI ACADEMY</div>
        <h1 className="mt-4 max-w-3xl text-3xl font-bold tracking-tight md:text-5xl">Learn AI by building understanding, one useful concept at a time.</h1>
        <p className="mt-4 max-w-2xl leading-7 text-[var(--text-secondary)]">A beginner-friendly path from language models to production deployment. Lessons explain what matters, show how it works, and connect it to Jarvis.</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
          <div><div className="flex justify-between text-xs text-[var(--text-secondary)]"><span>Course progress</span><span>{completed} / {LEARNING_TOPICS.length} completed</span></div><div className="mt-2 h-2.5 overflow-hidden rounded-full bg-[var(--bg-tertiary)]"><div className="h-full rounded-full bg-gradient-to-r from-[var(--accent-cyan)] to-blue-500 transition-all" style={{ width: `${(completed / LEARNING_TOPICS.length) * 100}%` }} /></div></div>
          <Link href={`/learn/${lastTopic?.slug ?? LEARNING_TOPICS[0].slug}`} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--accent-cyan)] px-4 py-3 text-sm font-bold text-slate-950 hover:brightness-110">{lastTopic ? 'Continue learning' : 'Start learning'} <ChevronRight size={16} /></Link>
        </div>
      </section>
      <div className="mt-8 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-bold">Learning path</h2><p className="mt-1 text-sm text-[var(--text-secondary)]">Lessons unlock in sequence as you learn.</p></div><button onClick={toggleDeveloperUnlock} className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-color)] px-3 py-2 text-xs text-[var(--text-secondary)] hover:border-[var(--accent-cyan)]"><Wrench size={14} /> Developer unlock: {progress.developerUnlock ? 'On' : 'Off'}</button></div>
      <section className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {LEARNING_TOPICS.map((topic, index) => {
          const state = progress.topics[topic.slug];
          const status: LearningStatus = state?.status ?? 'not-started';
          const previousComplete = index === 0 || progress.topics[LEARNING_TOPICS[index - 1].slug]?.status === 'completed';
          const locked = !progress.developerUnlock && !previousComplete;
          const Icon = locked ? LockKeyhole : status === 'completed' ? CheckCircle2 : status === 'in-progress' ? PlayCircle : Circle;
          return <article key={topic.slug} className={`group rounded-2xl border p-5 transition ${locked ? 'border-[var(--border-color)]/50 bg-[var(--bg-secondary)]/50 opacity-70' : 'border-[var(--border-color)] bg-[var(--bg-secondary)] hover:-translate-y-0.5 hover:border-[var(--accent-cyan)]/60'}`}>
            <div className="flex items-start justify-between gap-3"><span className="rounded-lg bg-[var(--accent-cyan)]/10 px-2 py-1 text-xs font-mono text-[var(--accent-cyan)]">{String(topic.number).padStart(2, '0')}</span><span className={`inline-flex items-center gap-1 text-xs ${status === 'completed' ? 'text-emerald-400' : 'text-[var(--text-muted)]'}`}><Icon size={14} /> {locked ? 'Locked' : statusLabel(status)}</span></div>
            <h3 className="mt-4 text-lg font-bold">{topic.title}</h3><p className="mt-2 min-h-12 text-sm leading-6 text-[var(--text-secondary)]">{topic.shortDescription}</p>
            <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-[var(--text-muted)]"><span className="inline-flex items-center gap-1"><Clock3 size={13} /> {topic.estimatedMinutes} min</span><span className="inline-flex items-center gap-1"><BookOpen size={13} /> {topic.planned ? 'Planned lesson' : 'Practical available'}</span></div>
            {topic.prerequisites.length > 0 && <p className="mt-3 text-[11px] text-[var(--text-muted)]">Prerequisites: {topic.prerequisites.join(', ')}</p>}
            {locked ? <div className="mt-5 rounded-lg border border-[var(--border-color)] px-3 py-2 text-center text-xs text-[var(--text-muted)]">Complete the previous lesson to unlock</div> : <Link href={`/learn/${topic.slug}`} className="mt-5 flex items-center justify-center gap-1 rounded-lg bg-[var(--bg-tertiary)] px-3 py-2.5 text-sm font-semibold text-[var(--text-primary)] group-hover:bg-[var(--accent-cyan)] group-hover:text-slate-950">{status === 'in-progress' ? 'Continue' : status === 'completed' ? 'Review lesson' : 'Open lesson'} <ChevronRight size={15} /></Link>}
          </article>;
        })}
      </section>
      {!ready && <p className="mt-4 text-xs text-[var(--text-muted)]">Loading saved learning progress…</p>}
    </div>
  </main>;
}
