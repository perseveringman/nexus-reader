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
