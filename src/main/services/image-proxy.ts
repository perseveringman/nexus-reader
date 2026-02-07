import { app, protocol, net } from 'electron';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

const cacheDir = path.join(app.getPath('userData'), 'image-cache');

// Ensure cache directory exists
if (!fs.existsSync(cacheDir)) {
  fs.mkdirSync(cacheDir, { recursive: true });
}

function getCacheFilePath(url: string): string {
  const hash = crypto.createHash('md5').update(url).digest('hex');
  const ext = path.extname(new URL(url).pathname).split('?')[0] || '.jpg';
  return path.join(cacheDir, `${hash}${ext}`);
}

async function fetchImage(url: string): Promise<Buffer> {
  // Try multiple strategies to bypass anti-hotlinking
  const strategies = [
    // Strategy 1: Set referer to the image's own domain
    () => {
      const urlObj = new URL(url);
      return { referer: `${urlObj.protocol}//${urlObj.host}/` };
    },
    // Strategy 2: No referer at all
    () => ({ referer: null }),
    // Strategy 3: Use origin site as referer (for CDN images)
    () => {
      const urlObj = new URL(url);
      const host = urlObj.host;
      // Map CDN domains to their origin sites
      if (host.includes('sspai.com')) return { referer: 'https://sspai.com/' };
      if (host.includes('zhimg.com')) return { referer: 'https://www.zhihu.com/' };
      if (host.includes('jianshu.io')) return { referer: 'https://www.jianshu.com/' };
      if (host.includes('mmbiz.qpic.cn')) return { referer: 'https://mp.weixin.qq.com/' };
      return { referer: `${urlObj.protocol}//${urlObj.host}/` };
    },
  ];

  for (const getHeaders of strategies) {
    try {
      const { referer } = getHeaders();
      const result = await tryFetchImage(url, referer);
      return result;
    } catch (e) {
      // Try next strategy
      continue;
    }
  }

  throw new Error('All fetch strategies failed');
}

async function tryFetchImage(url: string, referer: string | null): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const request = net.request({
      url,
      method: 'GET',
    });

    // Set headers to mimic a real browser
    request.setHeader('User-Agent', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    request.setHeader('Accept', 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8');
    request.setHeader('Accept-Language', 'zh-CN,zh;q=0.9,en;q=0.8');
    request.setHeader('Accept-Encoding', 'gzip, deflate, br');
    request.setHeader('Connection', 'keep-alive');
    request.setHeader('Sec-Fetch-Dest', 'image');
    request.setHeader('Sec-Fetch-Mode', 'no-cors');
    request.setHeader('Sec-Fetch-Site', 'cross-site');
    
    if (referer) {
      request.setHeader('Referer', referer);
    }

    const chunks: Buffer[] = [];

    request.on('response', (response) => {
      // Follow redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        const location = response.headers['location'];
        if (location) {
          const redirectUrl = Array.isArray(location) ? location[0] : location;
          tryFetchImage(redirectUrl, referer).then(resolve).catch(reject);
          return;
        }
      }

      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }

      response.on('data', (chunk) => {
        chunks.push(chunk);
      });

      response.on('end', () => {
        resolve(Buffer.concat(chunks));
      });

      response.on('error', reject);
    });

    request.on('error', reject);
    request.end();
  });
}

export function registerImageProxyProtocol(): void {
  protocol.handle('img-proxy', async (request) => {
    try {
      // Extract original URL from the proxy URL
      const originalUrl = decodeURIComponent(request.url.replace('img-proxy://', ''));
      
      // Check cache first
      const cachePath = getCacheFilePath(originalUrl);
      
      if (fs.existsSync(cachePath)) {
        const data = fs.readFileSync(cachePath);
        const mimeType = getMimeType(cachePath);
        return new Response(new Uint8Array(data), {
          headers: { 'Content-Type': mimeType },
        });
      }

      // Fetch and cache the image
      const imageData = await fetchImage(originalUrl);
      fs.writeFileSync(cachePath, imageData);

      const mimeType = getMimeType(cachePath);
      return new Response(new Uint8Array(imageData), {
        headers: { 'Content-Type': mimeType },
      });
    } catch (error) {
      console.error('Image proxy error:', error);
      // Return a transparent 1x1 pixel as fallback
      const transparentPixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
      return new Response(new Uint8Array(transparentPixel), {
        headers: { 'Content-Type': 'image/gif' },
      });
    }
  });
}

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
  };
  return mimeTypes[ext] || 'image/jpeg';
}

// Helper to convert URL to proxy URL
export function toProxyUrl(url: string): string {
  if (!url || url.startsWith('data:') || url.startsWith('blob:')) {
    return url;
  }
  return `img-proxy://${encodeURIComponent(url)}`;
}
