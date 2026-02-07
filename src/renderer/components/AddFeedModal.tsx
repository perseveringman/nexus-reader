import { useState } from 'react';
import { useFeedStore } from '../stores/feed-store';
import { useContentStore } from '../stores/content-store';

interface AddFeedModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddFeedModal({ isOpen, onClose }: AddFeedModalProps) {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { addFeed } = useFeedStore();
  const { loadContents } = useContentStore();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setIsLoading(true);
    setError('');

    try {
      const feed = await addFeed(url.trim());
      if (feed) {
        await loadContents();
        setUrl('');
        onClose();
      } else {
        setError('无法添加订阅源，请检查URL是否正确');
      }
    } catch {
      setError('添加失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[var(--color-card)] rounded-lg shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-semibold mb-4">添加订阅源</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">RSS/Atom URL</label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/feed.xml"
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-md bg-[var(--color-background)] text-sm"
              autoFocus
            />
          </div>

          {error && (
            <p className="text-red-500 text-sm mb-4">{error}</p>
          )}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-md hover:bg-[var(--color-muted)]"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isLoading || !url.trim()}
              className="px-4 py-2 text-sm bg-[var(--color-primary)] text-[var(--color-primary-foreground)] rounded-md hover:opacity-90 disabled:opacity-50"
            >
              {isLoading ? '添加中...' : '添加'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
