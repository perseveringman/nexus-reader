import { IpcMain } from 'electron';
import { getDb } from '../database/index.js';

export function registerSettingsHandlers(ipcMain: IpcMain): void {
  ipcMain.handle('settings:get', () => {
    const db = getDb();
    const rows = db.prepare('SELECT key, value FROM settings').all() as Array<{ key: string; value: string }>;
    
    const settings: Record<string, string> = {};
    for (const row of rows) {
      settings[row.key] = row.value;
    }
    
    return settings;
  });

  ipcMain.handle('settings:update', (_event, updates: Record<string, string>) => {
    const db = getDb();
    const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
    
    for (const [key, value] of Object.entries(updates)) {
      stmt.run(key, value);
    }
    
    return { success: true };
  });
}
