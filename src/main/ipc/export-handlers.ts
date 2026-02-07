import { IpcMain, dialog, app } from 'electron';
import { getDb } from '../database/index.js';
import fs from 'fs';
import path from 'path';

export function registerExportHandlers(ipcMain: IpcMain): void {
  ipcMain.handle('export:opml', async () => {
    const db = getDb();
    const feeds = db.prepare('SELECT * FROM feeds WHERE type = ?').all('rss') as Array<{
      id: string;
      title: string;
      url: string;
    }>;

    const opml = `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head>
    <title>Nexus Reader Subscriptions</title>
    <dateCreated>${new Date().toISOString()}</dateCreated>
  </head>
  <body>
    ${feeds.map(feed => `<outline type="rss" text="${escapeXml(feed.title)}" title="${escapeXml(feed.title)}" xmlUrl="${escapeXml(feed.url)}" />`).join('\n    ')}
  </body>
</opml>`;

    const { filePath } = await dialog.showSaveDialog({
      title: '导出订阅源',
      defaultPath: path.join(app.getPath('downloads'), 'nexus-reader-feeds.opml'),
      filters: [{ name: 'OPML', extensions: ['opml'] }],
    });

    if (filePath) {
      fs.writeFileSync(filePath, opml, 'utf-8');
      return { success: true, path: filePath };
    }
    return { success: false };
  });

  ipcMain.handle('export:json', async () => {
    const db = getDb();
    const feeds = db.prepare('SELECT * FROM feeds').all();
    const contents = db.prepare('SELECT * FROM contents').all();
    const settings = db.prepare('SELECT * FROM settings').all();

    const data = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      feeds,
      contents,
      settings,
    };

    const { filePath } = await dialog.showSaveDialog({
      title: '导出全部数据',
      defaultPath: path.join(app.getPath('downloads'), `nexus-reader-backup-${new Date().toISOString().split('T')[0]}.json`),
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });

    if (filePath) {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
      return { success: true, path: filePath };
    }
    return { success: false };
  });

  ipcMain.handle('import:opml', async () => {
    const { filePaths } = await dialog.showOpenDialog({
      title: '导入订阅源',
      filters: [{ name: 'OPML', extensions: ['opml', 'xml'] }],
      properties: ['openFile'],
    });

    if (filePaths.length === 0) {
      return { success: false };
    }

    const content = fs.readFileSync(filePaths[0], 'utf-8');
    const feeds: Array<{ title: string; url: string }> = [];

    // Simple regex-based OPML parsing
    const outlineRegex = /<outline[^>]*xmlUrl="([^"]+)"[^>]*(?:title="([^"]+)"|text="([^"]+)")?[^>]*\/?>/gi;
    let match;

    while ((match = outlineRegex.exec(content)) !== null) {
      const url = match[1];
      const title = match[2] || match[3] || url;
      feeds.push({ title: unescapeXml(title), url: unescapeXml(url) });
    }

    return { success: true, feeds };
  });

  ipcMain.handle('import:json', async () => {
    const { filePaths } = await dialog.showOpenDialog({
      title: '导入备份数据',
      filters: [{ name: 'JSON', extensions: ['json'] }],
      properties: ['openFile'],
    });

    if (filePaths.length === 0) {
      return { success: false };
    }

    try {
      const content = fs.readFileSync(filePaths[0], 'utf-8');
      const data = JSON.parse(content);

      if (!data.version || !data.feeds) {
        throw new Error('Invalid backup file format');
      }

      return { success: true, data };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function unescapeXml(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}
