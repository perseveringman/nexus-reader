import { useEffect, useState } from 'react';
import { useFeedStore } from '../stores/feed-store';
import { useContentStore } from '../stores/content-store';

interface FeedListProps {
  onAddFeed: () => void;
}

export function FeedList({ onAddFeed }: FeedListProps) {
  const { feeds, isLoading, isSyncing, loadFeeds, syncAllFeeds, deleteFeed } = useFeedStore();
  const { loadContents } = useContentStore();
  const [hoveredFeedId, setHoveredFeedId] = useState<string | null>(null);

  useEffect(() => {
    loadFeeds();
  }, [loadFeeds]);

  const handleSync = async () => {
    await syncAllFeeds();
    await loadContents();
  };

  const handleDelete = async (feedId: string, feedTitle: string) => {
    if (confirm(`确定要删除订阅源 "${feedTitle}" 吗？\n相关内容也会被删除。`)) {
      await deleteFeed(feedId);
      await loadContents();
    }
  };

  return (
    <div className="p-3 border-t border-[var(--color-border)]">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-[var(--color-muted-foreground)]">订阅源</span>
        <div className="flex gap-1">
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="text-xs px-2 py-1 rounded hover:bg-[var(--color-muted)] disabled:opacity-50"
            title="同步所有"
          >
            {isSyncing ? '⏳' : '🔄'}
          </button>
          <button
            onClick={onAddFeed}
            className="text-xs px-2 py-1 rounded hover:bg-[var(--color-muted)]"
            title="添加订阅"
          >
            ➕
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-xs text-[var(--color-muted-foreground)] py-2">加载中...</div>
      ) : feeds.length === 0 ? (
        <div className="text-xs text-[var(--color-muted-foreground)] py-2">
          暂无订阅源
        </div>
      ) : (
        <div className="space-y-1 max-h-40 overflow-y-auto">
          {feeds.map((feed) => (
            <div
              key={feed.id}
              className="flex items-center gap-1 text-xs px-2 py-1.5 rounded hover:bg-[var(--color-muted)] cursor-pointer group"
              title={feed.url}
              onMouseEnter={() => setHoveredFeedId(feed.id)}
              onMouseLeave={() => setHoveredFeedId(null)}
            >
              <span className="truncate flex-1">{feed.title}</span>
              {hoveredFeedId === feed.id && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(feed.id, feed.title);
                  }}
                  className="text-red-500 hover:text-red-600 p-0.5 rounded hover:bg-red-500/10"
                  title="删除订阅源"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
