'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '@/context/chat-context';
import {
  Code,
  Globe,
  Paperclip,
  Send,
  Square,
} from 'lucide-react';

const MAX_MESSAGE_LENGTH = 8000;

export function ChatInput() {
  const { sendMessage, stopGenerating, isStreaming, persona } = useChat();
  const [input, setInput] = useState('');
  const [webSearch, setWebSearch] = useState(false);
  const [codeMode, setCodeMode] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto expand textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || input.trim().length > MAX_MESSAGE_LENGTH || isStreaming) return;

    let finalPrompt = input.trim();
    // Web search is not connected yet. Keep the visual control without claiming
    // that the assistant has live access; the server prompt explains this too.
    void webSearch;
    if (codeMode) finalPrompt = `[Code Mode]: ${finalPrompt}`;

    sendMessage(finalPrompt);
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="sticky bottom-0 z-20 w-full px-4 pb-4 md:pb-6 pt-2 bg-gradient-to-t from-[var(--bg-primary)] via-[var(--bg-primary)] to-transparent">
      <div className="max-w-4xl mx-auto">
        <form
          onSubmit={handleSubmit}
          className="relative rounded-2xl glass-panel p-3 shadow-2xl focus-within:border-[var(--accent-cyan)]/70 transition-all duration-300"
        >
          {/* Main Textarea */}
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              persona === 'ultron'
                ? 'Input command parameter for ULTRON engine...'
                : 'Ask J.A.R.V.I.S. anything or enter code (Shift+Enter for newline)...'
            }
            rows={1}
            maxLength={MAX_MESSAGE_LENGTH}
            className="w-full resize-none bg-transparent px-2 py-1 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none max-h-48 font-sans"
          />

          {/* Composer Action Toolbar */}
          <div className="flex items-center justify-between pt-2 mt-1 border-t border-[var(--border-color)]/30">
            {/* Left Tools */}
            <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] font-mono">
              <button
                type="button"
                className="p-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-colors"
                title="Attach File"
              >
                <Paperclip size={16} />
              </button>

              <button
                type="button"
                onClick={() => setWebSearch(!webSearch)}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg border transition-colors ${
                  webSearch
                    ? 'bg-blue-950/60 text-blue-400 border-blue-800'
                    : 'border-[var(--border-color)]/50 hover:bg-[var(--bg-tertiary)]'
                }`}
                title="Toggle Web Search"
              >
                <Globe size={14} />
                <span className="hidden sm:inline">Search</span>
              </button>

              <button
                type="button"
                onClick={() => setCodeMode(!codeMode)}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg border transition-colors ${
                  codeMode
                    ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800'
                    : 'border-[var(--border-color)]/50 hover:bg-[var(--bg-tertiary)]'
                }`}
                title="Toggle Code Mode"
              >
                <Code size={14} />
                <span className="hidden sm:inline">Code</span>
              </button>
            </div>

            {/* Right Tools: Character Counter & Send / Stop Button */}
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-mono text-[var(--text-muted)] hidden sm:inline">
                {input.length}/{MAX_MESSAGE_LENGTH}
              </span>

              {isStreaming ? (
                <button
                  type="button"
                  onClick={stopGenerating}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 text-white font-mono text-xs font-semibold hover:bg-rose-700 transition-colors shadow-lg animate-pulse"
                >
                  <Square size={14} className="fill-current" />
                  <span>Stop</span>
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!input.trim()}
                  className="flex items-center justify-center p-2 rounded-xl bg-[var(--accent-cyan)] text-slate-950 hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg"
                  title="Send Message"
                >
                  <Send size={16} />
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
