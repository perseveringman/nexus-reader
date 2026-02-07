import { IpcMain } from 'electron';
import { registerContentHandlers } from './content-handlers.js';
import { registerFeedHandlers } from './feed-handlers.js';
import { registerAiHandlers } from './ai-handlers.js';
import { registerSettingsHandlers } from './settings-handlers.js';
import { registerYtdlpHandlers } from './ytdlp-handlers.js';
import { registerExportHandlers } from './export-handlers.js';

export function registerIpcHandlers(ipcMain: IpcMain): void {
  registerContentHandlers(ipcMain);
  registerFeedHandlers(ipcMain);
  registerAiHandlers(ipcMain);
  registerSettingsHandlers(ipcMain);
  registerYtdlpHandlers(ipcMain);
  registerExportHandlers(ipcMain);
}
