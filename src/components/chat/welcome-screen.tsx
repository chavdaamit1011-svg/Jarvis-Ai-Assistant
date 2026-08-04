'use client';

import React from 'react';
import { SUGGESTED_PROMPTS } from '@/lib/mock-data';
import { useChat } from '@/context/chat-context';
import { Code2, Cpu, ShieldAlert, Sparkles, Zap, Bot, Terminal } from 'lucide-react';

export function WelcomeScreen() {
  const { sendMessage, persona } = useChat();

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Cpu':
        return <Cpu size={20} className="text-[var(--accent-cyan)]" />;
      case 'Code2':
        return <Code2 size={20} className="text-emerald-400" />;
      case 'ShieldAlert':
        return <ShieldAlert size={20} className="text-rose-400" />;
      default:
        return <Sparkles size={20} className="text-amber-400" />;
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 text-center max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Arc Reactor Graphic Badge */}
      <div className="relative group">
        <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 opacity-50 blur-lg group-hover:opacity-100 transition duration-1000 arc-glow" />
        <div className="relative flex items-center justify-center w-20 h-20 rounded-full bg-[var(--bg-secondary)] border-2 border-[var(--accent-cyan)] shadow-2xl">
          <div className="relative flex items-center justify-center w-12 h-12 rounded-full border border-[var(--accent-cyan)]/50 bg-[var(--bg-primary)]">
            <Zap size={28} className="text-[var(--accent-cyan)] arc-glow" />
          </div>
        </div>
      </div>

      {/* Hero Welcome Text */}
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-xs font-mono text-[var(--accent-cyan)]">
          <Terminal size={14} />
          <span>STARK MAINFRAME OS v4.8 • ONLINE</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-[var(--accent-cyan)] to-blue-400">
          {persona === 'ultron' ? 'ULTRON Prime Online.' : 'At your service, Sir.'}
        </h1>
        <p className="text-sm md:text-base text-[var(--text-secondary)] max-w-xl mx-auto">
          What complex task or system telemetry shall we analyze today? Select a preset protocol below or initiate your command.
        </p>
      </div>

      {/* Suggested Stark Prompts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full text-left pt-4">
        {SUGGESTED_PROMPTS.map((prompt) => (
          <button
            key={prompt.id}
            onClick={() => sendMessage(prompt.promptText)}
            className="group flex flex-col justify-between p-4 rounded-xl glass-panel hover:border-[var(--accent-cyan)]/60 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5"
          >
            <div className="flex items-start justify-between w-full mb-2">
              <div className="p-2.5 rounded-lg bg-[var(--bg-tertiary)] group-hover:bg-[var(--accent-cyan)]/10 transition-colors">
                {getIcon(prompt.iconName)}
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--bg-primary)] text-[var(--text-muted)] border border-[var(--border-color)]">
                {prompt.category}
              </span>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent-cyan)] transition-colors">
                {prompt.title}
              </h3>
              <p className="text-xs text-[var(--text-secondary)] mt-1 line-clamp-2">
                {prompt.subtitle}
              </p>
            </div>
          </button>
        ))}
      </div>

      {/* Feature Capabilities Pills */}
      <div className="flex flex-wrap items-center justify-center gap-3 pt-6 text-xs text-[var(--text-muted)] font-mono">
        <span className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-[var(--bg-tertiary)]/50 border border-[var(--border-color)]/30">
          <Zap size={12} className="text-[var(--accent-cyan)]" /> Real-time Telemetry
        </span>
        <span className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-[var(--bg-tertiary)]/50 border border-[var(--border-color)]/30">
          <Code2 size={12} className="text-emerald-400" /> Syntax Highlighting
        </span>
        <span className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-[var(--bg-tertiary)]/50 border border-[var(--border-color)]/30">
          <ShieldAlert size={12} className="text-rose-400" /> Ultron Zero-Trust
        </span>
      </div>
    </div>
  );
}
