import { extract } from '@extractus/article-extractor';

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
      const article = await extract(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      });

      if (!article) {
        return null;
      }

      return {
        title: article.title || url,
        content: article.content || '',
        author: article.author || null,
        publishedAt: article.published ? new Date(article.published).getTime() : null,
        thumbnail: article.image || null,
        description: article.description || null,
        siteName: article.source || null,
      };
    } catch (error) {
      console.error('Failed to extract article:', error);
      return null;
    }
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
