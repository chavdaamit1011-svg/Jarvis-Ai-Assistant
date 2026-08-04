'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  ChevronRight,
  Cpu,
  Layers,
  Play,
  RotateCcw,
  Sparkles,
  Zap,
  HelpCircle,
  Sliders,
  Terminal,
} from 'lucide-react';

// Static Data for "I love Next.js"
const PIPELINE_STEPS = [
  {
    step: 1,
    title: '1. Raw Text Input',
    subtitle: 'Human-readable sentence string',
    icon: Terminal,
    color: 'from-blue-500 to-indigo-600',
  },
  {
    step: 2,
    title: '2. BPE Tokenization',
    subtitle: 'Sub-word chunking algorithm',
    icon: Layers,
    color: 'from-cyan-500 to-blue-600',
  },
  {
    step: 3,
    title: '3. Token Vocabulary IDs',
    subtitle: 'Mapping tokens to dictionary integers',
    icon: Cpu,
    color: 'from-emerald-500 to-teal-600',
  },
  {
    step: 4,
    title: '4. Embedding Vectors',
    subtitle: 'High-dimensional dense vector space',
    icon: Sparkles,
    color: 'from-amber-500 to-orange-600',
  },
  {
    step: 5,
    title: '5. Transformer Self-Attention',
    subtitle: 'Contextual attention weights & 32 layers',
    icon: BrainCircuit,
    color: 'from-purple-500 to-indigo-600',
  },
  {
    step: 6,
    title: '6. Next Token Logits & Softmax',
    subtitle: 'Probability distribution over vocabulary',
    icon: Sliders,
    color: 'from-rose-500 to-pink-600',
  },
  {
    step: 7,
    title: '7. Final Output Generation',
    subtitle: 'Appended next token & autoregressive stream',
    icon: Zap,
    color: 'from-cyan-400 to-emerald-400',
  },
];

const TOKENS_DATA = [
  {
    token: 'I',
    id: 40,
    color: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    vector: [0.42, -0.89, 0.15, 0.77],
    attentionWeights: { 'love': 0.75, 'Next': 0.62, '.js': 0.40 },
  },
  {
    token: ' love',
    id: 3021,
    color: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    vector: [0.91, 0.12, -0.54, 0.33],
    attentionWeights: { 'I': 0.75, 'Next': 0.88, '.js': 0.81 },
  },
  {
    token: ' Next',
    id: 4582,
    color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    vector: [-0.23, 0.88, 0.61, -0.05],
    attentionWeights: { 'love': 0.88, '.js': 0.95, 'I': 0.62 },
  },
  {
    token: '.',
    id: 13,
    color: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    vector: [0.05, -0.11, 0.02, 0.99],
    attentionWeights: { 'Next': 0.50, 'js': 0.80, 'love': 0.30 },
  },
  {
    token: 'js',
    id: 1829,
    color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    vector: [0.73, 0.45, -0.31, 0.68],
    attentionWeights: { 'Next': 0.95, 'love': 0.81, '.': 0.80 },
  },
];

const NEXT_TOKEN_PREDICTIONS = [
  { token: ' because', probability: 68.4, isSelected: true },
  { token: ' for', probability: 18.2, isSelected: false },
  { token: ' framework', probability: 8.5, isSelected: false },
  { token: ' web', probability: 4.9, isSelected: false },
];

