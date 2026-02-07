import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized');
  }
  return db;
}

export async function initDatabase(): Promise<void> {
  const userDataPath = app.getPath('userData');
  const dbPath = path.join(userDataPath, 'nexus-reader.db');
  
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  
  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS feeds (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      url TEXT UNIQUE NOT NULL,
      type TEXT NOT NULL DEFAULT 'rss',
      lastSyncedAt INTEGER,
      createdAt INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
    );

    CREATE TABLE IF NOT EXISTS contents (
      id TEXT PRIMARY KEY,
      feedId TEXT,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      url TEXT,
      content TEXT,
      summary TEXT,
      author TEXT,
      thumbnail TEXT,
      publishedAt INTEGER,
      isRead INTEGER NOT NULL DEFAULT 0,
      isArchived INTEGER NOT NULL DEFAULT 0,
      isStarred INTEGER NOT NULL DEFAULT 0,
      priority INTEGER DEFAULT 0,
      createdAt INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      FOREIGN KEY (feedId) REFERENCES feeds(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      color TEXT
    );

    CREATE TABLE IF NOT EXISTS content_tags (
      contentId TEXT NOT NULL,
      tagId TEXT NOT NULL,
      PRIMARY KEY (contentId, tagId),
      FOREIGN KEY (contentId) REFERENCES contents(id) ON DELETE CASCADE,
      FOREIGN KEY (tagId) REFERENCES tags(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE VIRTUAL TABLE IF NOT EXISTS contents_fts USING fts5(
      title,
      content,
      summary,
      content='contents',
      content_rowid='rowid'
    );

    CREATE TRIGGER IF NOT EXISTS contents_ai AFTER INSERT ON contents BEGIN
      INSERT INTO contents_fts(rowid, title, content, summary) 
      VALUES (NEW.rowid, NEW.title, NEW.content, NEW.summary);
    END;

    CREATE TRIGGER IF NOT EXISTS contents_ad AFTER DELETE ON contents BEGIN
      INSERT INTO contents_fts(contents_fts, rowid, title, content, summary) 
      VALUES ('delete', OLD.rowid, OLD.title, OLD.content, OLD.summary);
    END;

    CREATE TRIGGER IF NOT EXISTS contents_au AFTER UPDATE ON contents BEGIN
      INSERT INTO contents_fts(contents_fts, rowid, title, content, summary) 
      VALUES ('delete', OLD.rowid, OLD.title, OLD.content, OLD.summary);
      INSERT INTO contents_fts(rowid, title, content, summary) 
      VALUES (NEW.rowid, NEW.title, NEW.content, NEW.summary);
    END;

    CREATE INDEX IF NOT EXISTS idx_contents_type ON contents(type);
    CREATE INDEX IF NOT EXISTS idx_contents_feedId ON contents(feedId);
    CREATE INDEX IF NOT EXISTS idx_contents_isRead ON contents(isRead);
    CREATE INDEX IF NOT EXISTS idx_contents_publishedAt ON contents(publishedAt);

    CREATE TABLE IF NOT EXISTS highlights (
      id TEXT PRIMARY KEY,
      contentId TEXT NOT NULL,
      text TEXT NOT NULL,
      note TEXT,
      color TEXT DEFAULT 'yellow',
      startOffset INTEGER NOT NULL,
      endOffset INTEGER NOT NULL,
      paragraphIndex INTEGER NOT NULL,
      createdAt INTEGER NOT NULL,
      FOREIGN KEY (contentId) REFERENCES contents(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS highlight_tags (
      highlightId TEXT NOT NULL,
      tag TEXT NOT NULL,
      PRIMARY KEY (highlightId, tag),
      FOREIGN KEY (highlightId) REFERENCES highlights(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_highlights_contentId ON highlights(contentId);
  `);

  // Insert default settings
  const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
  insertSetting.run('theme', 'system');
  insertSetting.run('aiModel', 'openai/gpt-4o-mini');
  insertSetting.run('openRouterKey', '');
}

export function closeDatabase(): void {
  if (db) {
    db.close();
  }
}

// Highlight types
export interface Highlight {
  id: string;
  contentId: string;
  text: string;
  note?: string;
  color?: string;
  startOffset: number;
  endOffset: number;
  paragraphIndex: number;
  createdAt: number;
}

export interface HighlightWithTags extends Highlight {
  tags: string[];
}

// Highlight CRUD functions
export function createHighlight(highlight: Highlight): Highlight {
  const stmt = getDb().prepare(`
    INSERT INTO highlights (id, contentId, text, note, color, startOffset, endOffset, paragraphIndex, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    highlight.id,
    highlight.contentId,
    highlight.text,
    highlight.note || null,
    highlight.color || 'yellow',
    highlight.startOffset,
    highlight.endOffset,
    highlight.paragraphIndex,
    highlight.createdAt
  );
  return highlight;
}

export function getHighlightsByContentId(contentId: string): HighlightWithTags[] {
  const highlights = getDb().prepare(`
    SELECT * FROM highlights WHERE contentId = ? ORDER BY paragraphIndex, startOffset
  `).all(contentId) as Highlight[];

  return highlights.map((h) => {
    const tags = getDb()
      .prepare('SELECT tag FROM highlight_tags WHERE highlightId = ?')
      .all(h.id) as { tag: string }[];
    return { ...h, tags: tags.map((t) => t.tag) };
  });
}

export function updateHighlight(id: string, updates: Partial<Pick<Highlight, 'note' | 'color' | 'text'>>): boolean {
  const fields: string[] = [];
  const values: unknown[] = [];

  if (updates.note !== undefined) {
    fields.push('note = ?');
    values.push(updates.note);
  }
  if (updates.color !== undefined) {
    fields.push('color = ?');
    values.push(updates.color);
  }
  if (updates.text !== undefined) {
    fields.push('text = ?');
    values.push(updates.text);
  }

  if (fields.length === 0) return false;

  values.push(id);
  const stmt = getDb().prepare(`UPDATE highlights SET ${fields.join(', ')} WHERE id = ?`);
  const result = stmt.run(...values);
  return result.changes > 0;
}

export function deleteHighlight(id: string): boolean {
  const stmt = getDb().prepare('DELETE FROM highlights WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}

// Highlight tags functions
export function addTagToHighlight(highlightId: string, tag: string): void {
  const stmt = getDb().prepare('INSERT OR IGNORE INTO highlight_tags (highlightId, tag) VALUES (?, ?)');
  stmt.run(highlightId, tag);
}

export function removeTagFromHighlight(highlightId: string, tag: string): boolean {
  const stmt = getDb().prepare('DELETE FROM highlight_tags WHERE highlightId = ? AND tag = ?');
  const result = stmt.run(highlightId, tag);
  return result.changes > 0;
}

// Content tags functions (using existing tags/content_tags tables)
export function addTagToContent(contentId: string, tag: string): void {
  const db = getDb();
  const tagId = `tag_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  
  db.prepare('INSERT OR IGNORE INTO tags (id, name) VALUES (?, ?)').run(tagId, tag);
  
  const existingTag = db.prepare('SELECT id FROM tags WHERE name = ?').get(tag) as { id: string } | undefined;
  if (existingTag) {
    db.prepare('INSERT OR IGNORE INTO content_tags (contentId, tagId) VALUES (?, ?)').run(contentId, existingTag.id);
  }
}

export function removeTagFromContent(contentId: string, tag: string): boolean {
  const db = getDb();
  const existingTag = db.prepare('SELECT id FROM tags WHERE name = ?').get(tag) as { id: string } | undefined;
  if (!existingTag) return false;
  
  const stmt = db.prepare('DELETE FROM content_tags WHERE contentId = ? AND tagId = ?');
  const result = stmt.run(contentId, existingTag.id);
  return result.changes > 0;
}

export function getContentTags(contentId: string): string[] {
  const tags = getDb().prepare(`
    SELECT t.name FROM tags t
    INNER JOIN content_tags ct ON ct.tagId = t.id
    WHERE ct.contentId = ?
  `).all(contentId) as { name: string }[];
  return tags.map((t) => t.name);
}

export function getAllTags(): string[] {
  const db = getDb();
  
  const contentTags = db.prepare('SELECT DISTINCT name FROM tags').all() as { name: string }[];
  const highlightTags = db.prepare('SELECT DISTINCT tag FROM highlight_tags').all() as { tag: string }[];
  
  const allTags = new Set<string>();
  contentTags.forEach((t) => allTags.add(t.name));
  highlightTags.forEach((t) => allTags.add(t.tag));
  
  return Array.from(allTags).sort();
}
