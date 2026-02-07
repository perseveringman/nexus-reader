import { IpcMain } from 'electron';
import { getDb } from '../database/index.js';
import { AiService } from '../services/ai-service.js';

const aiService = new AiService();

export function registerAiHandlers(ipcMain: IpcMain): void {
  ipcMain.handle('ai:summarize', async (_event, contentId: string) => {
    const db = getDb();
    const content = db.prepare('SELECT * FROM contents WHERE id = ?').get(contentId) as { title: string; content: string } | undefined;
    
    if (!content) {
      throw new Error('Content not found');
    }
    
    const summary = await aiService.summarize(content.title, content.content);
    
    db.prepare('UPDATE contents SET summary = ? WHERE id = ?').run(summary, contentId);
    
    return { summary };
  });

  ipcMain.handle('ai:ask', async (_event, contentId: string, question: string) => {
    const db = getDb();
    const content = db.prepare('SELECT * FROM contents WHERE id = ?').get(contentId) as { title: string; content: string } | undefined;
    
    if (!content) {
      throw new Error('Content not found');
    }
    
    const answer = await aiService.askQuestion(content.title, content.content, question);
    
    return { answer };
  });

  ipcMain.handle('ai:prioritize', async (_event, contentIds: string[]) => {
    const db = getDb();
    const contents = db.prepare(
      `SELECT id, title, summary, type FROM contents WHERE id IN (${contentIds.map(() => '?').join(',')})`
    ).all(...contentIds) as Array<{ id: string; title: string; summary: string; type: string }>;
    
    const priorities = await aiService.prioritize(contents);
    
    const updateStmt = db.prepare('UPDATE contents SET priority = ? WHERE id = ?');
    for (const { id, priority } of priorities) {
      updateStmt.run(priority, id);
    }
    
    return priorities;
  });

  ipcMain.handle('ai:report', async (_event, period: 'daily' | 'weekly' | 'monthly') => {
    const db = getDb();
    
    const periodDays = period === 'daily' ? 1 : period === 'weekly' ? 7 : 30;
    const since = Date.now() - periodDays * 24 * 60 * 60 * 1000;
    
    const contents = db.prepare(`
      SELECT type, title, summary, isRead, publishedAt 
      FROM contents 
      WHERE createdAt > ?
      ORDER BY publishedAt DESC
    `).all(since) as Array<{ type: string; title: string; summary: string; isRead: number; publishedAt: number }>;
    
    const report = await aiService.generateReport(contents, period);
    
    return { report };
  });
}
