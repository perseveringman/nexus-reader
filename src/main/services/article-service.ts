import { extract } from '@extractus/article-extractor';
import { toProxyUrl } from './image-proxy.js';

export interface ArticleData {
  title: string;
  content: string;
  author: string | null;
  publishedAt: number | null;
  thumbnail: string | null;
  description: string | null;
  siteName: string | null;
}

export class ArticleService {
  async extractArticle(url: string): Promise<ArticleData | null> {
    try {
      const article = await extract(url);

      if (!article) {
        return null;
      }

      // Convert all image URLs in content to proxy URLs
      let content = article.content || '';
      content = this.proxyImages(content);

      // Also proxy the thumbnail
      const thumbnail = article.image ? toProxyUrl(article.image) : null;

      return {
        title: article.title || url,
        content,
        author: article.author || null,
        publishedAt: article.published ? new Date(article.published).getTime() : null,
        thumbnail,
        description: article.description || null,
        siteName: article.source || null,
      };
    } catch (error) {
      console.error('Failed to extract article:', error);
      return null;
    }
  }

  private proxyImages(html: string): string {
    // Replace img src attributes with proxy URLs
    return html.replace(
      /<img([^>]*)\ssrc=["']([^"']+)["']([^>]*)>/gi,
      (match, before, src, after) => {
        // Skip data URLs and blob URLs
        if (src.startsWith('data:') || src.startsWith('blob:')) {
          return match;
        }
        const proxyUrl = toProxyUrl(src);
        return `<img${before} src="${proxyUrl}"${after}>`;
      }
    );
  }

  isArticleUrl(url: string): boolean {
    // Skip known non-article URLs
    const skipPatterns = [
      /youtube\.com/i,
      /youtu\.be/i,
      /twitter\.com/i,
      /x\.com/i,
      /instagram\.com/i,
      /facebook\.com/i,
      /tiktok\.com/i,
      /\.(jpg|jpeg|png|gif|webp|svg|pdf|mp3|mp4|zip|rar)$/i,
    ];

    return !skipPatterns.some(pattern => pattern.test(url));
  }
}