export default function AIPlaygroundPage() {
  const [activeStep, setActiveStep] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedTokenIndex, setSelectedTokenIndex] = useState(0);
  const [temperature, setTemperature] = useState(0.7);

  // Auto animation stepper
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPlaying) {
      timer = setInterval(() => {
        setActiveStep((prev) => {
          if (prev >= 7) {
            setIsPlaying(false);
            return 1;
          }
          return prev + 1;
        });
      }, 3000);
    }
    return () => clearInterval(timer);
  }, [isPlaying]);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] font-sans antialiased selection:bg-[var(--accent-cyan)] selection:text-slate-950">
      {/* Top Header Navigation */}
      <header className="sticky top-0 z-40 flex items-center justify-between h-16 px-6 bg-[var(--bg-primary)]/90 backdrop-blur-md border-b border-[var(--border-color)]">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-color)] hover:border-[var(--accent-cyan)]/50 text-xs font-mono text-[var(--text-primary)] transition-all"
          >
            <ArrowLeft size={14} />
            <span>Back to Jarvis AI</span>
          </Link>

          <div className="h-4 w-[1px] bg-[var(--border-color)]" />

          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 text-white arc-glow">
              <BrainCircuit size={18} />
            </div>
            <div>
              <h1 className="text-sm font-bold font-mono tracking-wider">AI Playground</h1>
              <p className="text-[10px] font-mono text-[var(--accent-cyan)]">LLM Transformer Visualizer</p>
            </div>
          </div>
        </div>

        {/* Animation Playback Controls & Sub-Module Nav */}
        <div className="flex items-center gap-3">
          <Link
            href="/playground/tokenizer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--accent-cyan)]/40 text-xs font-mono text-[var(--accent-cyan)] hover:bg-[var(--accent-cyan)]/15 transition-all shadow-sm"
          >
            <Layers size={14} />
            <span>Open Tokenizer Visualizer</span>
          </Link>

          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-xl font-mono text-xs font-semibold transition-all shadow-lg ${
              isPlaying
                ? 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                : 'bg-[var(--accent-cyan)] text-slate-950 hover:opacity-90'
            }`}
          >
            {isPlaying ? (
              <>
                <RotateCcw size={14} className="animate-spin" />
                <span>Pause Auto-Walkthrough</span>
              </>
            ) : (
              <>
                <Play size={14} className="fill-current" />
                <span>Play Interactive Walkthrough</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-10">
        {/* Hero Banner */}
        <div className="relative overflow-hidden rounded-3xl glass-panel p-8 border border-[var(--border-color)] text-center space-y-4">
          <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
          <div className="absolute -left-16 -bottom-16 w-64 h-64 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--bg-tertiary)] border border-[var(--accent-cyan)]/30 text-xs font-mono text-[var(--accent-cyan)]">
            <Sparkles size={14} />
            <span>Interactive Educational Pipeline</span>
          </div>

          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-cyan-200 to-blue-400">
            How a Transformer LLM Processes a Sentence
          </h2>
          <p className="text-sm md:text-base text-[var(--text-secondary)] max-w-2xl mx-auto font-sans">
            Step-by-step visual breakdown of how Large Language Models convert raw human text into token IDs, embedding vectors, self-attention matrices, and next-token probability distributions.
          </p>

          {/* Target Sentence Box */}
          <div className="pt-4 max-w-lg mx-auto">
            <div className="flex items-center justify-between p-4 rounded-2xl bg-[var(--bg-primary)] border-2 border-[var(--accent-cyan)]/60 shadow-xl">
              <span className="text-xs font-mono text-[var(--text-muted)] uppercase tracking-wider">
                Target Example:
              </span>
              <span className="text-lg md:text-xl font-bold font-mono text-[var(--accent-cyan)]">
                &quot;I love Next.js&quot;
              </span>
            </div>
          </div>
        </div>

        {/* 7-Step Navigation Stepper Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
          {PIPELINE_STEPS.map((s) => {
            const isActive = activeStep === s.step;
            const Icon = s.icon;
            return (
              <button
                key={s.step}
                onClick={() => {
                  setActiveStep(s.step);
                  setIsPlaying(false);
                }}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition-all duration-300 ${
                  isActive
                    ? 'bg-gradient-to-b from-[var(--bg-tertiary)] to-[var(--bg-secondary)] border-[var(--accent-cyan)] shadow-xl scale-105'
                    : 'bg-[var(--bg-secondary)]/60 border-[var(--border-color)]/50 hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)]'
                }`}
              >
                <div
                  className={`p-2 rounded-xl text-white mb-2 shadow-md ${
                    isActive ? 'bg-gradient-to-br ' + s.color + ' arc-glow' : 'bg-[var(--bg-primary)]'
                  }`}
                >
                  <Icon size={16} />
                </div>
                <span className="text-[11px] font-bold font-mono text-[var(--text-primary)]">
                  Step {s.step}
                </span>
                <span className="text-[9px] font-mono text-[var(--text-muted)] truncate w-full mt-0.5">
                  {s.title.split('.')[1]}
                </span>
              </button>
            );
          })}
        </div>

        {/* Active Step Visual Showcase Card */}
        <div className="rounded-3xl glass-panel p-6 md:p-8 border border-[var(--border-color)] shadow-2xl space-y-8 animate-in fade-in duration-300">
          {/* Step Header */}
          <div className="flex items-center justify-between border-b border-[var(--border-color)]/40 pb-6">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white font-bold text-lg font-mono shadow-lg arc-glow">
                {activeStep}
              </div>
              <div>
                <h3 className="text-xl font-bold font-mono text-[var(--text-primary)]">
                  {PIPELINE_STEPS[activeStep - 1].title}
                </h3>
                <p className="text-xs text-[var(--text-muted)] font-mono">
                  {PIPELINE_STEPS[activeStep - 1].subtitle}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono text-[var(--text-muted)]">
              <button
                onClick={() => setActiveStep((p) => Math.max(1, p - 1))}
                disabled={activeStep === 1}
                className="px-3 py-1.5 rounded-xl bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] disabled:opacity-30 transition-colors"
              >
                Previous Step
              </button>
              <button
                onClick={() => setActiveStep((p) => Math.min(7, p + 1))}
                disabled={activeStep === 7}
                className="px-3 py-1.5 rounded-xl bg-[var(--accent-cyan)] text-slate-950 font-semibold hover:opacity-90 disabled:opacity-30 transition-all"
              >
                Next Step →
              </button>
            </div>
          </div>

          {/* STEP 1: RAW TEXT INPUT */}
          {activeStep === 1 && (
            <div className="space-y-6">
              <div className="p-6 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-color)] space-y-4">
                <div className="text-xs font-mono text-[var(--text-muted)] uppercase">Input Sentence String</div>
                <div className="text-3xl font-bold font-mono text-[var(--accent-cyan)] bg-[var(--bg-tertiary)]/50 p-6 rounded-xl border border-[var(--border-color)]/50 text-center">
                  &quot;I love Next.js&quot;
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
                <div className="p-4 rounded-xl bg-[var(--bg-tertiary)]/50 border border-[var(--border-color)] space-y-1">
                  <span className="text-[var(--text-muted)]">Length</span>
                  <div className="text-lg font-bold text-[var(--text-primary)]">14 Characters</div>
                </div>
                <div className="p-4 rounded-xl bg-[var(--bg-tertiary)]/50 border border-[var(--border-color)] space-y-1">
                  <span className="text-[var(--text-muted)]">Format</span>
                  <div className="text-lg font-bold text-emerald-400">UTF-8 Encoded Text</div>
                </div>
                <div className="p-4 rounded-xl bg-[var(--bg-tertiary)]/50 border border-[var(--border-color)] space-y-1">
                  <span className="text-[var(--text-muted)]">Model Perception</span>
                  <div className="text-lg font-bold text-rose-400">Raw Text (Unusable by Neural Net)</div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-blue-950/40 border border-blue-800 text-xs text-blue-200 leading-relaxed font-sans">
                💡 <strong>Why this step matters:</strong> Computers and neural networks cannot process raw English characters directly. Before any Transformer logic can execute, the input text must be split into structured mathematical units called <strong>Tokens</strong>.
              </div>
            </div>
          )}

          {/* STEP 2: TOKENIZATION */}
          {activeStep === 2 && (
            <div className="space-y-6">
              <div className="text-sm text-[var(--text-secondary)] font-sans">
                The Byte-Pair Encoding (BPE) algorithm splits the sentence into 5 discrete sub-word tokens:
              </div>

              {/* Tokens Visual Chips */}
              <div className="flex flex-wrap items-center justify-center gap-3 p-8 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-color)]">
                {TOKENS_DATA.map((t, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <div
                      className={`px-5 py-3 rounded-2xl border text-lg font-bold font-mono shadow-lg transition-transform hover:scale-110 ${t.color}`}
                    >
                      &quot;{t.token}&quot;
                    </div>
                    {idx < TOKENS_DATA.length - 1 && (
                      <ArrowRight size={16} className="text-[var(--text-muted)]" />
                    )}
                  </div>
                ))}
              </div>

              <div className="p-4 rounded-xl bg-cyan-950/40 border border-cyan-800 text-xs text-cyan-200 leading-relaxed font-sans">
                🔍 <strong>Sub-word Insight:</strong> Notice how <code>&quot;Next.js&quot;</code> was tokenized into three separate units: <code>&quot; Next&quot;</code>, <code>&quot;.&quot;</code>, and <code>&quot;js&quot;</code>. Sub-word tokenizers split code symbols, punctuation, and compound words so the model can handle any code or language vocabulary efficiently.
              </div>
            </div>
          )}

          {/* STEP 3: TOKEN VOCABULARY IDS */}
          {activeStep === 3 && (
            <div className="space-y-6">
              <div className="text-sm text-[var(--text-secondary)] font-sans">
                Each sub-word token is looked up in the LLM vocabulary dictionary (e.g. 100,000 words) and assigned a unique integer ID:
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
                {TOKENS_DATA.map((t, idx) => (
                  <div
                    key={idx}
                    className="p-5 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-center space-y-3 shadow-md"
                  >
                    <span className="text-xs font-mono text-[var(--text-muted)]">Token {idx + 1}</span>
                    <div className="text-base font-bold font-mono text-[var(--text-primary)]">
                      &quot;{t.token}&quot;
                    </div>
                    <div className="text-2xl font-extrabold font-mono text-[var(--accent-cyan)] p-2 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-color)]/40">
                      #{t.id}
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800 text-xs text-emerald-200 font-mono text-center">
                Numerical Token Vector Stream: <code>[40, 3021, 4582, 13, 1829]</code>
              </div>
            </div>
          )}

          {/* STEP 4: EMBEDDING VECTORS */}
          {activeStep === 4 && (
            <div className="space-y-6">
              <div className="text-sm text-[var(--text-secondary)] font-sans">
                Each Token ID is converted into a high-dimensional vector (e.g., 1,536 dimensions) representing its semantic meaning:
              </div>

              {/* Vector Heatmap Visualizer */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {TOKENS_DATA.map((t, idx) => (
                  <div
                    key={idx}
                    onClick={() => setSelectedTokenIndex(idx)}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                      selectedTokenIndex === idx
                        ? 'bg-[var(--bg-tertiary)] border-[var(--accent-cyan)] shadow-xl'
                        : 'bg-[var(--bg-primary)] border-[var(--border-color)] hover:border-[var(--accent-cyan)]/40'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3 text-xs font-mono">
                      <span className="font-bold text-[var(--accent-cyan)]">&quot;{t.token}&quot;</span>
                      <span className="text-[var(--text-muted)]">#{t.id}</span>
                    </div>

                    {/* Vector Slice Matrix */}
                    <div className="grid grid-cols-2 gap-1 font-mono text-[10px]">
                      {t.vector.map((val, vIdx) => (
                        <div
                          key={vIdx}
                          className={`p-1.5 rounded text-center font-bold ${
                            val > 0 ? 'bg-emerald-950/80 text-emerald-300' : 'bg-rose-950/80 text-rose-300'
                          }`}
                        >
                          {val > 0 ? `+${val}` : val}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-800 text-xs text-amber-200 font-sans">
                🧠 <strong>Semantic Vector Dimensions:</strong> In vector space, words with similar meanings (like &quot;love&quot;, &quot;like&quot;, &quot;enjoy&quot;) are positioned close together. Similarly, &quot;Next.js&quot; sits in the software/web technology vector region!
              </div>
            </div>
          )}

          {/* STEP 5: TRANSFORMER SELF-ATTENTION */}
          {activeStep === 5 && (
            <div className="space-y-6">
              <div className="text-sm text-[var(--text-secondary)] font-sans">
                The 32-layer Transformer applies <strong>Multi-Head Self-Attention</strong> to compute contextual relationships between words in the sentence:
              </div>

              {/* Interactive Attention Matrix */}
              <div className="p-6 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-color)] space-y-4">
                <div className="flex items-center justify-between text-xs font-mono text-[var(--accent-cyan)] font-bold">
                  <span>Self-Attention Weights Matrix</span>
                  <span>32 Layers • 16 Attention Heads</span>
                </div>

                <div className="space-y-3 font-mono text-xs">
                  {TOKENS_DATA.map((t, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[var(--text-primary)] font-bold">&quot;{t.token}&quot; Attention to Next.js</span>
                        <span className="text-[var(--accent-cyan)] font-bold">88.4%</span>
                      </div>
                      <div className="w-full h-2.5 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 arc-glow transition-all duration-500"
                          style={{ width: `${88.4 - idx * 10}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-purple-950/40 border border-purple-800 text-xs text-purple-200 font-sans">
                ✨ <strong>Self-Attention Magic:</strong> The word <code>&quot;love&quot;</code> pays high attention to <code>&quot;Next.js&quot;</code> and <code>&quot;I&quot;</code> to understand who loves what!
              </div>
            </div>
          )}

          {/* STEP 6: NEXT TOKEN PREDICTION */}
          {activeStep === 6 && (
            <div className="space-y-6">
              <div className="text-sm text-[var(--text-secondary)] font-sans">
                The final layer outputs probability distributions (Softmax Logits) predicting the most likely <strong>next token</strong>:
              </div>

              {/* Temperature Control */}
              <div className="p-4 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] flex items-center justify-between">
                <span className="text-xs font-mono text-[var(--text-muted)]">Temperature Control ({temperature})</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={temperature}
                  onChange={(e) => setTemperature(Number(e.target.value))}
                  className="w-48 accent-[var(--accent-cyan)]"
                />
              </div>

              {/* Next Token Probability Bar Chart */}
              <div className="space-y-3 font-mono text-xs">
                {NEXT_TOKEN_PREDICTIONS.map((pred, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-2xl border transition-all ${
                      pred.isSelected
                        ? 'bg-[var(--accent-cyan)]/15 border-[var(--accent-cyan)] shadow-lg'
                        : 'bg-[var(--bg-primary)] border-[var(--border-color)]/60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-[var(--text-primary)]">
                          &quot;{pred.token}&quot;
                        </span>
                        {pred.isSelected && (
                          <span className="px-2 py-0.5 rounded text-[10px] bg-[var(--accent-cyan)] text-slate-950 font-bold">
                            SELECTED TOKEN ⭐
                          </span>
                        )}
                      </div>
                      <span className="font-extrabold text-[var(--accent-cyan)]">{pred.probability}%</span>
                    </div>

                    <div className="w-full h-3 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
                          pred.isSelected ? 'bg-gradient-to-r from-cyan-400 to-emerald-400 arc-glow' : 'bg-slate-600'
                        }`}
                        style={{ width: `${pred.probability}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 7: FINAL OUTPUT GENERATION */}
          {activeStep === 7 && (
            <div className="space-y-6">
              <div className="text-sm text-[var(--text-secondary)] font-sans">
                The predicted token <code>&quot; because&quot;</code> is appended to the prompt, and the autoregressive loop repeats to generate the full completion:
              </div>

              {/* Completion Box */}
              <div className="p-6 rounded-2xl bg-[var(--bg-primary)] border-2 border-emerald-500/60 shadow-2xl space-y-3">
                <div className="flex items-center justify-between text-xs font-mono text-emerald-400 font-bold">
                  <span>Generated Completion Stream</span>
                  <span>Status: COMPLETED</span>
                </div>
                <div className="text-xl md:text-2xl font-bold font-mono text-[var(--text-primary)] leading-relaxed">
                  &quot;I love Next.js{' '}
                  <span className="text-emerald-400 underline decoration-emerald-500">
                    because it makes building fullstack web apps fast and effortless.
                  </span>
                  &quot;
                </div>
              </div>

              <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800 text-xs text-emerald-200 font-sans text-center">
                🎉 <strong>Full Generation Complete!</strong> The LLM generated a fluent, contextually rich continuation token-by-token.
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
