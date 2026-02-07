import { create } from 'zustand';
import type { Settings } from '../../shared/types';

interface SettingsState extends Settings {
  loadSettings: () => Promise<void>;
  updateSettings: (settings: Partial<Settings>) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  theme: 'system',
  aiModel: 'openai/gpt-4o-mini',
  openRouterKey: '',
  youtubeApiKey: '',
  twitterBearerToken: '',
  ytdlpBrowser: 'chrome',

  loadSettings: async () => {
    try {
      const settings = await window.api.getSettings();
      set({
        theme: (settings.theme as Settings['theme']) || 'system',
        aiModel: settings.aiModel || 'openai/gpt-4o-mini',
        openRouterKey: settings.openRouterKey || '',
        youtubeApiKey: settings.youtubeApiKey || '',
        twitterBearerToken: settings.twitterBearerToken || '',
        ytdlpBrowser: settings.ytdlpBrowser || 'chrome',
      });
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  },

  updateSettings: async (updates) => {
    try {
      await window.api.updateSettings(updates);
      set(updates);
    } catch (error) {
      console.error('Failed to update settings:', error);
    }
  },
}));
