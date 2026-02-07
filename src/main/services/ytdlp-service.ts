import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';
import { getDb } from '../database/index.js';

export interface VideoInfo {
  id: string;
  title: string;
  description: string;
  duration: number;
  thumbnail: string;
  channel: string;
  uploadDate: string;
  viewCount: number;
  subtitles: SubtitleTrack[];
}

export interface SubtitleTrack {
  lang: string;
  name: string;
  url?: string;
  content?: string;
}

export interface SubtitleEntry {
  start: number;
  end: number;
  text: string;
}

export class YtdlpService {
  private cacheDir: string;

  constructor() {
    this.cacheDir = path.join(app.getPath('userData'), 'ytdlp-cache');
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  private getBrowser(): string {
    const db = getDb();
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('ytdlpBrowser') as { value: string } | undefined;
    return row?.value || 'chrome';
  }

  private async execYtdlp(args: string[], useCookies = true): Promise<string> {
    return new Promise((resolve, reject) => {
      const finalArgs = useCookies 
        ? ['--cookies-from-browser', this.getBrowser(), ...args]
        : args;
      
      const proc = spawn('yt-dlp', finalArgs);
      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(`yt-dlp exited with code ${code}: ${stderr}`));
        }
      });

      proc.on('error', (err) => {
        reject(err);
      });
    });
  }

  async getVideoInfo(videoId: string): Promise<VideoInfo> {
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    
    const output = await this.execYtdlp([
      '--dump-json',
      '--skip-download',
      '--no-warnings',
      '--ignore-errors',
      '--no-check-formats',
      url
    ]);

    const info = JSON.parse(output);
    
    const subtitles: SubtitleTrack[] = [];
    
    // Get available subtitles
    if (info.subtitles) {
      for (const [lang, tracks] of Object.entries(info.subtitles)) {
        const trackList = tracks as Array<{ ext: string; url: string; name?: string }>;
        const vttTrack = trackList.find(t => t.ext === 'vtt') || trackList[0];
        if (vttTrack) {
          subtitles.push({
            lang,
            name: vttTrack.name || lang,
            url: vttTrack.url,
          });
        }
      }
    }

    // Also check automatic captions
    if (info.automatic_captions) {
      for (const [lang, tracks] of Object.entries(info.automatic_captions)) {
        if (!subtitles.find(s => s.lang === lang)) {
          const trackList = tracks as Array<{ ext: string; url: string; name?: string }>;
          const vttTrack = trackList.find(t => t.ext === 'vtt') || trackList[0];
          if (vttTrack) {
            subtitles.push({
              lang: `${lang} (auto)`,
              name: vttTrack.name || `${lang} (自动生成)`,
              url: vttTrack.url,
            });
          }
        }
      }
    }

    return {
      id: info.id,
      title: info.title,
      description: info.description || '',
      duration: info.duration || 0,
      thumbnail: info.thumbnail || '',
      channel: info.channel || info.uploader || '',
      uploadDate: info.upload_date || '',
      viewCount: info.view_count || 0,
      subtitles,
    };
  }

  async downloadSubtitle(videoId: string, lang: string): Promise<string> {
    const cacheFile = path.join(this.cacheDir, `${videoId}_${lang}.txt`);
    
    // Check cache first
    if (fs.existsSync(cacheFile)) {
      return fs.readFileSync(cacheFile, 'utf-8');
    }

    const url = `https://www.youtube.com/watch?v=${videoId}`;
    const outputTemplate = path.join(this.cacheDir, `${videoId}_${lang}`);
    
    // Clean lang for yt-dlp (remove " (auto)" suffix)
    const cleanLang = lang.replace(' (auto)', '');
    
    try {
      await this.execYtdlp([
        '--write-sub',
        '--write-auto-sub',
        '--sub-lang', cleanLang,
        '--sub-format', 'vtt',
        '--skip-download',
        '-o', outputTemplate,
        url
      ]);

      // Find the downloaded subtitle file
      const possibleFiles = [
        `${outputTemplate}.${cleanLang}.vtt`,
        `${outputTemplate}.${cleanLang}.auto.vtt`,
      ];

      for (const file of possibleFiles) {
        if (fs.existsSync(file)) {
          const vttContent = fs.readFileSync(file, 'utf-8');
          const textContent = this.parseVttToText(vttContent);
          
          // Cache the parsed text
          fs.writeFileSync(cacheFile, textContent);
          
          // Clean up VTT file
          fs.unlinkSync(file);
          
          return textContent;
        }
      }

      throw new Error('Subtitle file not found after download');
    } catch (error) {
      console.error('Failed to download subtitle:', error);
      throw error;
    }
  }

  async getSubtitleWithTimestamps(videoId: string, lang: string): Promise<SubtitleEntry[]> {
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    const outputTemplate = path.join(this.cacheDir, `${videoId}_${lang}_ts`);
    const cleanLang = lang.replace(' (auto)', '');

    try {
      await this.execYtdlp([
        '--write-sub',
        '--write-auto-sub',
        '--sub-lang', cleanLang,
        '--sub-format', 'json3',
        '--skip-download',
        '-o', outputTemplate,
        url
      ]);

      const possibleFiles = [
        `${outputTemplate}.${cleanLang}.json3`,
        `${outputTemplate}.${cleanLang}.auto.json3`,
      ];

      for (const file of possibleFiles) {
        if (fs.existsSync(file)) {
          const content = fs.readFileSync(file, 'utf-8');
          const data = JSON.parse(content);
          
          const entries: SubtitleEntry[] = [];
          if (data.events) {
            for (const event of data.events) {
              if (event.segs) {
                const text = event.segs.map((s: { utf8: string }) => s.utf8 || '').join('').trim();
                if (text) {
                  entries.push({
                    start: (event.tStartMs || 0) / 1000,
                    end: ((event.tStartMs || 0) + (event.dDurationMs || 0)) / 1000,
                    text,
                  });
                }
              }
            }
          }
          
          fs.unlinkSync(file);
          return entries;
        }
      }

      // Fallback to VTT format
      return this.getSubtitleFromVtt(videoId, lang);
    } catch (error) {
      console.error('Failed to get subtitles with timestamps:', error);
      return [];
    }
  }

  private async getSubtitleFromVtt(videoId: string, lang: string): Promise<SubtitleEntry[]> {
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    const outputTemplate = path.join(this.cacheDir, `${videoId}_${lang}_vtt`);
    const cleanLang = lang.replace(' (auto)', '');

    await this.execYtdlp([
      '--write-sub',
      '--write-auto-sub',
      '--sub-lang', cleanLang,
      '--sub-format', 'vtt',
      '--skip-download',
      '-o', outputTemplate,
      url
    ]);

    const possibleFiles = [
      `${outputTemplate}.${cleanLang}.vtt`,
      `${outputTemplate}.${cleanLang}.auto.vtt`,
    ];

    for (const file of possibleFiles) {
      if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, 'utf-8');
        const entries = this.parseVttToEntries(content);
        fs.unlinkSync(file);
        return entries;
      }
    }

    return [];
  }

  private parseVttToText(vtt: string): string {
    const lines = vtt.split('\n');
    const textLines: string[] = [];
    let lastText = '';

    for (const line of lines) {
      const trimmed = line.trim();
      
      // Skip VTT header, timestamps, and empty lines
      if (
        trimmed === 'WEBVTT' ||
        trimmed === '' ||
        trimmed.includes('-->') ||
        /^\d+$/.test(trimmed) ||
        trimmed.startsWith('Kind:') ||
        trimmed.startsWith('Language:')
      ) {
        continue;
      }

      // Remove VTT formatting tags
      const cleanText = trimmed
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .trim();

      // Avoid duplicates (YouTube auto-captions often repeat lines)
      if (cleanText && cleanText !== lastText) {
        textLines.push(cleanText);
        lastText = cleanText;
      }
    }

    return textLines.join('\n');
  }

  private parseVttToEntries(vtt: string): SubtitleEntry[] {
    const entries: SubtitleEntry[] = [];
    const lines = vtt.split('\n');
    
    let currentStart = 0;
    let currentEnd = 0;
    let currentText: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      
      // Parse timestamp line
      const timestampMatch = trimmed.match(/(\d{2}):(\d{2}):(\d{2})\.(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})\.(\d{3})/);
      if (timestampMatch) {
        // Save previous entry
        if (currentText.length > 0) {
          entries.push({
            start: currentStart,
            end: currentEnd,
            text: currentText.join(' ').replace(/<[^>]+>/g, '').trim(),
          });
          currentText = [];
        }
        
        currentStart = parseInt(timestampMatch[1]) * 3600 + parseInt(timestampMatch[2]) * 60 + parseInt(timestampMatch[3]) + parseInt(timestampMatch[4]) / 1000;
        currentEnd = parseInt(timestampMatch[5]) * 3600 + parseInt(timestampMatch[6]) * 60 + parseInt(timestampMatch[7]) + parseInt(timestampMatch[8]) / 1000;
        continue;
      }

      // Skip non-text lines
      if (
        trimmed === 'WEBVTT' ||
        trimmed === '' ||
        /^\d+$/.test(trimmed) ||
        trimmed.startsWith('Kind:') ||
        trimmed.startsWith('Language:')
      ) {
        continue;
      }

      currentText.push(trimmed);
    }

    // Don't forget the last entry
    if (currentText.length > 0) {
      entries.push({
        start: currentStart,
        end: currentEnd,
        text: currentText.join(' ').replace(/<[^>]+>/g, '').trim(),
      });
    }

    return entries;
  }

  formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
  }
}
