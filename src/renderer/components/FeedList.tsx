import { useEffect, useState } from 'react';
import { useFeedStore } from '../stores/feed-store';
import { useContentStore } from '../stores/content-store';
import { RotateCw, Plus, X, Loader2, Rss } from 'lucide-react';

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
    <div className="px-3 py-2 border-t border-[var(--color-border)] mt-2">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-muted-foreground)]">Feeds</span>
        <div className="flex gap-1">
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="p-1 rounded hover:bg-[var(--color-muted)] text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors disabled:opacity-50"
            title="同步所有"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={onAddFeed}
            className="p-1 rounded hover:bg-[var(--color-muted)] text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors"
            title="添加订阅"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-4 text-[var(--color-muted-foreground)]">
          <Loader2 className="w-4 h-4 animate-spin" />
        </div>
      ) : feeds.length === 0 ? (
        <div className="text-xs text-[var(--color-muted-foreground)] py-2 text-center">
          No feeds yet
        </div>
      ) : (
        <div className="space-y-0.5 max-h-40 overflow-y-auto">
          {feeds.map((feed) => (
            <div
              key={feed.id}
              className="flex items-center gap-2 text-sm px-2 py-1.5 rounded-md hover:bg-[var(--color-muted)] text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] cursor-pointer group transition-colors"
              title={feed.url}
              onMouseEnter={() => setHoveredFeedId(feed.id)}
              onMouseLeave={() => setHoveredFeedId(null)}
            >
              <Rss className="w-3.5 h-3.5 opacity-70 shrink-0" />
              <span className="truncate flex-1 text-xs">{feed.title}</span>
              {hoveredFeedId === feed.id && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(feed.id, feed.title);
                  }}
                  className="text-[var(--color-muted-foreground)] hover:text-[var(--color-destructive)] p-0.5 rounded opacity-0 group-hover:opacity-100 transition-all"
                  title="删除订阅源"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
