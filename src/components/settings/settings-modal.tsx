'use client';

import React, { useState } from 'react';
import { useChat } from '@/context/chat-context';
import { useTheme } from '@/context/theme-context';
import { AI_MODELS } from '@/lib/mock-data';
import { ThemeMode } from '@/types/chat';
import {
  Download,
  Keyboard,
  Moon,
  Sliders,
  Sun,
  Trash2,
  X,
  Zap,
  Flame,
  Volume2,
} from 'lucide-react';

export function SettingsModal() {
  const {
    isSettingsOpen,
    setIsSettingsOpen,
    settings,
    updateSettings,
    clearAllChats,
    exportChatHistory,
  } = useChat();

  const { theme, setTheme } = useTheme();

  const [activeTab, setActiveTab] = useState<'general' | 'models' | 'data' | 'shortcuts'>('general');
  const [confirmClear, setConfirmClear] = useState(false);

  if (!isSettingsOpen) return null;

  const handleClear = () => {
    clearAllChats();
    setConfirmClear(false);
    setIsSettingsOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-2xl glass-panel bg-[var(--bg-secondary)] border border-[var(--border-color)] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-color)]/40">
          <div className="flex items-center gap-2">
            <Sliders size={18} className="text-[var(--accent-cyan)]" />
            <h2 className="text-base font-bold font-mono text-[var(--text-primary)]">
              J.A.R.V.I.S. Mainframe Configuration
            </h2>
          </div>
          <button
            onClick={() => setIsSettingsOpen(false)}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Layout */}
        <div className="flex flex-col sm:flex-row flex-1 overflow-hidden">
          {/* Navigation Tabs */}
          <div className="w-full sm:w-48 p-3 border-b sm:border-b-0 sm:border-r border-[var(--border-color)]/30 space-y-1 bg-[var(--bg-primary)]/40 font-mono text-xs">
            <button
              onClick={() => setActiveTab('general')}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left transition-colors ${
                activeTab === 'general'
                  ? 'bg-[var(--accent-cyan)]/15 text-[var(--accent-cyan)] font-semibold border border-[var(--accent-cyan)]/30'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
              }`}
            >
              <Zap size={14} /> General
            </button>
            <button
              onClick={() => setActiveTab('models')}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left transition-colors ${
                activeTab === 'models'
                  ? 'bg-[var(--accent-cyan)]/15 text-[var(--accent-cyan)] font-semibold border border-[var(--accent-cyan)]/30'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
              }`}
            >
              <Sliders size={14} /> Custom Instructions
            </button>
            <button
              onClick={() => setActiveTab('data')}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left transition-colors ${
                activeTab === 'data'
                  ? 'bg-[var(--accent-cyan)]/15 text-[var(--accent-cyan)] font-semibold border border-[var(--accent-cyan)]/30'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
              }`}
            >
              <Download size={14} /> Data & Storage
            </button>
            <button
              onClick={() => setActiveTab('shortcuts')}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left transition-colors ${
                activeTab === 'shortcuts'
                  ? 'bg-[var(--accent-cyan)]/15 text-[var(--accent-cyan)] font-semibold border border-[var(--accent-cyan)]/30'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
              }`}
            >
              <Keyboard size={14} /> Keyboard Shortcuts
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 p-6 overflow-y-auto space-y-6 text-sm">
            {activeTab === 'general' && (
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-mono font-semibold text-[var(--text-muted)] uppercase mb-3">
                    Color Palette & Theme Mode
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      onClick={() => setTheme('dark')}
                      className={`flex flex-col items-center gap-2 p-3 rounded-xl border text-xs font-mono transition-all ${
                        theme === 'dark'
                          ? 'border-[var(--accent-cyan)] bg-[var(--accent-cyan)]/10 text-[var(--text-primary)]'
                          : 'border-[var(--border-color)] hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'
                      }`}
                    >
                      <Moon size={18} className="text-cyan-400" />
                      <span>Dark Theme</span>
                    </button>
                    <button
                      onClick={() => setTheme('light')}
                      className={`flex flex-col items-center gap-2 p-3 rounded-xl border text-xs font-mono transition-all ${
                        theme === 'light'
                          ? 'border-[var(--accent-cyan)] bg-[var(--accent-cyan)]/10 text-[var(--text-primary)]'
                          : 'border-[var(--border-color)] hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'
                      }`}
                    >
                      <Sun size={18} className="text-amber-500" />
                      <span>Light Theme</span>
                    </button>
                    <button
                      onClick={() => setTheme('ultron')}
                      className={`flex flex-col items-center gap-2 p-3 rounded-xl border text-xs font-mono transition-all ${
                        theme === 'ultron'
                          ? 'border-rose-500 bg-rose-950/30 text-rose-300'
                          : 'border-[var(--border-color)] hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'
                      }`}
                    >
                      <Flame size={18} className="text-rose-500" />
                      <span>Ultron Red</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-[var(--border-color)]/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-[var(--text-primary)]">Stream Speed</h4>
                      <p className="text-xs text-[var(--text-muted)]">Adjust simulated text generation delay.</p>
                    </div>
                    <span className="font-mono text-xs text-[var(--accent-cyan)]">{settings.streamSpeed} ms/chunk</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="5"
                    value={settings.streamSpeed}
                    onChange={(e) => updateSettings({ streamSpeed: Number(e.target.value) })}
                    className="w-full accent-[var(--accent-cyan)]"
                  />
                </div>
              </div>
            )}

            {activeTab === 'models' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-mono font-semibold text-[var(--text-muted)] uppercase mb-2">
                    Default Stark AI Core
                  </label>
                  <select
                    value={settings.defaultModel}
                    onChange={(e) => updateSettings({ defaultModel: e.target.value as any })}
                    className="w-full p-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] font-mono focus:outline-none focus:border-[var(--accent-cyan)]"
                  >
                    {AI_MODELS.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.provider})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono font-semibold text-[var(--text-muted)] uppercase mb-2">
                    System Instructions & Persona
                  </label>
                  <textarea
                    value={settings.systemPrompt}
                    onChange={(e) => updateSettings({ systemPrompt: e.target.value })}
                    rows={4}
                    className="w-full p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] font-mono focus:outline-none focus:border-[var(--accent-cyan)]"
                    placeholder="Set custom rules or persona instructions for J.A.R.V.I.S..."
                  />
                </div>
              </div>
            )}

            {activeTab === 'data' && (
              <div className="space-y-6">
                <div>
                  <h4 className="font-semibold text-[var(--text-primary)] mb-1">Export Chat Telemetry</h4>
                  <p className="text-xs text-[var(--text-muted)] mb-3">Download active chat session locally.</p>
                  <div className="flex gap-3 font-mono text-xs">
                    <button
                      onClick={() => exportChatHistory('markdown')}
                      className="px-4 py-2 rounded-xl border border-[var(--border-color)] hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)] transition-colors"
                    >
                      Export .MD
                    </button>
                    <button
                      onClick={() => exportChatHistory('json')}
                      className="px-4 py-2 rounded-xl border border-[var(--border-color)] hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)] transition-colors"
                    >
                      Export .JSON
                    </button>
                  </div>
                </div>

                <div className="pt-4 border-t border-[var(--border-color)]/30">
                  <h4 className="font-semibold text-rose-400 mb-1">Clear All Protocol Logs</h4>
                  <p className="text-xs text-[var(--text-muted)] mb-3">
                    Permanently delete all chat history stored in local storage.
                  </p>
                  {confirmClear ? (
                    <div className="flex items-center gap-3">
                      <button
                        onClick={handleClear}
                        className="px-4 py-2 rounded-xl bg-rose-600 text-white font-mono text-xs font-semibold hover:bg-rose-700 transition-colors"
                      >
                        Confirm Delete All
                      </button>
                      <button
                        onClick={() => setConfirmClear(false)}
                        className="px-4 py-2 rounded-xl border border-[var(--border-color)] text-xs font-mono hover:bg-[var(--bg-tertiary)]"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmClear(true)}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-950/40 text-rose-300 border border-rose-800 text-xs font-mono hover:bg-rose-900/50 transition-colors"
                    >
                      <Trash2 size={14} /> Clear All Chats
                    </button>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'shortcuts' && (
              <div className="space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)]/40">
                  <span className="text-[var(--text-secondary)]">New Chat / Protocol</span>
                  <span className="px-2 py-0.5 rounded bg-[var(--bg-tertiary)] text-[var(--accent-cyan)] font-bold">
                    Ctrl + N
                  </span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)]/40">
                  <span className="text-[var(--text-secondary)]">Toggle Left Sidebar</span>
                  <span className="px-2 py-0.5 rounded bg-[var(--bg-tertiary)] text-[var(--accent-cyan)] font-bold">
                    Ctrl + Shift + S
                  </span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)]/40">
                  <span className="text-[var(--text-secondary)]">Search Chat History</span>
                  <span className="px-2 py-0.5 rounded bg-[var(--bg-tertiary)] text-[var(--accent-cyan)] font-bold">
                    Ctrl + K
                  </span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)]/40">
                  <span className="text-[var(--text-secondary)]">Submit Message</span>
                  <span className="px-2 py-0.5 rounded bg-[var(--bg-tertiary)] text-[var(--accent-cyan)] font-bold">
                    Enter
                  </span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)]/40">
                  <span className="text-[var(--text-secondary)]">New Line in Composer</span>
                  <span className="px-2 py-0.5 rounded bg-[var(--bg-tertiary)] text-[var(--accent-cyan)] font-bold">
                    Shift + Enter
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
