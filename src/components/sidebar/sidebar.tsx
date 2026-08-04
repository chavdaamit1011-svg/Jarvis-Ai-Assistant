'use client';

import React from 'react';
import { useChat } from '@/context/chat-context';
import { ChatSearch } from './chat-search';
import { ChatList } from './chat-list';
import { UserProfile } from './user-profile';
import Link from 'next/link';
import { Plus, Zap, X, ShieldAlert, BrainCircuit } from 'lucide-react';

export function Sidebar() {
  const {
    isSidebarOpen,
    setIsSidebarOpen,
    createNewChat,
    persona,
  } = useChat();

  if (!isSidebarOpen) return null;

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      <div
        onClick={() => setIsSidebarOpen(false)}
        className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      />

      {/* Sidebar Main Container */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 flex flex-col w-72 h-screen bg-[var(--bg-secondary)] border-r border-[var(--border-color)] transition-all duration-300 shadow-2xl ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)]/40">
          <div className="flex items-center gap-2.5">
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-xl text-white shadow-lg ${
                persona === 'ultron'
                  ? 'bg-gradient-to-br from-rose-600 to-red-800 arc-glow'
                  : 'bg-gradient-to-br from-cyan-500 to-blue-600 arc-glow'
              }`}
            >
              {persona === 'ultron' ? <ShieldAlert size={16} /> : <Zap size={16} />}
            </div>
            <div>
              <h1 className="text-sm font-bold font-mono tracking-wider text-[var(--text-primary)]">
                {persona === 'ultron' ? 'ULTRON' : 'Jarvis AI'}
              </h1>
              <p className="text-[9px] font-mono text-[var(--accent-cyan)]">STARK MAINFRAME</p>
            </div>
          </div>

          <button
            onClick={() => setIsSidebarOpen(false)}
            className="md:hidden p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            <X size={16} />
          </button>
        </div>

        {/* Primary CTA: New Chat & AI Playground */}
        <div className="p-3 space-y-2">
          <button
            onClick={() => createNewChat()}
            className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-gradient-to-r from-[var(--accent-cyan)] to-blue-600 text-slate-950 font-semibold font-mono text-xs shadow-lg hover:opacity-95 transition-all duration-200"
          >
            <div className="flex items-center gap-2">
              <Plus size={16} />
              <span>New Protocol</span>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/20 text-slate-900">
              Ctrl+N
            </span>
          </button>

          <Link
            href="/playground"
            className="w-full flex items-center justify-between px-4 py-2 rounded-xl bg-[var(--bg-tertiary)]/70 hover:bg-[var(--bg-tertiary)] border border-[var(--border-color)]/60 text-[var(--text-primary)] font-mono text-xs transition-all duration-200"
          >
            <div className="flex items-center gap-2 text-[var(--accent-cyan)] font-semibold">
              <BrainCircuit size={15} />
              <span>AI Playground</span>
            </div>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--accent-cyan)]/20 text-[var(--accent-cyan)]">
              Learn
            </span>
          </Link>
        </div>

        {/* Live Search Input */}
        <ChatSearch />

        {/* Scrollable Chat History List */}
        <ChatList />

        {/* User Profile Footer */}
        <UserProfile />
      </aside>
    </>
  );
}
