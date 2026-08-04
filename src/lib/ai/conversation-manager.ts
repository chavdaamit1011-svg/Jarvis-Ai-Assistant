/**
 * ============================================================================
 * Pluggable AI Architecture - Conversation Manager
 * ============================================================================
 * @module lib/ai/conversation-manager.ts
 *
 * RESPONSIBILITIES:
 * - Manages conversation lifecycle (Create, Rename, Delete, Archive, Pin).
 * - Persists conversation threads to LocalStorage.
 * - Future-ready for MongoDB / PostgreSQL database sync.
 */

import { Conversation, Message, Model } from './types/schema';

const STORAGE_KEY = 'jarvis_enterprise_conversations';

export class ConversationManager {
  private conversations: Map<string, Conversation> = new Map();
  private activeId: string | null = null;

  constructor() {
    this.loadFromStorage();
  }

  /**
   * Load conversations from LocalStorage (or MongoDB sync in future).
   */
  private loadFromStorage(): void {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: Conversation[] = JSON.parse(raw);
        parsed.forEach((conv) => this.conversations.set(conv.id, conv));
        if (parsed.length > 0) this.activeId = parsed[0].id;
      }
    } catch (e) {
      console.error('[ConversationManager]: Storage parse error', e);
    }
  }

  /**
   * Save conversations to LocalStorage (and triggers background DB sync).
   */
  private saveToStorage(): void {
    if (typeof window === 'undefined') return;
    try {
      const list = Array.from(this.conversations.values());
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      this.syncToDatabase(list); // Prepared for future MongoDB endpoint
    } catch (e) {
      console.error('[ConversationManager]: Storage save error', e);
    }
  }

  /**
   * Future-ready Hook: Sync conversation state to MongoDB / Remote API.
   */
  private async syncToDatabase(conversations: Conversation[]): Promise<void> {
    // Placeholder for MongoDB POST /api/conversations/sync
  }

  /**
   * Create a new conversation thread.
   */
  public createConversation(model: Model, initialTitle?: string): Conversation {
    const id = 'conv-' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
    const now = new Date().toISOString();

    const conversation: Conversation = {
      id,
      title: initialTitle || 'New Jarvis Protocol',
      createdAt: now,
      updatedAt: now,
      isArchived: false,
      isPinned: false,
      model,
      messages: [],
    };

    this.conversations.set(id, conversation);
    this.activeId = id;
    this.saveToStorage();
    return conversation;
  }

  /**
   * Get all conversation threads sorted by updated timestamp.
   */
  public getConversations(includeArchived = false): Conversation[] {
    return Array.from(this.conversations.values())
      .filter((c) => includeArchived || !c.isArchived)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  /**
   * Get conversation by ID.
   */
  public getConversation(id: string): Conversation | undefined {
    return this.conversations.get(id);
  }

  /**
   * Rename a conversation title.
   */
  public renameConversation(id: string, newTitle: string): void {
    const conv = this.conversations.get(id);
    if (conv) {
      conv.title = newTitle;
      conv.updatedAt = new Date().toISOString();
      this.saveToStorage();
    }
  }

  /**
   * Delete a conversation by ID.
   */
  public deleteConversation(id: string): void {
    this.conversations.delete(id);
    if (this.activeId === id) {
      const remaining = this.getConversations();
      this.activeId = remaining.length > 0 ? remaining[0].id : null;
    }
    this.saveToStorage();
  }

  /**
   * Archive / Unarchive a conversation thread.
   */
  public toggleArchiveConversation(id: string): void {
    const conv = this.conversations.get(id);
    if (conv) {
      conv.isArchived = !conv.isArchived;
      conv.updatedAt = new Date().toISOString();
      this.saveToStorage();
    }
  }

  /**
   * Pin / Unpin a conversation thread.
   */
  public togglePinConversation(id: string): void {
    const conv = this.conversations.get(id);
    if (conv) {
      conv.isPinned = !conv.isPinned;
      conv.updatedAt = new Date().toISOString();
      this.saveToStorage();
    }
  }

  /**
   * Add a message to a conversation thread.
   */
  public addMessage(conversationId: string, message: Message): void {
    const conv = this.conversations.get(conversationId);
    if (conv) {
      conv.messages.push(message);
      conv.updatedAt = new Date().toISOString();
      this.saveToStorage();
    }
  }

  /**
   * Get active conversation ID.
   */
  public getActiveId(): string | null {
    return this.activeId;
  }

  /**
   * Set active conversation ID.
   */
  public setActiveId(id: string): void {
    if (this.conversations.has(id)) {
      this.activeId = id;
    }
  }
}

// Singleton Instance
export const conversationManager = new ConversationManager();
