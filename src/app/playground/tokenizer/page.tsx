'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  BookOpen,
  Check,
  Copy,
  Cpu,
  Database,
  Hash,
  Layers,
  Sparkles,
  Terminal,
  RotateCcw,
} from 'lucide-react';

interface MockToken {
  id: number;
  text: string;
  displayValue: string;
  colorClass: string;
  byteLength: number;
  type: 'word' | 'subword' | 'punctuation' | 'number' | 'whitespace';
}

const PRESET_EXAMPLES = [
  "I love Next.js and AI",
  "function calculateTotal(items: Item[]) { return items.reduce((a, b) => a + b, 0); }",
  "GPT-4o tokenizes text into sub-words with Byte-Pair Encoding.",
  "Artificial Intelligence & Machine Learning 2026",
];

const COLOR_PALETTE = [
  'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 hover:bg-cyan-500/30',
  'bg-purple-500/20 text-purple-300 border-purple-500/50 hover:bg-purple-500/30',
  'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 hover:bg-emerald-500/30',
  'bg-rose-500/20 text-rose-300 border-rose-500/50 hover:bg-rose-500/30',
  'bg-amber-500/20 text-amber-300 border-amber-500/50 hover:bg-amber-500/30',
  'bg-blue-500/20 text-blue-300 border-blue-500/50 hover:bg-blue-500/30',
  'bg-indigo-500/20 text-indigo-300 border-indigo-500/50 hover:bg-indigo-500/30',
  'bg-teal-500/20 text-teal-300 border-teal-500/50 hover:bg-teal-500/30',
];

