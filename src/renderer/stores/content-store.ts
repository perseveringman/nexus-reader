import { create } from 'zustand';
import type { Content, ContentFilter, ContentType } from '../../shared/types';

interface ContentState {
  contents: Content[];
  isLoading: boolean;
  filter: ContentFilter;
  activeTab: 'timeline' | ContentType;
  setActiveTab: (tab: 'timeline' | ContentType) => void;
  setFilter: (filter: Partial<ContentFilter>) => void;
  loadContents: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  toggleStar: (id: string) => Promise<void>;
  archive: (id: string) => Promise<void>;
  deleteContent: (id: string) => Promise<void>;
}

export const useContentStore = create<ContentState>((set, get) => ({
  contents: [],
  isLoading: false,
  filter: { isArchived: false },
  activeTab: 'timeline',

  setActiveTab: (tab) => {
    const newFilter: ContentFilter = { isArchived: false };
    if (tab !== 'timeline') {
      newFilter.type = tab;
    }
    set({ activeTab: tab, filter: newFilter });
    get().loadContents();
  },

  setFilter: (filter) => {
    set((state) => ({ filter: { ...state.filter, ...filter } }));
    get().loadContents();
  },

  loadContents: async () => {
    set({ isLoading: true });
    try {
      const contents = await window.api.getContents(get().filter);
      set({ contents: contents as Content[] });
    } catch (error) {
      console.error('Failed to load contents:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  markAsRead: async (id) => {
    await window.api.updateContent(id, { isRead: true });
    set((state) => ({
      contents: state.contents.map((c) =>
        c.id === id ? { ...c, isRead: true } : c
      ),
    }));
  },

  toggleStar: async (id) => {
    const content = get().contents.find((c) => c.id === id);
    if (!content) return;
    
    await window.api.updateContent(id, { isStarred: !content.isStarred });
    set((state) => ({
      contents: state.contents.map((c) =>
        c.id === id ? { ...c, isStarred: !c.isStarred } : c
      ),
    }));
  },

  archive: async (id) => {
    await window.api.updateContent(id, { isArchived: true });
    set((state) => ({
      contents: state.contents.filter((c) => c.id !== id),
    }));
  },

  deleteContent: async (id) => {
    await window.api.deleteContent(id);
    set((state) => ({
      contents: state.contents.filter((c) => c.id !== id),
    }));
  },
}));
