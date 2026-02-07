import { getDb } from '../database/index.js';
import { v4 as uuidv4 } from 'uuid';

interface Tweet {
  id: string;
  text: string;
  authorName: string;
  authorUsername: string;
  createdAt: string;
}

interface TwitterResponse {
  data: Array<{
    id: string;
    text: string;
    created_at: string;
    author_id: string;
  }>;
  includes?: {
    users: Array<{
      id: string;
      name: string;
      username: string;
    }>;
  };
}

export class TwitterService {
  private getBearerToken(): string {
    const db = getDb();
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('twitterBearerToken') as { value: string } | undefined;
    return row?.value || '';
  }

  async getUserTimeline(userId: string, maxResults = 20): Promise<Tweet[]> {
    const token = this.getBearerToken();
    if (!token) {
      throw new Error('Twitter Bearer Token not configured');
    }

    const url = `https://api.twitter.com/2/users/${userId}/tweets?max_results=${maxResults}&tweet.fields=created_at,author_id&expansions=author_id&user.fields=name,username`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Twitter API error: ${response.statusText}`);
    }

    const data = await response.json() as TwitterResponse;
    
    const usersMap = new Map(
      data.includes?.users.map(u => [u.id, { name: u.name, username: u.username }]) || []
    );

    return data.data.map((tweet) => {
      const author = usersMap.get(tweet.author_id) || { name: 'Unknown', username: 'unknown' };
      return {
        id: tweet.id,
        text: tweet.text,
        authorName: author.name,
        authorUsername: author.username,
        createdAt: tweet.created_at,
      };
    });
  }

  async syncUserTimeline(feedId: string, userId: string): Promise<number> {
    const tweets = await this.getUserTimeline(userId);
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

    for (const tweet of tweets) {
      const tweetUrl = `https://twitter.com/${tweet.authorUsername}/status/${tweet.id}`;
      if (existingUrls.has(tweetUrl)) continue;

      const title = tweet.text.length > 100 
        ? tweet.text.slice(0, 100) + '...' 
        : tweet.text;

      insertStmt.run(
        uuidv4(),
        feedId,
        'social',
        title,
        tweetUrl,
        tweet.text,
        `@${tweet.authorUsername}`,
        new Date(tweet.createdAt).getTime()
      );

      addedCount++;
    }

    return addedCount;
  }

  async lookupUser(username: string): Promise<{ id: string; name: string } | null> {
    const token = this.getBearerToken();
    if (!token) {
      throw new Error('Twitter Bearer Token not configured');
    }

    const url = `https://api.twitter.com/2/users/by/username/${username}`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) return null;

    const data = await response.json() as { data: { id: string; name: string } };
    return data.data;
  }
}
