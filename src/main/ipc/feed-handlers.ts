import { IpcMain } from 'electron';
import { getDb } from '../database/index.js';
import { v4 as uuidv4 } from 'uuid';
import { RssService } from '../services/rss-service.js';
import { YouTubeService } from '../services/youtube-service.js';
import { TwitterService } from '../services/twitter-service.js';

const rssService = new RssService();
const youtubeService = new YouTubeService();
const twitterService = new TwitterService();

type FeedType = 'rss' | 'youtube' | 'twitter';

function detectFeedType(url: string): { type: FeedType; identifier: string } {
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    const channelId = youtubeService.extractChannelId(url);
    if (channelId) {
      return { type: 'youtube', identifier: channelId };
    }
  }
  
  if (url.includes('twitter.com') || url.includes('x.com')) {
    const match = url.match(/(?:twitter|x)\.com\/(@?[a-zA-Z0-9_]+)/);
    if (match) {
      return { type: 'twitter', identifier: match[1].replace('@', '') };
    }
  }
  
  return { type: 'rss', identifier: url };
}

export function registerFeedHandlers(ipcMain: IpcMain): void {
  ipcMain.handle('feeds:get', () => {
    const db = getDb();
    return db.prepare('SELECT * FROM feeds ORDER BY createdAt DESC').all();
  });

  ipcMain.handle('feeds:add', async (_event, url: string) => {
    const db = getDb();
    const id = uuidv4();
    const { type, identifier } = detectFeedType(url);
    
    let title = url;
    
    if (type === 'rss') {
      const feedInfo = await rssService.fetchFeedInfo(url);
      title = feedInfo.title;
    } else if (type === 'youtube') {
      title = `YouTube: ${identifier}`;
    } else if (type === 'twitter') {
      title = `Twitter: @${identifier}`;
    }
    
    const stmt = db.prepare(`
      INSERT INTO feeds (id, title, url, type)
      VALUES (?, ?, ?, ?)
    `);
    
    stmt.run(id, title, identifier, type);
    
    // Sync feed items
    if (type === 'rss') {
      await rssService.syncFeed(id, identifier);
    } else if (type === 'youtube') {
      try {
        await youtubeService.syncChannel(id, identifier);
      } catch (e) {
        console.warn('YouTube sync skipped (API key may not be configured):', e);
      }
    } else if (type === 'twitter') {
      try {
        const user = await twitterService.lookupUser(identifier);
        if (user) {
          await twitterService.syncUserTimeline(id, user.id);
        }
      } catch (e) {
        console.warn('Twitter sync skipped (Bearer token may not be configured):', e);
      }
    }
    
    return db.prepare('SELECT * FROM feeds WHERE id = ?').get(id);
  });

  ipcMain.handle('feeds:sync', async (_event, feedId: string) => {
    const db = getDb();
    const feed = db.prepare('SELECT * FROM feeds WHERE id = ?').get(feedId) as { url: string; type: FeedType } | undefined;
    
    if (!feed) {
      throw new Error('Feed not found');
    }
    
    if (feed.type === 'rss') {
      await rssService.syncFeed(feedId, feed.url);
    } else if (feed.type === 'youtube') {
      await youtubeService.syncChannel(feedId, feed.url);
    } else if (feed.type === 'twitter') {
      const user = await twitterService.lookupUser(feed.url);
      if (user) {
        await twitterService.syncUserTimeline(feedId, user.id);
      }
    }
    
    db.prepare('UPDATE feeds SET lastSyncedAt = ? WHERE id = ?').run(Date.now(), feedId);
    
    return { success: true };
  });

  ipcMain.handle('feeds:syncAll', async () => {
    const db = getDb();
    const feeds = db.prepare('SELECT * FROM feeds').all() as Array<{ id: string; url: string; type: FeedType }>;
    
    for (const feed of feeds) {
      try {
        if (feed.type === 'rss') {
          await rssService.syncFeed(feed.id, feed.url);
        } else if (feed.type === 'youtube') {
          await youtubeService.syncChannel(feed.id, feed.url);
        } else if (feed.type === 'twitter') {
          const user = await twitterService.lookupUser(feed.url);
          if (user) {
            await twitterService.syncUserTimeline(feed.id, user.id);
          }
        }
        db.prepare('UPDATE feeds SET lastSyncedAt = ? WHERE id = ?').run(Date.now(), feed.id);
      } catch (error) {
        console.error(`Failed to sync feed ${feed.id}:`, error);
      }
    }
    
    return { success: true };
  });

  ipcMain.handle('feeds:delete', (_event, feedId: string) => {
    const db = getDb();
    db.prepare('DELETE FROM contents WHERE feedId = ?').run(feedId);
    db.prepare('DELETE FROM feeds WHERE id = ?').run(feedId);
    return { success: true };
  });
}
