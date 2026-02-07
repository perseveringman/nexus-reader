import { IpcMain } from 'electron';
import { YtdlpService } from '../services/ytdlp-service.js';

const ytdlpService = new YtdlpService();

export function registerYtdlpHandlers(ipcMain: IpcMain): void {
  ipcMain.handle('ytdlp:getVideoInfo', async (_event, videoId: string) => {
    return ytdlpService.getVideoInfo(videoId);
  });

  ipcMain.handle('ytdlp:downloadSubtitle', async (_event, videoId: string, lang: string) => {
    return ytdlpService.downloadSubtitle(videoId, lang);
  });

  ipcMain.handle('ytdlp:getSubtitleWithTimestamps', async (_event, videoId: string, lang: string) => {
    return ytdlpService.getSubtitleWithTimestamps(videoId, lang);
  });
}
