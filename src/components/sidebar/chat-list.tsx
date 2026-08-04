'use client';

import React, { useState } from 'react';
import { useChat } from '@/context/chat-context';
import { ChatThread } from '@/types/chat';
import { Check, Edit2, MessageSquare, Pin, Trash2, X } from 'lucide-react';

export function ChatList() {
  const {
    chats,
    activeChatId,
    selectChat,
    deleteChat,
    renameChat,
    togglePinChat,
    searchQuery,
  } = useChat();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  // Filter chats by search query
  const filteredChats = chats.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pinnedChats = filteredChats.filter((c) => c.pinned);
  const unpinnedChats = filteredChats.filter((c) => !c.pinned);

  // Group unpinned by category
  const categories = ['Today', 'Yesterday', 'Previous 7 Days', 'Older'] as const;

  const handleStartRename = (e: React.MouseEvent, chat: ChatThread) => {
    e.stopPropagation();
    setEditingId(chat.id);
    setEditTitle(chat.title);
  };

  const handleSaveRename = (e: React.MouseEvent | React.FormEvent, id: string) => {
    e.stopPropagation();
    if (editTitle.trim()) {
      renameChat(id, editTitle.trim());
    }
    setEditingId(null);
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteChat(id);
  };

  const handlePin = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    togglePinChat(id);
  };

  return (
    <div className="flex-1 overflow-y-auto px-2 space-y-4 text-xs">
      {/* Pinned Section */}
      {pinnedChats.length > 0 && (
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 px-3 py-1 font-mono text-[10px] font-bold text-[var(--accent-cyan)] uppercase tracking-wider">
            <Pin size={12} />
            <span>Pinned Protocols</span>
          </div>
          {pinnedChats.map((chat) => (
            <ChatItemRow
              key={chat.id}
              chat={chat}
              isActive={chat.id === activeChatId}
              isEditing={editingId === chat.id}
              editTitle={editTitle}
              setEditTitle={setEditTitle}
              onSelect={() => selectChat(chat.id)}
              onSaveRename={(e) => handleSaveRename(e, chat.id)}
              onCancelRename={() => setEditingId(null)}
              onStartRename={(e) => handleStartRename(e, chat)}
              onDelete={(e) => handleDelete(e, chat.id)}
              onPin={(e) => handlePin(e, chat.id)}
            />
          ))}
        </div>
      )}

      {/* Categorized Sections */}
      {categories.map((category) => {
        const group = unpinnedChats.filter((c) => c.category === category);
        if (group.length === 0) return null;

        return (
          <div key={category} className="space-y-1">
            <div className="px-3 py-1 font-mono text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
              {category}
            </div>
            {group.map((chat) => (
              <ChatItemRow
                key={chat.id}
                chat={chat}
                isActive={chat.id === activeChatId}
                isEditing={editingId === chat.id}
                editTitle={editTitle}
                setEditTitle={setEditTitle}
                onSelect={() => selectChat(chat.id)}
                onSaveRename={(e) => handleSaveRename(e, chat.id)}
                onCancelRename={() => setEditingId(null)}
                onStartRename={(e) => handleStartRename(e, chat)}
                onDelete={(e) => handleDelete(e, chat.id)}
                onPin={(e) => handlePin(e, chat.id)}
              />
            ))}
          </div>
        );
      })}

      {filteredChats.length === 0 && (
        <div className="px-4 py-8 text-center text-[var(--text-muted)] font-mono">
          No matching chats found.
        </div>
      )}
    </div>
  );
}

interface ChatItemRowProps {
  chat: ChatThread;
  isActive: boolean;
  isEditing: boolean;
  editTitle: string;
  setEditTitle: (val: string) => void;
  onSelect: () => void;
  onSaveRename: (e: any) => void;
  onCancelRename: () => void;
  onStartRename: (e: any) => void;
  onDelete: (e: any) => void;
  onPin: (e: any) => void;
}

function ChatItemRow({
  chat,
  isActive,
  isEditing,
  editTitle,
  setEditTitle,
  onSelect,
  onSaveRename,
  onCancelRename,
  onStartRename,
  onDelete,
  onPin,
}: ChatItemRowProps) {
  return (
    <div
      onClick={onSelect}
      className={`group relative flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer transition-all ${
        isActive
          ? 'bg-[var(--accent-cyan)]/15 border border-[var(--accent-cyan)]/40 text-[var(--text-primary)] font-medium shadow-sm'
          : 'hover:bg-[var(--bg-tertiary)]/70 text-[var(--text-secondary)] border border-transparent'
      }`}
    >
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <MessageSquare size={14} className={isActive ? 'text-[var(--accent-cyan)]' : 'text-[var(--text-muted)]'} />

        {isEditing ? (
          <form onSubmit={onSaveRename} className="flex items-center gap-1 flex-1 pr-2">
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full bg-[var(--bg-primary)] px-2 py-0.5 rounded border border-[var(--accent-cyan)] text-xs text-[var(--text-primary)] focus:outline-none"
              autoFocus
            />
            <button type="submit" className="p-0.5 text-emerald-400 hover:text-emerald-300">
              <Check size={12} />
            </button>
            <button type="button" onClick={onCancelRename} className="p-0.5 text-rose-400 hover:text-rose-300">
              <X size={12} />
            </button>
          </form>
        ) : (
          <span className="truncate font-sans text-xs">{chat.title}</span>
        )}
      </div>

      {/* Action Hover Buttons */}
      {!isEditing && (
        <div className="hidden group-hover:flex items-center gap-1 text-[var(--text-muted)]">
          <button
            onClick={onPin}
            className={`p-1 rounded hover:text-[var(--accent-cyan)] ${chat.pinned ? 'text-[var(--accent-cyan)]' : ''}`}
            title={chat.pinned ? 'Unpin' : 'Pin'}
          >
            <Pin size={12} />
          </button>
          <button
            onClick={onStartRename}
            className="p-1 rounded hover:text-[var(--text-primary)]"
            title="Rename"
          >
            <Edit2 size={12} />
          </button>
          <button
            onClick={onDelete}
            className="p-1 rounded hover:text-rose-400"
            title="Delete"
          >
            <Trash2 size={12} />
          </button>
        </div>
      )}
    </div>
  );
}
