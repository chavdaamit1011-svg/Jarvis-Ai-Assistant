'use client';

import React, { useState, useRef, useEffect } from 'react';
import { AI_MODELS } from '@/lib/mock-data';
import { useChat } from '@/context/chat-context';
import { AIModelId } from '@/types/chat';
import { ChevronDown, Sparkles, Zap, ShieldAlert, Cpu, Check } from 'lucide-react';

export function ModelSelector() {
  const { activeModelId, setActiveModelId, setPersona } = useChat();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentModel = AI_MODELS.find((m) => m.id === activeModelId) || AI_MODELS[0];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectModel = (id: AIModelId) => {
    setActiveModelId(id);
    if (id === 'ultron-prime') {
      setPersona('ultron');
    } else {
      setPersona('jarvis');
    }
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] hover:border-[var(--accent-cyan)]/50 text-xs font-semibold transition-all shadow-sm"
      >
        <Zap size={14} className="text-[var(--accent-cyan)]" />
        <span className="text-[var(--text-primary)] font-mono">{currentModel.name}</span>
        {currentModel.badge && (
          <span className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] rounded bg-[var(--bg-tertiary)] text-[var(--accent-cyan)]">
            {currentModel.badge}
          </span>
        )}
        <ChevronDown size={14} className={`text-[var(--text-muted)] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-2 w-72 md:w-80 rounded-2xl glass-panel p-2 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-200">
          <div className="px-3 py-2 text-[10px] font-mono font-bold text-[var(--text-muted)] uppercase tracking-wider border-b border-[var(--border-color)]/30">
            Select Stark Core Engine
          </div>
          <div className="space-y-1 mt-1 max-h-72 overflow-y-auto">
            {AI_MODELS.map((model) => {
              const isSelected = model.id === activeModelId;
              return (
                <button
                  key={model.id}
                  onClick={() => handleSelectModel(model.id)}
                  className={`w-full flex items-start justify-between p-2.5 rounded-xl text-left transition-colors ${
                    isSelected
                      ? 'bg-[var(--accent-cyan)]/10 border border-[var(--accent-cyan)]/40'
                      : 'hover:bg-[var(--bg-tertiary)]'
                  }`}
                >
                  <div className="space-y-0.5 pr-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[var(--text-primary)] font-mono">
                        {model.name}
                      </span>
                      {model.badge && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-[var(--bg-tertiary)] text-[var(--accent-cyan)] border border-[var(--border-color)]">
                          {model.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[var(--text-muted)] line-clamp-2">
                      {model.description}
                    </p>
                    <div className="flex items-center gap-2 pt-1 text-[10px] text-[var(--text-secondary)] font-mono">
                      <span>⚡ {model.speed}</span>
                      <span>•</span>
                      <span>🧠 {model.contextLength}</span>
                    </div>
                  </div>
                  {isSelected && <Check size={16} className="text-[var(--accent-cyan)] mt-1 flex-shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
