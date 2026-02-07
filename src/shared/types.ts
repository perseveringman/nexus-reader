export type ContentType = 'article' | 'video' | 'social';

export interface Content {
  id: string;
  feedId: string | null;
  type: ContentType;
  title: string;
  url: string | null;
  content: string | null;
  summary: string | null;
  author: string | null;
  thumbnail: string | null;
  publishedAt: number;
  isRead: boolean;
  isArchived: boolean;
  isStarred: boolean;
  priority: number;
  createdAt: number;
}

export interface Feed {
  id: string;
  title: string;
  url: string;
  type: 'rss' | 'youtube' | 'twitter';
  lastSyncedAt: number | null;
  createdAt: number;
}

export interface Tag {
  id: string;
  name: string;
  color: string | null;
}

export interface ContentFilter {
  type?: ContentType;
  isRead?: boolean;
  isArchived?: boolean;
  feedId?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface Settings {
  theme: 'light' | 'dark' | 'system';
  aiModel: string;
  openRouterKey: string;
  youtubeApiKey: string;
  twitterBearerToken: string;
  ytdlpBrowser: string;
}
