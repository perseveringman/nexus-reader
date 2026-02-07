import { getDb } from '../database/index.js';
import { v4 as uuidv4 } from 'uuid';

interface YouTubeVideo {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  channelTitle: string;
  publishedAt: string;
}

interface YouTubeSearchResponse {
  items: Array<{
    id: { videoId: string };
    snippet: {
      title: string;
      description: string;
      thumbnails: { high?: { url: string }; medium?: { url: string }; default?: { url: string } };
      channelTitle: string;
      publishedAt: string;
    };
  }>;
}

interface YouTubeChannelResponse {
  items: Array<{
    id: string;
    snippet: {
      title: string;
    };
  }>;
}

export class YouTubeService {
  private getApiKey(): string {
    const db = getDb();
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('youtubeApiKey') as { value: string } | undefined;
    return row?.value || '';
  }

  async resolveChannelId(identifier: string): Promise<{ channelId: string; title: string } | null> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('YouTube API key not configured');
    }

    // If it's already a channel ID (starts with UC), return it
    if (identifier.startsWith('UC') && identifier.length === 24) {
      const url = `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${identifier}&key=${apiKey}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json() as YouTubeChannelResponse;
        if (data.items?.length > 0) {
          return { channelId: data.items[0].id, title: data.items[0].snippet.title };
        }
      }
      return null;
    }

    // Try to find by username/handle
    const url = `https://www.googleapis.com/youtube/v3/channels?part=snippet&forHandle=${identifier}&key=${apiKey}`;
    const response = await fetch(url);
    
    if (response.ok) {
      const data = await response.json() as YouTubeChannelResponse;
      if (data.items?.length > 0) {
        return { channelId: data.items[0].id, title: data.items[0].snippet.title };
      }
    }

    // Try search as fallback
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(identifier)}&type=channel&maxResults=1&key=${apiKey}`;
    const searchResponse = await fetch(searchUrl);
    
    if (searchResponse.ok) {
      const searchData = await searchResponse.json() as { items: Array<{ id: { channelId: string }; snippet: { title: string } }> };
      if (searchData.items?.length > 0) {
        return { channelId: searchData.items[0].id.channelId, title: searchData.items[0].snippet.title };
      }
    }

    return null;
  }

  async getChannelVideos(channelId: string, maxResults = 20): Promise<YouTubeVideo[]> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('YouTube API key not configured');
    }

    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&maxResults=${maxResults}&order=date&type=video&key=${apiKey}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`YouTube API error: ${response.statusText} - ${errorText}`);
    }

    const data = await response.json() as YouTubeSearchResponse;
    
    if (!data.items) {
      return [];
    }
    
    return data.items.map((item) => ({
      id: item.id.videoId,
      title: item.snippet.title,
      description: item.snippet.description,
      thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url || '',
      channelTitle: item.snippet.channelTitle,
      publishedAt: item.snippet.publishedAt,
    }));
  }

  async syncChannel(feedId: string, channelIdOrHandle: string): Promise<number> {
    // First resolve the channel ID if it's a handle
    let channelId = channelIdOrHandle;
    if (!channelIdOrHandle.startsWith('UC')) {
      const resolved = await this.resolveChannelId(channelIdOrHandle);
      if (!resolved) {
        throw new Error(`Could not find YouTube channel: ${channelIdOrHandle}`);
      }
      channelId = resolved.channelId;
      
      // Update the feed with the resolved channel ID
      const db = getDb();
      db.prepare('UPDATE feeds SET url = ?, title = ? WHERE id = ?').run(channelId, `YouTube: ${resolved.title}`, feedId);
    }

    const videos = await this.getChannelVideos(channelId);
    const db = getDb();

    const existingUrls = new Set(
      (db.prepare('SELECT url FROM contents WHERE feedId = ?').all(feedId) as Array<{ url: string }>)
        .map(r => r.url)
    );

    const insertStmt = db.prepare(`
      INSERT INTO contents (id, feedId, type, title, url, content, author, thumbnail, publishedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    let addedCount = 0;

    for (const video of videos) {
      const videoUrl = `https://www.youtube.com/watch?v=${video.id}`;
      if (existingUrls.has(videoUrl)) continue;

      insertStmt.run(
        uuidv4(),
        feedId,
        'video',
        video.title,
        videoUrl,
        video.description,
        video.channelTitle,
        video.thumbnail,
        new Date(video.publishedAt).getTime()
      );

      addedCount++;
    }

    return addedCount;
  }

  extractChannelId(url: string): string | null {
    const patterns = [
      /youtube\.com\/channel\/([a-zA-Z0-9_-]+)/,
      /youtube\.com\/@([a-zA-Z0-9_-]+)/,
      /youtube\.com\/c\/([a-zA-Z0-9_-]+)/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }

    return null;
  }
}
