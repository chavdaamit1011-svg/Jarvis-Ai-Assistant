'use client';

import React from 'react';
import { useChat } from '@/context/chat-context';
import { useTheme } from '@/context/theme-context';
import { ThemeMode } from '@/types/chat';
import { Moon, Settings, Shield, Sun, Flame } from 'lucide-react';

export function UserProfile() {
  const { setIsSettingsOpen } = useChat();
  const { theme, setTheme } = useTheme();

  const cycleTheme = () => {
    const modes: ThemeMode[] = ['dark', 'light', 'ultron'];
    const nextIndex = (modes.indexOf(theme) + 1) % modes.length;
    setTheme(modes[nextIndex]);
  };

  const getThemeIcon = () => {
    switch (theme) {
      case 'light':
        return <Sun size={14} className="text-amber-500" />;
      case 'ultron':
        return <Flame size={14} className="text-rose-500" />;
      default:
        return <Moon size={14} className="text-cyan-400" />;
    }
  };

  return (
    <div className="p-3 border-t border-[var(--border-color)]/50 bg-[var(--bg-secondary)]/50">
      <div className="flex items-center justify-between">
        {/* User Details */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative flex-shrink-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-red-600 flex items-center justify-center font-bold text-xs text-white shadow-md">
              TS
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[var(--bg-primary)]" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-[var(--text-primary)] font-mono truncate">
                Tony Stark
              </span>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-[var(--accent-cyan)]/20 text-[var(--accent-cyan)] border border-[var(--accent-cyan)]/30">
                PRO
              </span>
            </div>
            <p className="text-[10px] text-[var(--text-muted)] truncate font-mono">
              tony@starkindustries.com
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={cycleTheme}
            className="p-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors"
            title={`Current Theme: ${theme.toUpperCase()}. Click to switch.`}
          >
            {getThemeIcon()}
          </button>

          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            title="Settings"
          >
            <Settings size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
