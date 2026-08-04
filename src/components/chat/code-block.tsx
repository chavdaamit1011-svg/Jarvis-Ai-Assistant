'use client';

import React, { useState } from 'react';
import { Check, Copy, Terminal } from 'lucide-react';

interface CodeBlockProps {
  language: string;
  value: string;
}

export function CodeBlock({ language, value }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lines = value.trim().split('\n');

  return (
    <div className="my-4 rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] overflow-hidden shadow-lg">
      {/* Code Header Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[var(--bg-tertiary)] border-b border-[var(--border-color)] text-xs font-mono">
        <div className="flex items-center gap-2 text-[var(--accent-cyan)] font-semibold uppercase tracking-wider">
          <Terminal size={14} />
          <span>{language || 'code'}</span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[var(--bg-secondary)] hover:bg-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          title="Copy Code"
        >
          {copied ? (
            <>
              <Check size={14} className="text-emerald-400" />
              <span className="text-emerald-400">Copied!</span>
            </>
          ) : (
            <>
              <Copy size={14} />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code Snippet Lines */}
      <div className="p-4 overflow-x-auto text-xs font-mono leading-relaxed flex">
        {/* Line Numbers */}
        <div className="select-none text-[var(--text-muted)] pr-4 border-r border-[var(--border-color)]/30 text-right min-w-[2.5rem]">
          {lines.map((_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>
        {/* Code Content */}
        <pre className="pl-4 m-0 border-0 p-0 bg-transparent overflow-visible text-[var(--text-primary)] flex-1">
          <code>{value}</code>
        </pre>
      </div>
    </div>
  );
}
