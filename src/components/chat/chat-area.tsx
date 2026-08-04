'use client';

import React, { useRef, useEffect, useState } from 'react';
import { useChat } from '@/context/chat-context';
import { ChatHeader } from './chat-header';
import { ChatItem } from './chat-item';
import { WelcomeScreen } from './welcome-screen';
import { ChatInput } from './chat-input';
import { ArrowDown } from 'lucide-react';

export function ChatArea() {
  const { activeChat, isStreaming } = useChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    scrollToBottom('auto');
  }, [activeChat?.id]);

  useEffect(() => {
    if (isStreaming) {
      scrollToBottom('smooth');
    }
  }, [activeChat?.messages.length, isStreaming]);

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const isUp = scrollHeight - scrollTop - clientHeight > 150;
    setShowScrollBottom(isUp);
  };

  const hasMessages = activeChat && activeChat.messages.length > 0;

  return (
    <div className="flex flex-col flex-1 h-screen overflow-hidden bg-[var(--bg-primary)]">
      {/* Top Navigation Header */}
      <ChatHeader />

      {/* Main Messages & Welcome Scroll Container */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 scroll-smooth"
      >
        {hasMessages ? (
          <div className="max-w-4xl mx-auto space-y-4">
            {activeChat.messages.map((msg) => (
              <ChatItem key={msg.id} message={msg} />
            ))}
            <div ref={messagesEndRef} />
          </div>
        ) : (
          <WelcomeScreen />
        )}
      </div>

      {/* Scroll to Bottom Floating Button */}
      {showScrollBottom && (
        <button
          onClick={() => scrollToBottom('smooth')}
          className="fixed bottom-24 right-6 md:right-10 z-30 flex items-center gap-1.5 px-3 py-2 rounded-full bg-[var(--bg-tertiary)] border border-[var(--accent-cyan)]/50 text-[var(--accent-cyan)] text-xs font-mono shadow-2xl hover:bg-[var(--accent-cyan)] hover:text-slate-950 transition-all duration-200"
          title="Scroll to Bottom"
        >
          <ArrowDown size={14} />
          <span>New messages</span>
        </button>
      )}

      {/* Bottom Composer */}
      <ChatInput />
    </div>
  );
}