export function TokenizerPractical() {
  const [inputText, setInputText] = useState(PRESET_EXAMPLES[0]);
  const [contextLimit, setContextLimit] = useState(128000); // 128K context window
  const [copiedTokens, setCopiedTokens] = useState(false);
  const [hoveredTokenIndex, setHoveredTokenIndex] = useState<number | null>(null);

  // Mock BPE Tokenizer Engine
  const tokens: MockToken[] = useMemo(() => {
    if (!inputText) return [];

    // Split text into sub-word chunks, code symbols, numbers, and spaces
    const rawChunks = inputText.match(/(\s+)|([A-Z][a-z]+)|([a-z]+)|([A-Z]+)|(\d+)|([^\s\w])/g) || [inputText];
    
    return rawChunks.map((chunk, index) => {
      // Generate deterministic pseudo-random Token ID based on string hash
      let hash = 0;
      for (let i = 0; i < chunk.length; i++) {
        hash = (hash << 5) - hash + chunk.charCodeAt(i);
        hash |= 0;
      }
      const tokenId = Math.abs(hash % 90000) + 100;
      const colorClass = COLOR_PALETTE[index % COLOR_PALETTE.length];

      let type: MockToken['type'] = 'word';
      if (/^\s+$/.test(chunk)) type = 'whitespace';
      else if (/^\d+$/.test(chunk)) type = 'number';
      else if (/^[^\s\w]+$/.test(chunk)) type = 'punctuation';
      else if (chunk.length <= 3 && index > 0) type = 'subword';

      // Visual representation of leading space using 'Ġ' symbol like GPT-4
      const displayValue = chunk.replace(/ /g, 'Ġ').replace(/\n/g, '↵');

      return {
        id: tokenId,
        text: chunk,
        displayValue,
        colorClass,
        byteLength: new TextEncoder().encode(chunk).length,
        type,
      };
    });
  }, [inputText]);

  const tokenCount = tokens.length;
  const characterCount = inputText.length;
  const byteCount = new TextEncoder().encode(inputText).length;
  const tokenToCharRatio = characterCount > 0 ? (tokenCount / characterCount).toFixed(2) : '0';
  const contextPercentage = ((tokenCount / contextLimit) * 100).toFixed(4);
  const estimatedCost = ((tokenCount / 1000000) * 2.50).toFixed(6); // $2.50 per 1M tokens

  const handleCopyTokenIds = () => {
    const ids = tokens.map((t) => t.id).join(', ');
    navigator.clipboard.writeText(`[${ids}]`);
    setCopiedTokens(true);
    setTimeout(() => setCopiedTokens(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] font-sans antialiased selection:bg-[var(--accent-cyan)] selection:text-slate-950">
      {/* Header Bar */}
      <header className="sticky top-0 z-40 flex items-center justify-between h-16 px-6 bg-[var(--bg-primary)]/90 backdrop-blur-md border-b border-[var(--border-color)]">
        <div className="flex items-center gap-4">
          <Link
            href="/playground"
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-color)] hover:border-[var(--accent-cyan)]/50 text-xs font-mono text-[var(--text-primary)] transition-all"
          >
            <ArrowLeft size={14} />
            <span>Back to LLM Pipeline</span>
          </Link>

          <div className="h-4 w-[1px] bg-[var(--border-color)]" />

          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-cyan-500 to-indigo-600 text-white arc-glow">
              <Layers size={18} />
            </div>
            <div>
              <h1 className="text-sm font-bold font-mono tracking-wider">Tokenizer Visualizer</h1>
              <p className="text-[10px] font-mono text-[var(--accent-cyan)]">BPE Sub-word Decomposition Engine</p>
            </div>
          </div>
        </div>

        {/* Quick Presets Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-[var(--text-muted)] hidden md:inline">Presets:</span>
          <select
            onChange={(e) => setInputText(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-cyan)]"
          >
            {PRESET_EXAMPLES.map((ex, idx) => (
              <option key={idx} value={ex}>
                {ex.slice(0, 32)}...
              </option>
            ))}
          </select>
        </div>
      </header>

      {/* Main Visualizer Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Banner Section */}
        <div className="relative overflow-hidden rounded-3xl glass-panel p-6 md:p-8 border border-[var(--border-color)] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--bg-tertiary)] border border-[var(--accent-cyan)]/30 text-xs font-mono text-[var(--accent-cyan)]">
              <Sparkles size={14} />
              <span>Byte-Pair Encoding (BPE) Interactive Sandbox</span>
            </div>
            <button
              onClick={() => setInputText('')}
              className="flex items-center gap-1 text-xs font-mono text-[var(--text-muted)] hover:text-rose-400"
            >
              <RotateCcw size={14} /> Clear Input
            </button>
          </div>

          <h2 className="text-2xl md:text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-cyan-200 to-blue-400">
            Interactive Tokenizer Visualizer
          </h2>
          <p className="text-xs md:text-sm text-[var(--text-secondary)] max-w-3xl">
            Large Language Models do not see text as human words. They break text down into sub-words, spaces, and punctuation tokens. Type any sentence or code snippet below to visualize real-time token boundaries, Token IDs, and context window metrics.
          </p>
        </div>

        {/* Input Textarea & Live Token Box Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Live Input Textarea */}
          <div className="rounded-3xl glass-panel p-6 border border-[var(--border-color)] space-y-4 flex flex-col justify-between shadow-xl">
            <div className="flex items-center justify-between border-b border-[var(--border-color)]/40 pb-3">
              <div className="flex items-center gap-2">
                <Terminal size={16} className="text-[var(--accent-cyan)]" />
                <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-[var(--text-primary)]">
                  Input Sentence / Code Text
                </h3>
              </div>
              <span className="text-[11px] font-mono text-[var(--text-muted)]">
                {characterCount} chars • {byteCount} bytes
              </span>
            </div>

            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type your prompt, sentence, or code snippet here..."
              rows={8}
              className="w-full resize-none bg-[var(--bg-primary)] p-4 rounded-2xl text-sm font-mono text-[var(--text-primary)] placeholder-[var(--text-muted)] border border-[var(--border-color)] focus:outline-none focus:border-[var(--accent-cyan)] leading-relaxed shadow-inner"
            />

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-3 gap-3 pt-2 font-mono text-xs">
              <div className="p-3 rounded-xl bg-[var(--bg-tertiary)]/60 border border-[var(--border-color)]/50 text-center">
                <span className="text-[var(--text-muted)] text-[10px] block">Tokens</span>
                <span className="text-lg font-bold text-[var(--accent-cyan)]">{tokenCount}</span>
              </div>
              <div className="p-3 rounded-xl bg-[var(--bg-tertiary)]/60 border border-[var(--border-color)]/50 text-center">
                <span className="text-[var(--text-muted)] text-[10px] block">Chars / Token</span>
                <span className="text-lg font-bold text-emerald-400">{tokenToCharRatio}</span>
              </div>
              <div className="p-3 rounded-xl bg-[var(--bg-tertiary)]/60 border border-[var(--border-color)]/50 text-center">
                <span className="text-[var(--text-muted)] text-[10px] block">Est. Cost</span>
                <span className="text-lg font-bold text-amber-400">${estimatedCost}</span>
              </div>
            </div>
          </div>

          {/* Right Column: Live Colored Token Blocks */}
          <div className="rounded-3xl glass-panel p-6 border border-[var(--border-color)] space-y-4 flex flex-col justify-between shadow-xl">
            <div className="flex items-center justify-between border-b border-[var(--border-color)]/40 pb-3">
              <div className="flex items-center gap-2">
                <Layers size={16} className="text-purple-400" />
                <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-[var(--text-primary)]">
                  Live Token Boundaries
                </h3>
              </div>
              <span className="text-[11px] font-mono text-[var(--accent-cyan)]">
                Ġ symbol indicates space
              </span>
            </div>

            {/* Token Chips Container */}
            <div className="p-4 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-color)] min-h-[160px] flex flex-wrap gap-2 items-start content-start overflow-y-auto max-h-64">
              {tokens.map((t, idx) => (
                <div
                  key={idx}
                  onMouseEnter={() => setHoveredTokenIndex(idx)}
                  onMouseLeave={() => setHoveredTokenIndex(null)}
                  className={`group relative px-3 py-1.5 rounded-xl border font-mono text-xs font-semibold transition-all duration-200 cursor-pointer shadow-md ${t.colorClass} ${
                    hoveredTokenIndex === idx ? 'scale-110 shadow-lg z-10' : ''
                  }`}
                >
                  <span>{t.displayValue}</span>

                  {/* Token Tooltip Popup */}
                  {hoveredTokenIndex === idx && (
                    <div className="absolute left-1/2 bottom-full mb-2 -translate-x-1/2 w-48 p-3 rounded-xl glass-panel bg-[var(--bg-secondary)] border border-[var(--accent-cyan)] shadow-2xl text-[10px] space-y-1 z-50 pointer-events-none animate-in fade-in zoom-in-95">
                      <div className="font-bold text-[var(--accent-cyan)] border-b border-[var(--border-color)]/40 pb-1 flex justify-between">
                        <span>Token #{idx + 1}</span>
                        <span className="uppercase text-[9px] px-1 rounded bg-[var(--bg-tertiary)]">
                          {t.type}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--text-muted)]">Token ID:</span>
                        <span className="font-bold text-[var(--text-primary)]">#{t.id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--text-muted)]">Byte Length:</span>
                        <span className="font-bold text-[var(--text-primary)]">{t.byteLength} bytes</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {tokens.length === 0 && (
                <div className="w-full text-center py-12 text-xs font-mono text-[var(--text-muted)]">
                  Type text in the input box to visualize tokens in real-time...
                </div>
              )}
            </div>

            {/* Token Summary Footer */}
            <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-800 text-xs text-purple-200 font-mono flex items-center justify-between">
              <span>Token Count: {tokenCount} tokens</span>
              <span>Sub-word BPE Rank: Optimal</span>
            </div>
          </div>
        </div>

        {/* Token IDs Stream Array & Table */}
        <div className="rounded-3xl glass-panel p-6 border border-[var(--border-color)] space-y-6 shadow-2xl">
          <div className="flex items-center justify-between border-b border-[var(--border-color)]/40 pb-4">
            <div className="flex items-center gap-2">
              <Hash size={18} className="text-emerald-400" />
              <h3 className="text-sm font-bold font-mono uppercase tracking-wider text-[var(--text-primary)]">
                Numerical Token ID Vector Stream
              </h3>
            </div>

            <button
              onClick={handleCopyTokenIds}
              disabled={tokens.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-color)] hover:border-[var(--accent-cyan)] text-xs font-mono text-[var(--text-primary)] transition-all disabled:opacity-30"
            >
              {copiedTokens ? (
                <>
                  <Check size={14} className="text-emerald-400" />
                  <span className="text-emerald-400">Copied IDs!</span>
                </>
              ) : (
                <>
                  <Copy size={14} />
                  <span>Copy Token IDs Array</span>
                </>
              )}
            </button>
          </div>

          {/* Array Representation Box */}
          <div className="p-4 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-color)] font-mono text-xs overflow-x-auto text-[var(--accent-cyan)] font-semibold">
            [ {tokens.map((t) => t.id).join(', ')} ]
          </div>

          {/* Detailed Token Mapping Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs border-collapse">
              <thead>
                <tr className="border-b border-[var(--border-color)]/50 text-[var(--text-muted)] uppercase text-[10px]">
                  <th className="py-2.5 px-3">Index</th>
                  <th className="py-2.5 px-3">Token String</th>
                  <th className="py-2.5 px-3">Token ID</th>
                  <th className="py-2.5 px-3">Bytes</th>
                  <th className="py-2.5 px-3">Token Type</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]/20">
                {tokens.map((t, idx) => (
                  <tr key={idx} className="hover:bg-[var(--bg-tertiary)]/50 transition-colors">
                    <td className="py-2 px-3 text-[var(--text-muted)]">#{idx + 1}</td>
                    <td className="py-2 px-3 font-bold text-[var(--accent-cyan)]">&quot;{t.displayValue}&quot;</td>
                    <td className="py-2 px-3 text-[var(--text-primary)]">#{t.id}</td>
                    <td className="py-2 px-3 text-[var(--text-muted)]">{t.byteLength}B</td>
                    <td className="py-2 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border border-[var(--border-color)]">
                        {t.type}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Context Window Capacity Gauge Meter */}
        <div className="rounded-3xl glass-panel p-6 border border-[var(--border-color)] space-y-6 shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-color)]/40 pb-4">
            <div className="flex items-center gap-2">
              <Database size={18} className="text-amber-400" />
              <div>
                <h3 className="text-sm font-bold font-mono uppercase tracking-wider text-[var(--text-primary)]">
                  Context Window Capacity Meter
                </h3>
                <p className="text-xs text-[var(--text-muted)] font-mono">
                  Visualizing token budget usage against maximum LLM context limits
                </p>
              </div>
            </div>

            {/* Context Limit Picker */}
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="text-[var(--text-muted)]">Select LLM Model Context:</span>
              <select
                value={contextLimit}
                onChange={(e) => setContextLimit(Number(e.target.value))}
                className="px-3 py-1.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--accent-cyan)] font-bold focus:outline-none"
              >
                <option value={8192}>8,192 Tokens (GPT-4)</option>
                <option value={32768}>32,768 Tokens (Claude 3)</option>
                <option value={128000}>128,000 Tokens (GPT-4o)</option>
                <option value={200000}>200,000 Tokens (Jarvis AI Core)</option>
              </select>
            </div>
          </div>

          {/* Progress Gauge */}
          <div className="space-y-3 font-mono">
            <div className="flex justify-between text-xs">
              <span className="text-[var(--text-primary)]">
                Used: <strong>{tokenCount} tokens</strong> / {contextLimit.toLocaleString()} tokens
              </span>
              <span className="text-[var(--accent-cyan)] font-bold">{contextPercentage}% Capacity</span>
            </div>

            <div className="w-full h-4 rounded-full bg-[var(--bg-primary)] p-0.5 border border-[var(--border-color)] overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 arc-glow transition-all duration-500"
                style={{ width: `${Math.max(1, Number(contextPercentage))}%` }}
              />
            </div>
          </div>
        </div>

        {/* Educational FAQ Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 font-sans text-xs">
          <div className="p-6 rounded-2xl glass-panel border border-[var(--border-color)] space-y-2">
            <div className="flex items-center gap-2 text-[var(--accent-cyan)] font-bold text-sm font-mono">
              <BookOpen size={16} /> What is Byte-Pair Encoding (BPE)?
            </div>
            <p className="text-[var(--text-secondary)] leading-relaxed">
              BPE is an iterative sub-word tokenization technique. It builds a vocabulary by repeatedly merging the most frequent pairs of characters in a text dataset, allowing the model to represent rare or new words by combining smaller sub-word chunks.
            </p>
          </div>

          <div className="p-6 rounded-2xl glass-panel border border-[var(--border-color)] space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm font-mono">
              <Cpu size={16} /> Why do tokens cost money in AI APIs?
            </div>
            <p className="text-[var(--text-secondary)] leading-relaxed">
              LLMs perform matrix computations proportional to the number of tokens processed. Every token requires GPU memory and floating-point operations (FLOPs), which is why API providers charge per 1 Million tokens generated.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function TokenizerVisualizerPage() { return <TokenizerPractical />; }
