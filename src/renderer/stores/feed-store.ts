import { create } from 'zustand';
import type { Feed } from '../../shared/types';

interface FeedState {
  feeds: Feed[];
  isLoading: boolean;
  isSyncing: boolean;
  loadFeeds: () => Promise<void>;
  addFeed: (url: string) => Promise<Feed | null>;
  deleteFeed: (feedId: string) => Promise<void>;
  syncFeed: (feedId: string) => Promise<void>;
  syncAllFeeds: () => Promise<void>;
}

export const useFeedStore = create<FeedState>((set, get) => ({
  feeds: [],
  isLoading: false,
  isSyncing: false,

  loadFeeds: async () => {
    set({ isLoading: true });
    try {
      const feeds = await window.api.getFeeds();
      set({ feeds: feeds as Feed[] });
    } catch (error) {
      console.error('Failed to load feeds:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  addFeed: async (url: string) => {
    try {
      const feed = await window.api.addFeed(url);
      set((state) => ({ feeds: [feed as Feed, ...state.feeds] }));
      return feed as Feed;
    } catch (error) {
      console.error('Failed to add feed:', error);
      return null;
    }
  },

  deleteFeed: async (feedId: string) => {
    try {
      await window.api.deleteFeed(feedId);
      set((state) => ({ feeds: state.feeds.filter(f => f.id !== feedId) }));
    } catch (error) {
      console.error('Failed to delete feed:', error);
    }
  },

  syncFeed: async (feedId: string) => {
    set({ isSyncing: true });
    try {
      await window.api.syncFeed(feedId);
    } catch (error) {
      console.error('Failed to sync feed:', error);
    } finally {
      set({ isSyncing: false });
    }
  },

  syncAllFeeds: async () => {
    set({ isSyncing: true });
    try {
      await window.api.syncAllFeeds();
    } catch (error) {
      console.error('Failed to sync feeds:', error);
    } finally {
      set({ isSyncing: false });
    }
  },
}));
