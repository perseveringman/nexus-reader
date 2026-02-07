import Parser from 'rss-parser';
import { getDb } from '../database/index.js';
import { v4 as uuidv4 } from 'uuid';

const parser = new Parser();

export class RssService {
  async fetchFeedInfo(url: string): Promise<{ title: string; description?: string }> {
    const feed = await parser.parseURL(url);
    return {
      title: feed.title || 'Untitled Feed',
      description: feed.description,
    };
  }

  async syncFeed(feedId: string, url: string): Promise<number> {
    const feed = await parser.parseURL(url);
    const db = getDb();
    
    const existingUrls = new Set(
      (db.prepare('SELECT url FROM contents WHERE feedId = ?').all(feedId) as Array<{ url: string }>)
        .map(r => r.url)
    );
    
    const insertStmt = db.prepare(`
      INSERT INTO contents (id, feedId, type, title, url, content, author, publishedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    let addedCount = 0;
    
    for (const item of feed.items) {
      if (item.link && existingUrls.has(item.link)) {
        continue;
      }
      
      const publishedAt = item.pubDate ? new Date(item.pubDate).getTime() : Date.now();
      
      insertStmt.run(
        uuidv4(),
        feedId,
        'article',
        item.title || 'Untitled',
        item.link || null,
        item.content || item.contentSnippet || null,
        item.creator || item.author || null,
        publishedAt
      );
      
      addedCount++;
    }
    
    return addedCount;
  }
}
