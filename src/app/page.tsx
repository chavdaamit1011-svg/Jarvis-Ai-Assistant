'use client';

import React, { useEffect } from 'react';
import { useChat } from '@/context/chat-context';
import { Sidebar } from '@/components/sidebar/sidebar';
import { ChatArea } from '@/components/chat/chat-area';

export default function Home() {
  const { createNewChat, toggleSidebar } = useChat();

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl + N or Cmd + N -> New Chat
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        createNewChat();
      }

      // Ctrl + Shift + S or Cmd + Shift + S -> Toggle Sidebar
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        toggleSidebar();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [createNewChat, toggleSidebar]);

  return (
    <main className="flex h-screen w-screen overflow-hidden bg-[var(--bg-primary)]">
      {/* Collapsible Responsive Left Sidebar */}
      <Sidebar />

      {/* Main Chat Conversation Surface */}
      <ChatArea />
    </main>
  );
}
