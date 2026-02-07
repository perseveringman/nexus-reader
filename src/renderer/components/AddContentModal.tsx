import { useState, useMemo } from 'react';
import { useContentStore } from '../stores/content-store';

interface AddContentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function isYouTubeUrl(url: string): boolean {
  return url.includes('youtube.com/watch') || url.includes('youtu.be/');
}

function isArticleUrl(url: string): boolean {
  if (!url) return false;
  const skipPatterns = [
    /youtube\.com/i,
    /youtu\.be/i,
    /twitter\.com/i,
    /x\.com/i,
    /instagram\.com/i,
    /facebook\.com/i,
    /\.(jpg|jpeg|png|gif|webp|svg|pdf|mp3|mp4|zip|rar)$/i,
  ];
  return url.startsWith('http') && !skipPatterns.some(p => p.test(url));
}

export function AddContentModal({ isOpen, onClose }: AddContentModalProps) {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState('');
  const [error, setError] = useState('');
  const { loadContents } = useContentStore();

  const isYouTube = useMemo(() => isYouTubeUrl(url), [url]);
  const isArticle = useMemo(() => !isYouTube && isArticleUrl(url), [url, isYouTube]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setIsLoading(true);
    setError('');
    
    if (isYouTube) {
      setLoadingStatus('正在通过 yt-dlp 获取视频信息...');
    } else if (isArticle) {
      setLoadingStatus('正在提取文章正文...');
    } else {
      setLoadingStatus('添加中...');
    }

    try {
      await window.api.addContent({
        title: title.trim() || undefined,
        url: url.trim(),
        publishedAt: Date.now(),
      });
      await loadContents();
      setUrl('');
      setTitle('');
      setLoadingStatus('');
      onClose();
    } catch {
      setError('添加失败，请重试');
    } finally {
      setIsLoading(false);
      setLoadingStatus('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[var(--color-card)] rounded-lg shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-semibold mb-4">添加内容</h2>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">URL</label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/article 或 YouTube 链接"
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-md bg-[var(--color-background)] text-sm"
              autoFocus
            />
            {isYouTube && (
              <p className="text-xs text-[var(--color-primary)] mt-1 flex items-center gap-1">
                <span>🎬</span> 检测到 YouTube 链接，将自动获取视频信息和字幕
              </p>
            )}
            {isArticle && (
              <p className="text-xs text-[var(--color-primary)] mt-1 flex items-center gap-1">
                <span>📄</span> 将自动提取文章标题、正文和作者信息
              </p>
            )}
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              标题 (可选{(isYouTube || isArticle) ? '，会自动获取' : ''})
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={(isYouTube || isArticle) ? '留空将自动获取标题' : '文章标题'}
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-md bg-[var(--color-background)] text-sm"
            />
          </div>

          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
          
          {loadingStatus && (
            <p className="text-[var(--color-muted-foreground)] text-sm mb-4 flex items-center gap-2">
              <span className="animate-spin">⏳</span> {loadingStatus}
            </p>
          )}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-sm rounded-md hover:bg-[var(--color-muted)] disabled:opacity-50"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isLoading || !url.trim()}
              className="px-4 py-2 text-sm bg-[var(--color-primary)] text-[var(--color-primary-foreground)] rounded-md hover:opacity-90 disabled:opacity-50"
            >
              {isLoading ? (isYouTube ? '获取中...' : '添加中...') : '添加'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
