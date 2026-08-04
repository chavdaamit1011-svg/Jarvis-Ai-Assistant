'use client';

import React, { useState } from 'react';
import { useChat } from '@/context/chat-context';
import type { Conversation } from '@/types/chat';
import { Check, Edit2, MessageSquare, Pin, Trash2, X } from 'lucide-react';

const CATEGORIES = ['Today', 'Yesterday', 'Previous 7 Days', 'Older'] as const;

function getConversationCategory(conversation: Conversation): (typeof CATEGORIES)[number] {
  const now = new Date();
  const date = new Date(conversation.updatedAt);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const conversationDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const daysAgo = Math.floor((today.getTime() - conversationDay.getTime()) / 86_400_000);
  if (daysAgo <= 0) return 'Today';
  if (daysAgo === 1) return 'Yesterday';
  if (daysAgo <= 7) return 'Previous 7 Days';
  return 'Older';
}

export function ChatList() {
  const { chats, activeChatId, selectChat, deleteChat, renameChat, togglePinChat, searchQuery, isStreaming } = useChat();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const filteredChats = chats.filter((chat) => chat.title.toLowerCase().includes(searchQuery.toLowerCase()) && !chat.isArchived);
  const pinnedChats = filteredChats.filter((chat) => chat.isPinned);
  const unpinnedChats = filteredChats.filter((chat) => !chat.isPinned);

  const startRename = (event: React.MouseEvent, conversation: Conversation) => {
    event.stopPropagation();
    setEditingId(conversation.id);
    setEditTitle(conversation.title);
  };
  const saveRename = (event: React.MouseEvent | React.FormEvent, id: string) => {
    event.stopPropagation();
    if (editTitle.trim()) renameChat(id, editTitle);
    setEditingId(null);
  };
  const remove = (event: React.MouseEvent, id: string) => {
    event.stopPropagation();
    if (window.confirm('Delete this conversation? This cannot be undone.')) deleteChat(id);
  };

  const renderRow = (chat: Conversation) => <ChatItemRow
    key={chat.id} chat={chat} isActive={chat.id === activeChatId} isEditing={editingId === chat.id}
    editTitle={editTitle} setEditTitle={setEditTitle} isStreaming={isStreaming}
    onSelect={() => selectChat(chat.id)} onSaveRename={(event) => saveRename(event, chat.id)}
    onCancelRename={() => setEditingId(null)} onStartRename={(event) => startRename(event, chat)}
    onDelete={(event) => remove(event, chat.id)} onPin={(event) => { event.stopPropagation(); togglePinChat(chat.id); }}
  />;

  return <div className="flex-1 overflow-y-auto px-2 space-y-4 text-xs">
    {pinnedChats.length > 0 && <div className="space-y-1">
      <div className="flex items-center gap-1.5 px-3 py-1 font-mono text-[10px] font-bold text-[var(--accent-cyan)] uppercase tracking-wider"><Pin size={12} /><span>Pinned Protocols</span></div>
      {pinnedChats.map(renderRow)}
    </div>}
    {CATEGORIES.map((category) => {
      const group = unpinnedChats.filter((chat) => getConversationCategory(chat) === category);
      return group.length > 0 ? <div key={category} className="space-y-1">
        <div className="px-3 py-1 font-mono text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">{category}</div>
        {group.map(renderRow)}
      </div> : null;
    })}
    {filteredChats.length === 0 && <div className="px-4 py-8 text-center text-[var(--text-muted)] font-mono">No matching chats found.</div>}
  </div>;
}

interface ChatItemRowProps {
  chat: Conversation;
  isActive: boolean;
  isEditing: boolean;
  editTitle: string;
  setEditTitle: (value: string) => void;
  isStreaming: boolean;
  onSelect: () => void;
  onSaveRename: (event: React.MouseEvent | React.FormEvent) => void;
  onCancelRename: () => void;
  onStartRename: (event: React.MouseEvent) => void;
  onDelete: (event: React.MouseEvent) => void;
  onPin: (event: React.MouseEvent) => void;
}

function ChatItemRow({ chat, isActive, isEditing, editTitle, setEditTitle, isStreaming, onSelect, onSaveRename, onCancelRename, onStartRename, onDelete, onPin }: ChatItemRowProps) {
  return <div onClick={() => { if (!isStreaming) onSelect(); }} className={`group relative flex items-center justify-between px-3 py-2 rounded-xl transition-all ${isStreaming ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'} ${isActive ? 'bg-[var(--accent-cyan)]/15 border border-[var(--accent-cyan)]/40 text-[var(--text-primary)] font-medium shadow-sm' : 'hover:bg-[var(--bg-tertiary)]/70 text-[var(--text-secondary)] border border-transparent'}`}>
    <div className="flex items-center gap-2.5 min-w-0 flex-1">
      <MessageSquare size={14} className={isActive ? 'text-[var(--accent-cyan)]' : 'text-[var(--text-muted)]'} />
      {isEditing ? <form onSubmit={onSaveRename} className="flex items-center gap-1 flex-1 pr-2">
        <input type="text" value={editTitle} onChange={(event) => setEditTitle(event.target.value)} className="w-full bg-[var(--bg-primary)] px-2 py-0.5 rounded border border-[var(--accent-cyan)] text-xs text-[var(--text-primary)] focus:outline-none" autoFocus />
        <button type="submit" className="p-0.5 text-emerald-400 hover:text-emerald-300"><Check size={12} /></button>
        <button type="button" onClick={onCancelRename} className="p-0.5 text-rose-400 hover:text-rose-300"><X size={12} /></button>
      </form> : <span className="truncate font-sans text-xs">{chat.title}</span>}
    </div>
    {!isEditing && <div className="hidden group-hover:flex items-center gap-1 text-[var(--text-muted)]">
      <button onClick={onPin} disabled={isStreaming} className={`p-1 rounded hover:text-[var(--accent-cyan)] disabled:opacity-40 ${chat.isPinned ? 'text-[var(--accent-cyan)]' : ''}`} title={chat.isPinned ? 'Unpin' : 'Pin'}><Pin size={12} /></button>
      <button onClick={onStartRename} disabled={isStreaming} className="p-1 rounded hover:text-[var(--text-primary)] disabled:opacity-40" title="Rename"><Edit2 size={12} /></button>
      <button onClick={onDelete} disabled={isStreaming} className="p-1 rounded hover:text-rose-400 disabled:opacity-40" title="Delete"><Trash2 size={12} /></button>
    </div>}
  </div>;
}
