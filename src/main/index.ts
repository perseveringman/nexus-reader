import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDatabase } from './database/index.js';
import { registerIpcHandlers } from './ipc/index.js';
import { registerImageProxyProtocol } from './services/image-proxy.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;

const isDev = process.env.NODE_ENV === 'development';

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true,
    },
    titleBarStyle: 'hiddenInset',
    show: false,
  });

  // Allow external resources and YouTube embeds
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': ["default-src 'self' img-proxy:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src * data: blob: img-proxy:; frame-src https://www.youtube.com https://youtube.com https://www.youtube-nocookie.com;"]
      }
    });
  });

  // Bypass referrer check for images (fix anti-hotlinking)
  // Map of domains to their required Referer values
  const refererMap: Record<string, string> = {
    'sspai.com': 'https://sspai.com/',
    'cdn.sspai.com': 'https://sspai.com/',
    'zhihu.com': 'https://www.zhihu.com/',
    'zhimg.com': 'https://www.zhihu.com/',
    'weibo.com': 'https://weibo.com/',
    'sinaimg.cn': 'https://weibo.com/',
    'jianshu.com': 'https://www.jianshu.com/',
    'jianshuapi.com': 'https://www.jianshu.com/',
  };

  mainWindow.webContents.session.webRequest.onBeforeSendHeaders(
    { urls: ['*://*/*'] },
    (details, callback) => {
      if (details.resourceType === 'image') {
        const url = new URL(details.url);
        const hostname = url.hostname;
        
        // Find matching referer from map
        let referer: string | null = null;
        for (const [domain, ref] of Object.entries(refererMap)) {
          if (hostname.includes(domain)) {
            referer = ref;
            break;
          }
        }

        if (referer) {
          // Spoof Referer for known anti-hotlinking sites
          details.requestHeaders['Referer'] = referer;
          details.requestHeaders['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
        } else {
          // For other sites, remove Referer (works for sites allowing empty referer)
          delete details.requestHeaders['Referer'];
        }
      }
      callback({ requestHeaders: details.requestHeaders });
    }
  );

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // __dirname is dist/main/main, so go up 2 levels to dist, then into renderer
    mainWindow.loadFile(path.join(__dirname, '../../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  registerImageProxyProtocol();
  await initDatabase();
  registerIpcHandlers(ipcMain);
  await createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
