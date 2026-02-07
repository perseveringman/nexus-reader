import { create } from 'zustand';
import type { Content, ContentFilter, ContentType } from '../../shared/types';
import { useUndoStore } from './undo-store';

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
    const content = get().contents.find((c) => c.id === id);
    if (!content || content.isRead) return;

    await window.api.updateContent(id, { isRead: true });
    set((state) => ({
      contents: state.contents.map((c) =>
        c.id === id ? { ...c, isRead: true } : c
      ),
    }));

    useUndoStore.getState().pushAction({
      label: `已标记已读: ${content.title}`,
      undo: async () => {
        await window.api.updateContent(id, { isRead: false });
        set((state) => ({
          contents: state.contents.map((c) =>
            c.id === id ? { ...c, isRead: false } : c
          ),
        }));
      },
      redo: async () => {
        await window.api.updateContent(id, { isRead: true });
        set((state) => ({
          contents: state.contents.map((c) =>
            c.id === id ? { ...c, isRead: true } : c
          ),
        }));
      },
    });
  },

  toggleStar: async (id) => {
    const content = get().contents.find((c) => c.id === id);
    if (!content) return;

    const wasStarred = content.isStarred;
    await window.api.updateContent(id, { isStarred: !wasStarred });
    set((state) => ({
      contents: state.contents.map((c) =>
        c.id === id ? { ...c, isStarred: !wasStarred } : c
      ),
    }));

    useUndoStore.getState().pushAction({
      label: wasStarred ? `已取消收藏: ${content.title}` : `已收藏: ${content.title}`,
      undo: async () => {
        await window.api.updateContent(id, { isStarred: wasStarred });
        set((state) => ({
          contents: state.contents.map((c) =>
            c.id === id ? { ...c, isStarred: wasStarred } : c
          ),
        }));
      },
      redo: async () => {
        await window.api.updateContent(id, { isStarred: !wasStarred });
        set((state) => ({
          contents: state.contents.map((c) =>
            c.id === id ? { ...c, isStarred: !wasStarred } : c
          ),
        }));
      },
    });
  },

  archive: async (id) => {
    const content = get().contents.find((c) => c.id === id);
    if (!content) return;

    await window.api.updateContent(id, { isArchived: true });
    set((state) => ({
      contents: state.contents.filter((c) => c.id !== id),
    }));

    useUndoStore.getState().pushAction({
      label: `已归档: ${content.title}`,
      undo: async () => {
        await window.api.updateContent(id, { isArchived: false });
        await get().loadContents();
      },
      redo: async () => {
        await window.api.updateContent(id, { isArchived: true });
        set((state) => ({
          contents: state.contents.filter((c) => c.id !== id),
        }));
      },
    });
  },

  deleteContent: async (id) => {
    const content = get().contents.find((c) => c.id === id);
    if (!content) return;

    const snapshot = { ...content };
    await window.api.deleteContent(id);
    set((state) => ({
      contents: state.contents.filter((c) => c.id !== id),
    }));

    useUndoStore.getState().pushAction({
      label: `已删除: ${content.title}`,
      undo: async () => {
        await window.api.addContent(snapshot);
        await get().loadContents();
      },
      redo: async () => {
        await window.api.deleteContent(id);
        set((state) => ({
          contents: state.contents.filter((c) => c.id !== id),
        }));
      },
    });
  },
}));
