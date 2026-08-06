'use client';

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import type { ExtraProps } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Message } from '@/types/chat';
import { useChat } from '@/context/chat-context';
import { formatTimestamp } from '@/lib/utils';
import { CodeBlock } from './code-block';
import { TypingIndicator } from './typing-indicator';
import {
  Check,
  Copy,
  Edit3,
  RefreshCw,
  ThumbsDown,
  ThumbsUp,
  User,
  Zap,
  ShieldAlert,
  Bug,
} from 'lucide-react';
import { DebugTraceDrawer } from './debug-trace-drawer';

interface ChatItemProps {
  message: Message;
}

export function ChatItem({ message }: ChatItemProps) {
  const {
    regenerateMessage,
    editPromptAndSend,
    toggleMessageLike,
    isStreaming,
    persona,
  } = useChat();

  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDebugOpen, setIsDebugOpen] = useState(false);
  const [editContent, setEditContent] = useState(message.content);

  const isUser = message.role === 'user';

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveEdit = () => {
    if (!editContent.trim() || editContent === message.content) {
      setIsEditing(false);
      return;
    }
    editPromptAndSend(message.id, editContent);
    setIsEditing(false);
  };

  return (
    <div
      className={`group relative flex w-full gap-4 p-4 md:p-6 transition-colors ${
        isUser
          ? 'bg-[var(--chat-user-bg)] rounded-2xl my-2 border border-[var(--border-color)]/30 ml-auto max-w-3xl'
          : 'bg-[var(--chat-assistant-bg)] rounded-2xl my-2 border border-[var(--border-color)]/50 backdrop-blur-md'
      }`}
    >
      {/* Avatar Icon */}
      <div className="flex-shrink-0">
        {isUser ? (
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-md">
            <User size={18} />
          </div>
        ) : (
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-lg transition-all ${
              persona === 'ultron'
                ? 'bg-gradient-to-br from-rose-700 to-red-900 arc-glow'
                : 'bg-gradient-to-br from-cyan-500 to-blue-600 arc-glow'
            }`}
          >
            {persona === 'ultron' ? <ShieldAlert size={18} /> : <Zap size={18} />}
          </div>
        )}
      </div>

      {/* Message Content Area */}
      <div className="flex-1 overflow-hidden space-y-2">
        {/* Header Metadata */}
        <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
          <div className="flex items-center gap-2 font-mono">
            <span className="font-semibold text-[var(--text-primary)]">
              {isUser ? 'Stark User' : persona === 'ultron' ? 'ULTRON Prime' : 'J.A.R.V.I.S.'}
            </span>
            {message.model && (
              <span className="px-2 py-0.5 rounded-full bg-[var(--bg-tertiary)] text-[var(--accent-cyan)] border border-[var(--border-color)]">
                {message.model}
              </span>
            )}
            {message.isEdited && <span className="italic text-[10px]">(edited)</span>}
          </div>
            <span className="text-[11px] font-mono">{formatTimestamp(message.createdAt)}</span>
        </div>

        {/* User Inline Edit Form */}
        {isEditing ? (
          <div className="space-y-3 pt-2">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full rounded-lg bg-[var(--bg-primary)] p-3 text-sm text-[var(--text-primary)] border border-[var(--accent-cyan)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-cyan)]"
              rows={3}
            />
            <div className="flex justify-end gap-2 text-xs">
              <button
                onClick={() => setIsEditing(false)}
                className="px-3 py-1.5 rounded-lg border border-[var(--border-color)] hover:bg-[var(--bg-tertiary)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-3 py-1.5 rounded-lg bg-[var(--accent-cyan)] text-slate-950 font-semibold hover:opacity-90 transition-opacity"
              >
                Save & Submit
              </button>
            </div>
          </div>
        ) : (
          /* Render Markdown Content */
          <div className="prose prose-invert max-w-none text-sm leading-relaxed text-[var(--text-primary)]">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code({ node: _node, inline, className, children, ...props }: React.ComponentPropsWithoutRef<'code'> & ExtraProps & { inline?: boolean }) {
                  void _node;
                  const match = /language-(\w+)/.exec(className || '');
                  const codeString = String(children).replace(/\n$/, '');

                  return !inline && match ? (
                    <CodeBlock language={match[1]} value={codeString} />
                  ) : (
                    <code
                      className="px-1.5 py-0.5 rounded bg-[var(--bg-tertiary)] text-[var(--accent-cyan)] font-mono text-xs border border-[var(--border-color)]/30"
                      {...props}
                    >
                      {children}
                    </code>
                  );
                },
              }}
            >
              {message.content}
            </ReactMarkdown>

            {/* Show Streaming Typing Indicator */}
            {message.status === 'streaming' && <TypingIndicator />}
          </div>
        )}

        {!isUser && message.status === 'complete' && message.answerMetadata?.answerSource === 'general-ai' && (
          <p className="mt-3 text-xs font-mono text-[var(--text-muted)]">General AI answer</p>
        )}

        {!isUser && message.status === 'complete' && message.answerMetadata?.answerSource === 'clarification' && (
          <p className="mt-3 text-xs font-mono text-[var(--text-muted)]">Need clarification</p>
        )}

        {!isUser && message.status === 'complete' && message.sources && message.sources.length > 0 && (
          <div className="mt-3 rounded-xl border border-[var(--accent-cyan)]/25 bg-[var(--bg-primary)]/40 p-3">
            <p className="text-[11px] font-mono text-[var(--accent-cyan)]">KNOWLEDGE SOURCES</p>
            {message.sources.length ? <div className="mt-2 space-y-1">{message.sources.map((source, index) => <div key={`${source.documentTitle}-${source.chunkIndex}-${index}`} className="flex flex-wrap justify-between gap-2 text-xs text-[var(--text-secondary)]"><span>{source.documentTitle} · chunk {source.chunkIndex + 1}</span><span>{Math.round(source.score * 100)}% match</span></div>)}</div> : <p className="mt-2 text-xs text-[var(--text-muted)]">No relevant source was found in the selected knowledge base.</p>}
          </div>
        )}

        {/* Message Action Toolbar */}
        {!isEditing && message.status !== 'streaming' && (
          <div className="flex items-center gap-1 pt-2 opacity-80 group-hover:opacity-100 transition-opacity text-xs text-[var(--text-muted)]">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 p-1.5 rounded-md hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-colors"
              title="Copy Message"
            >
              {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            </button>

            {isUser ? (
              <button
                onClick={() => setIsEditing(true)}
                disabled={isStreaming}
                className="flex items-center gap-1 p-1.5 rounded-md hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-40"
                title="Edit Prompt"
              >
                <Edit3 size={14} />
              </button>
            ) : (
              <>
                {message.status === 'error' && (
                  <button
                    onClick={() => regenerateMessage(message.id)}
                    disabled={isStreaming}
                    className="rounded-md border border-[var(--accent-cyan)]/40 px-2 py-1 text-xs text-[var(--accent-cyan)] hover:bg-[var(--accent-cyan)]/10 disabled:opacity-40"
                  >
                    Retry
                  </button>
                )}
                <button
                  onClick={() => regenerateMessage(message.id)}
                  disabled={isStreaming}
                  className="flex items-center gap-1 p-1.5 rounded-md hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-40"
                  title="Regenerate Response"
                >
                  <RefreshCw size={14} />
                </button>

                {process.env.NODE_ENV !== 'production' && (
                  <button
                    onClick={() => setIsDebugOpen(true)}
                    className="flex items-center gap-1 rounded-md px-1.5 py-1 text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--accent-cyan)] transition-colors"
                    title="View Debug"
                  >
                    <Bug size={14} />
                    <span>View Debug</span>
                  </button>
                )}

                <div className="h-3 w-[1px] bg-[var(--border-color)] mx-1" />

                <button
                  onClick={() => toggleMessageLike(message.id, 'liked')}
                  className={`p-1.5 rounded-md transition-colors ${
                    message.likeStatus === 'liked'
                      ? 'text-emerald-400 bg-emerald-950/40'
                      : 'hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'
                  }`}
                  title="Good Response"
                >
                  <ThumbsUp size={14} />
                </button>

                <button
                  onClick={() => toggleMessageLike(message.id, 'disliked')}
                  className={`p-1.5 rounded-md transition-colors ${
                    message.likeStatus === 'disliked'
                      ? 'text-rose-400 bg-rose-950/40'
                      : 'hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'
                  }`}
                  title="Bad Response"
                >
                  <ThumbsDown size={14} />
                </button>
              </>
            )}
          </div>
        )}
      </div>
      {!isUser && process.env.NODE_ENV !== 'production' && <DebugTraceDrawer traceId={message.traceId ?? message.answerMetadata?.traceId} open={isDebugOpen} onClose={() => setIsDebugOpen(false)} />}
    </div>
  );
}
