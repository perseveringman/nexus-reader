import { IpcMain } from 'electron';
import { getDb } from '../database/index.js';
import { v4 as uuidv4 } from 'uuid';
import { Content, ContentFilter } from '../../shared/types.js';
import { YtdlpService } from '../services/ytdlp-service.js';
import { ArticleService } from '../services/article-service.js';

const ytdlpService = new YtdlpService();
const articleService = new ArticleService();

function extractYouTubeVideoId(url: string): string | null {
  const patterns = [
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/,
    /youtu\.be\/([a-zA-Z0-9_-]+)/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]+)/,
    /youtube\.com\/v\/([a-zA-Z0-9_-]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function isYouTubeUrl(url: string): boolean {
  return url.includes('youtube.com') || url.includes('youtu.be');
}

export function registerContentHandlers(ipcMain: IpcMain): void {
  ipcMain.handle('contents:get', (_event, filter?: ContentFilter) => {
    const db = getDb();
    let query = 'SELECT * FROM contents WHERE 1=1';
    const params: unknown[] = [];

    if (filter?.type) {
      query += ' AND type = ?';
      params.push(filter.type);
    }
    if (filter?.isRead !== undefined) {
      query += ' AND isRead = ?';
      params.push(filter.isRead ? 1 : 0);
    }
    if (filter?.isArchived !== undefined) {
      query += ' AND isArchived = ?';
      params.push(filter.isArchived ? 1 : 0);
    }
    if (filter?.feedId) {
      query += ' AND feedId = ?';
      params.push(filter.feedId);
    }
    if (filter?.search) {
      query = `
        SELECT c.* FROM contents c
        JOIN contents_fts fts ON c.rowid = fts.rowid
        WHERE contents_fts MATCH ?
      `;
      params.unshift(filter.search);
    }

    query += ' ORDER BY publishedAt DESC, createdAt DESC';

    if (filter?.limit) {
      query += ' LIMIT ?';
      params.push(filter.limit);
    }
    if (filter?.offset) {
      query += ' OFFSET ?';
      params.push(filter.offset);
    }

    return db.prepare(query).all(...params);
  });

  ipcMain.handle('contents:add', async (_event, content: Partial<Content>) => {
    const db = getDb();
    const id = uuidv4();
    
    let finalContent = { ...content };
    
    // Auto-detect YouTube URLs and fetch info via yt-dlp
    if (content.url && isYouTubeUrl(content.url)) {
      const videoId = extractYouTubeVideoId(content.url);
      if (videoId) {
        try {
          const videoInfo = await ytdlpService.getVideoInfo(videoId);
          finalContent = {
            ...finalContent,
            type: 'video',
            title: content.title || videoInfo.title,
            content: videoInfo.description,
            author: videoInfo.channel,
            thumbnail: videoInfo.thumbnail,
            url: `https://www.youtube.com/watch?v=${videoId}`,
            publishedAt: videoInfo.uploadDate 
              ? new Date(videoInfo.uploadDate.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3')).getTime()
              : Date.now(),
          };
        } catch (error) {
          console.warn('Failed to fetch YouTube info via yt-dlp:', error);
          // Fallback to basic info
          finalContent.type = 'video';
          finalContent.url = `https://www.youtube.com/watch?v=${videoId}`;
        }
      }
    } 
    // Auto-extract article content for regular URLs
    else if (content.url && articleService.isArticleUrl(content.url)) {
      try {
        const articleData = await articleService.extractArticle(content.url);
        if (articleData) {
          finalContent = {
            ...finalContent,
            type: 'article',
            title: content.title || articleData.title,
            content: articleData.content,
            author: articleData.author || articleData.siteName,
            thumbnail: articleData.thumbnail,
            publishedAt: articleData.publishedAt || Date.now(),
          };
        }
      } catch (error) {
        console.warn('Failed to extract article:', error);
        // Keep original content if extraction fails
      }
    }
    
    const stmt = db.prepare(`
      INSERT INTO contents (id, feedId, type, title, url, content, author, thumbnail, publishedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      id,
      finalContent.feedId || null,
      finalContent.type || 'article',
      finalContent.title,
      finalContent.url || null,
      finalContent.content || null,
      finalContent.author || null,
      finalContent.thumbnail || null,
      finalContent.publishedAt || Date.now()
    );

    return db.prepare('SELECT * FROM contents WHERE id = ?').get(id);
  });

  ipcMain.handle('contents:update', (_event, id: string, updates: Partial<Content>) => {
    const db = getDb();
    const allowedFields = ['title', 'content', 'summary', 'isRead', 'isArchived', 'isStarred', 'priority'];
    const fields: string[] = [];
    const values: unknown[] = [];

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        fields.push(`${key} = ?`);
        values.push(typeof value === 'boolean' ? (value ? 1 : 0) : value);
      }
    }

    if (fields.length === 0) return null;

    values.push(id);
    db.prepare(`UPDATE contents SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    
    return db.prepare('SELECT * FROM contents WHERE id = ?').get(id);
  });

  ipcMain.handle('contents:delete', (_event, id: string) => {
    const db = getDb();
    db.prepare('DELETE FROM contents WHERE id = ?').run(id);
    return { success: true };
  });
}
