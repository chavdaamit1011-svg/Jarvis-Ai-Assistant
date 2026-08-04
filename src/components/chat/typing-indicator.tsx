'use client';

import React from 'react';

export function TypingIndicator() {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--bg-tertiary)]/50 border border-[var(--border-color)]/30 w-fit">
      <div className="relative flex items-center justify-center w-4 h-4">
        <div className="absolute w-full h-full rounded-full border-2 border-[var(--accent-cyan)] border-t-transparent animate-spin" />
        <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent-cyan)] arc-glow" />
      </div>
      <span className="text-xs font-mono text-[var(--accent-cyan)] animate-pulse">
        Jarvis AI is synthesizing output...
      </span>
    </div>
  );
}

export function LoadingSkeleton() {
  return (
    <div className="w-full space-y-3 p-4 rounded-xl bg-[var(--chat-assistant-bg)] border border-[var(--border-color)]/40 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-[var(--accent-cyan)]/20" />
        <div className="h-4 w-32 bg-[var(--border-color)] rounded" />
      </div>
      <div className="space-y-2 pt-2">
        <div className="h-3 w-full bg-[var(--border-color)]/60 rounded" />
        <div className="h-3 w-4/5 bg-[var(--border-color)]/60 rounded" />
        <div className="h-3 w-2/3 bg-[var(--border-color)]/60 rounded" />
      </div>
    </div>
  );
}
