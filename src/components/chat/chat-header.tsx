'use client';

import React, { useState } from 'react';
import { useChat } from '@/context/chat-context';
import { ModelSelector } from './model-selector';
import Link from 'next/link';
import {
  BrainCircuit,
  Download,
  Menu,
  PanelLeft,
  Settings,
  ShieldAlert,
  Trash2,
  Zap,
} from 'lucide-react';

export function ChatHeader() {
  const {
    activeChat,
    toggleSidebar,
    setIsSettingsOpen,
    clearAllChats,
    exportChatHistory,
    persona,
    setPersona,
  } = useChat();

  const [showExportMenu, setShowExportMenu] = useState(false);

  const togglePersona = () => {
    setPersona(persona === 'jarvis' ? 'ultron' : 'jarvis');
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 md:px-6 bg-[var(--bg-primary)]/80 backdrop-blur-md border-b border-[var(--border-color)]">
      {/* Left Section: Sidebar Toggle & Model Selector */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
          title="Toggle Sidebar (Ctrl+Shift+S)"
        >
          <PanelLeft size={18} />
        </button>

        <ModelSelector />
      </div>

      {/* Middle Section: Chat Title */}
      <div className="hidden md:flex items-center gap-2 max-w-xs lg:max-w-md truncate">
        <h2 className="text-xs font-semibold font-mono text-[var(--text-secondary)] truncate">
          {activeChat ? activeChat.title : 'J.A.R.V.I.S. Core Interface'}
        </h2>
      </div>

      {/* Right Section: Persona Toggle, Export, Settings */}
      <div className="flex items-center gap-2">
        {/* AI Playground Button */}
        <Link
          href="/playground"
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-mono border bg-[var(--bg-tertiary)] border-[var(--accent-cyan)]/40 text-[var(--accent-cyan)] hover:bg-[var(--accent-cyan)]/15 transition-all shadow-sm"
          title="AI Educational Playground"
        >
          <BrainCircuit size={14} />
          <span className="hidden sm:inline">Playground</span>
        </Link>

        {/* Persona Mode Switch */}
        <button
          onClick={togglePersona}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-mono border transition-all ${
            persona === 'ultron'
              ? 'bg-rose-950/60 text-rose-300 border-rose-800'
              : 'bg-cyan-950/60 text-cyan-300 border-cyan-800'
          }`}
          title="Toggle Persona Mode"
        >
          {persona === 'ultron' ? (
            <>
              <ShieldAlert size={14} className="text-rose-400" />
              <span className="hidden sm:inline">ULTRON</span>
            </>
          ) : (
            <>
              <Zap size={14} className="text-cyan-400" />
              <span className="hidden sm:inline">Jarvis AI</span>
            </>
          )}
        </button>

        {/* Export Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            disabled={!activeChat || activeChat.messages.length === 0}
            className="p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors disabled:opacity-40"
            title="Export Chat"
          >
            <Download size={18} />
          </button>
          {showExportMenu && activeChat && (
            <div className="absolute right-0 top-full mt-2 w-44 rounded-xl glass-panel p-1.5 shadow-xl z-50 text-xs font-mono space-y-1">
              <button
                onClick={() => {
                  exportChatHistory('markdown');
                  setShowExportMenu(false);
                }}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors text-[var(--text-primary)]"
              >
                📄 Export Markdown (.md)
              </button>
              <button
                onClick={() => {
                  exportChatHistory('json');
                  setShowExportMenu(false);
                }}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors text-[var(--text-primary)]"
              >
                📦 Export Raw JSON (.json)
              </button>
            </div>
          )}
        </div>

        {/* Settings Trigger */}
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
          title="Settings"
        >
          <Settings size={18} />
        </button>
      </div>
    </header>
  );
}
