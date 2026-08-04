'use client';

import React from 'react';
import { useChat } from '@/context/chat-context';
import { Search, X } from 'lucide-react';

export function ChatSearch() {
  const { searchQuery, setSearchQuery } = useChat();

  return (
    <div className="relative px-3 py-2">
      <div className="relative flex items-center">
        <Search size={14} className="absolute left-3 text-[var(--text-muted)] pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search protocols..."
          className="w-full pl-8 pr-8 py-1.5 rounded-xl bg-[var(--bg-tertiary)]/60 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] border border-[var(--border-color)]/40 focus:outline-none focus:border-[var(--accent-cyan)]/50 transition-colors font-mono"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-2.5 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
