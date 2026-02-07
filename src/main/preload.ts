import { contextBridge, ipcRenderer } from 'electron';

interface VideoInfo {
  id: string;
  title: string;
  description: string;
  duration: number;
  thumbnail: string;
  channel: string;
  uploadDate: string;
  viewCount: number;
  subtitles: Array<{ lang: string; name: string; url?: string }>;
}

interface SubtitleEntry {
  start: number;
  end: number;
  text: string;
}

interface ApiType {
  getContents: (filter?: object) => Promise<unknown>;
  addContent: (content: object) => Promise<unknown>;
  updateContent: (id: string, updates: object) => Promise<unknown>;
  deleteContent: (id: string) => Promise<unknown>;
  addFeed: (url: string) => Promise<unknown>;
  getFeeds: () => Promise<unknown>;
  deleteFeed: (feedId: string) => Promise<unknown>;
  syncFeed: (feedId: string) => Promise<unknown>;
  syncAllFeeds: () => Promise<unknown>;
  summarize: (contentId: string) => Promise<{ summary: string }>;
  askQuestion: (contentId: string, question: string) => Promise<{ answer: string }>;
  prioritize: (contentIds: string[]) => Promise<unknown>;
  generateReport: (period: 'daily' | 'weekly' | 'monthly') => Promise<unknown>;
  getSettings: () => Promise<Record<string, string>>;
  updateSettings: (settings: object) => Promise<unknown>;
  getVideoInfo: (videoId: string) => Promise<VideoInfo>;
  downloadSubtitle: (videoId: string, lang: string) => Promise<string>;
  getSubtitleWithTimestamps: (videoId: string, lang: string) => Promise<SubtitleEntry[]>;
  exportOpml: () => Promise<{ success: boolean; path?: string }>;
  exportJson: () => Promise<{ success: boolean; path?: string }>;
  importOpml: () => Promise<{ success: boolean; feeds?: Array<{ title: string; url: string }> }>;
  importJson: () => Promise<{ success: boolean; data?: unknown; error?: string }>;
  on: (channel: string, callback: (...args: unknown[]) => void) => void;
  off: (channel: string, callback: (...args: unknown[]) => void) => void;
}

const api: ApiType = {
  // Content operations
  getContents: (filter?: object) => ipcRenderer.invoke('contents:get', filter),
  addContent: (content: object) => ipcRenderer.invoke('contents:add', content),
  updateContent: (id: string, updates: object) => ipcRenderer.invoke('contents:update', id, updates),
  deleteContent: (id: string) => ipcRenderer.invoke('contents:delete', id),
  
  // RSS operations
  addFeed: (url: string) => ipcRenderer.invoke('feeds:add', url),
  getFeeds: () => ipcRenderer.invoke('feeds:get'),
  deleteFeed: (feedId: string) => ipcRenderer.invoke('feeds:delete', feedId),
  syncFeed: (feedId: string) => ipcRenderer.invoke('feeds:sync', feedId),
  syncAllFeeds: () => ipcRenderer.invoke('feeds:syncAll'),
  
  // AI operations
  summarize: (contentId: string) => ipcRenderer.invoke('ai:summarize', contentId),
  askQuestion: (contentId: string, question: string) => ipcRenderer.invoke('ai:ask', contentId, question),
  prioritize: (contentIds: string[]) => ipcRenderer.invoke('ai:prioritize', contentIds),
  generateReport: (period: 'daily' | 'weekly' | 'monthly') => ipcRenderer.invoke('ai:report', period),
  
  // Settings
  getSettings: () => ipcRenderer.invoke('settings:get'),
  updateSettings: (settings: object) => ipcRenderer.invoke('settings:update', settings),
  
  // yt-dlp
  getVideoInfo: (videoId: string) => ipcRenderer.invoke('ytdlp:getVideoInfo', videoId),
  downloadSubtitle: (videoId: string, lang: string) => ipcRenderer.invoke('ytdlp:downloadSubtitle', videoId, lang),
  getSubtitleWithTimestamps: (videoId: string, lang: string) => ipcRenderer.invoke('ytdlp:getSubtitleWithTimestamps', videoId, lang),
  
  // Export/Import
  exportOpml: () => ipcRenderer.invoke('export:opml'),
  exportJson: () => ipcRenderer.invoke('export:json'),
  importOpml: () => ipcRenderer.invoke('import:opml'),
  importJson: () => ipcRenderer.invoke('import:json'),
  
  // Events
  on: (channel: string, callback: (...args: unknown[]) => void) => {
    ipcRenderer.on(channel, (_event, ...args) => callback(...args));
  },
  off: (channel: string, callback: (...args: unknown[]) => void) => {
    ipcRenderer.removeListener(channel, callback);
  },
};

contextBridge.exposeInMainWorld('api', api);

export type { ApiType };
