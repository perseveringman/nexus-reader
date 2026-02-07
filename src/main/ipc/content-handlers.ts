import { IpcMain } from 'electron';
import { getDb } from '../database/index.js';
import { v4 as uuidv4 } from 'uuid';
import { Content, ContentFilter, CreateHighlightInput, Highlight } from '../../shared/types.js';
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

  // Highlight handlers
  ipcMain.handle('create-highlight', (_event, input: CreateHighlightInput) => {
    const db = getDb();
    
    // Check for existing highlight at same paragraph with overlapping range
    const existing = db.prepare(`
      SELECT * FROM highlights 
      WHERE contentId = ? AND paragraphIndex = ?
      AND NOT (endOffset <= ? OR startOffset >= ?)
    `).get(input.contentId, input.paragraphIndex, input.startOffset, input.endOffset) as Highlight | undefined;
    
    if (existing) {
      // Return existing highlight instead of creating duplicate
      const tags = db.prepare('SELECT tag FROM highlight_tags WHERE highlightId = ?').all(existing.id) as { tag: string }[];
      return { ...existing, tags: tags.map(t => t.tag) };
    }
    
    const id = uuidv4();
    const now = Date.now();
    
    db.prepare(`
      INSERT INTO highlights (id, contentId, text, note, color, startOffset, endOffset, paragraphIndex, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      input.contentId,
      input.text,
      input.note || null,
      input.color || '#FFEB3B',
      input.startOffset,
      input.endOffset,
      input.paragraphIndex,
      now
    );

    const highlight = db.prepare('SELECT * FROM highlights WHERE id = ?').get(id) as Highlight;
    const tags = db.prepare('SELECT tag FROM highlight_tags WHERE highlightId = ?').all(id) as { tag: string }[];
    return { ...highlight, tags: tags.map(t => t.tag) };
  });

  ipcMain.handle('get-highlights', (_event, contentId: string) => {
    const db = getDb();
    const highlights = db.prepare('SELECT * FROM highlights WHERE contentId = ? ORDER BY paragraphIndex, startOffset').all(contentId) as Highlight[];
    
    return highlights.map(h => {
      const tags = db.prepare('SELECT tag FROM highlight_tags WHERE highlightId = ?').all(h.id) as { tag: string }[];
      return { ...h, tags: tags.map(t => t.tag) };
    });
  });

  ipcMain.handle('update-highlight', (_event, id: string, updates: Partial<Highlight>) => {
    const db = getDb();
    const allowedFields = ['text', 'note', 'color'];
    const fields: string[] = [];
    const values: unknown[] = [];

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }

    if (fields.length === 0) return null;

    values.push(id);
    db.prepare(`UPDATE highlights SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    
    const highlight = db.prepare('SELECT * FROM highlights WHERE id = ?').get(id) as Highlight & { tags?: string };
    const tags = db.prepare('SELECT t.name FROM tags t JOIN highlight_tags ht ON t.id = ht.tagId WHERE ht.highlightId = ?').all(id) as { name: string }[];
    return { ...highlight, tags: tags.map(t => t.name) };
  });

  ipcMain.handle('delete-highlight', (_event, id: string) => {
    const db = getDb();
    db.prepare('DELETE FROM highlight_tags WHERE highlightId = ?').run(id);
    db.prepare('DELETE FROM highlights WHERE id = ?').run(id);
    return { success: true };
  });

  ipcMain.handle('add-highlight-tag', (_event, highlightId: string, tagName: string) => {
    const db = getDb();
    let tag = db.prepare('SELECT * FROM tags WHERE name = ?').get(tagName) as { id: string } | undefined;
    
    if (!tag) {
      const tagId = uuidv4();
      db.prepare('INSERT INTO tags (id, name) VALUES (?, ?)').run(tagId, tagName);
      tag = { id: tagId };
    }

    const existing = db.prepare('SELECT * FROM highlight_tags WHERE highlightId = ? AND tagId = ?').get(highlightId, tag.id);
    if (!existing) {
      db.prepare('INSERT INTO highlight_tags (highlightId, tagId) VALUES (?, ?)').run(highlightId, tag.id);
    }

    return { success: true };
  });

  ipcMain.handle('remove-highlight-tag', (_event, highlightId: string, tagName: string) => {
    const db = getDb();
    const tag = db.prepare('SELECT * FROM tags WHERE name = ?').get(tagName) as { id: string } | undefined;
    
    if (tag) {
      db.prepare('DELETE FROM highlight_tags WHERE highlightId = ? AND tagId = ?').run(highlightId, tag.id);
    }

    return { success: true };
  });

  ipcMain.handle('add-content-tag', (_event, contentId: string, tagName: string) => {
    const db = getDb();
    let tag = db.prepare('SELECT * FROM tags WHERE name = ?').get(tagName) as { id: string } | undefined;
    
    if (!tag) {
      const tagId = uuidv4();
      db.prepare('INSERT INTO tags (id, name) VALUES (?, ?)').run(tagId, tagName);
      tag = { id: tagId };
    }

    const existing = db.prepare('SELECT * FROM content_tags WHERE contentId = ? AND tagId = ?').get(contentId, tag.id);
    if (!existing) {
      db.prepare('INSERT INTO content_tags (contentId, tagId) VALUES (?, ?)').run(contentId, tag.id);
    }

    return { success: true };
  });

  ipcMain.handle('remove-content-tag', (_event, contentId: string, tagName: string) => {
    const db = getDb();
    const tag = db.prepare('SELECT * FROM tags WHERE name = ?').get(tagName) as { id: string } | undefined;
    
    if (tag) {
      db.prepare('DELETE FROM content_tags WHERE contentId = ? AND tagId = ?').run(contentId, tag.id);
    }

    return { success: true };
  });

  ipcMain.handle('get-content-tags', (_event, contentId: string) => {
    const db = getDb();
    const tags = db.prepare('SELECT t.* FROM tags t JOIN content_tags ct ON t.id = ct.tagId WHERE ct.contentId = ?').all(contentId);
    return tags;
  });

  ipcMain.handle('get-all-tags', () => {
    const db = getDb();
    const tags = db.prepare('SELECT * FROM tags ORDER BY name').all();
    return tags;
  });
}
