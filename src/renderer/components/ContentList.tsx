import { useState } from 'react';
import { useContentStore } from '../stores/content-store';
import type { Content } from '../../shared/types';

interface ContentListProps {
  onSelectContent: (content: Content) => void;
  selectedId?: string;
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  if (diff < 60 * 1000) return '刚刚';
  if (diff < 60 * 60 * 1000) return `${Math.floor(diff / 60000)}分钟前`;
  if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / 3600000)}小时前`;
  if (diff < 7 * 24 * 60 * 60 * 1000) return `${Math.floor(diff / 86400000)}天前`;
  
  return date.toLocaleDateString('zh-CN');
}

function getTypeIcon(type: string): string {
  switch (type) {
    case 'article': return '📄';
    case 'video': return '🎬';
    case 'social': return '💬';
    default: return '📰';
  }
}

export function ContentList({ onSelectContent, selectedId }: ContentListProps) {
  const { contents, isLoading, markAsRead, toggleStar, archive, deleteContent, setFilter } = useContentStore();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectMode, setIsSelectMode] = useState(false);

  const markAllAsRead = async () => {
    for (const content of contents.filter(c => !c.isRead)) {
      await markAsRead(content.id);
    }
  };

  const archiveAll = async () => {
    for (const content of contents) {
      await archive(content.id);
    }
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const selectAll = () => {
    setSelectedIds(new Set(contents.map(c => c.id)));
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    setIsSelectMode(false);
  };

  const batchArchive = async () => {
    for (const id of selectedIds) {
      await archive(id);
    }
    clearSelection();
  };

  const batchMarkRead = async () => {
    for (const id of selectedIds) {
      await markAsRead(id);
    }
    clearSelection();
  };

  const batchDelete = async () => {
    for (const id of selectedIds) {
      await deleteContent(id);
    }
    clearSelection();
  };

  if (isLoading) {
    return (
      <div className="w-96 border-r border-[var(--color-border)] flex items-center justify-center">
        <div className="text-[var(--color-muted-foreground)]">加载中...</div>
      </div>
    );
  }

  if (contents.length === 0) {
    return (
      <div className="w-96 border-r border-[var(--color-border)] flex items-center justify-center">
        <div className="text-center text-[var(--color-muted-foreground)] p-4">
          <p className="text-lg mb-2">暂无内容</p>
          <p className="text-sm">添加RSS订阅或粘贴链接开始</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-96 border-r border-[var(--color-border)] flex flex-col">
      {isSelectMode && selectedIds.size > 0 ? (
        <div className="h-12 flex items-center justify-between px-4 border-b border-[var(--color-border)] bg-[var(--color-accent)]">
          <span className="text-sm font-medium">已选择 {selectedIds.size} 项</span>
          <div className="flex gap-1">
            <button onClick={selectAll} className="text-xs px-2 py-1 rounded hover:bg-[var(--color-muted)]">全选</button>
            <button onClick={batchMarkRead} className="text-xs px-2 py-1 rounded hover:bg-[var(--color-muted)]">已读</button>
            <button onClick={batchArchive} className="text-xs px-2 py-1 rounded hover:bg-[var(--color-muted)]">归档</button>
            <button onClick={batchDelete} className="text-xs px-2 py-1 rounded hover:bg-red-500/20 text-red-500">删除</button>
            <button onClick={clearSelection} className="text-xs px-2 py-1 rounded hover:bg-[var(--color-muted)]">取消</button>
          </div>
        </div>
      ) : (
        <div className="h-12 flex items-center justify-between px-4 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2">
            <span className="text-sm text-[var(--color-muted-foreground)]">{contents.length} 条内容</span>
            <button 
              onClick={() => setIsSelectMode(true)}
              className="text-xs px-2 py-1 rounded hover:bg-[var(--color-muted)] text-[var(--color-muted-foreground)]"
              title="批量选择"
            >
              ☑️
            </button>
          </div>
          <div className="flex gap-2">
            <select
              onChange={(e) => {
                const val = e.target.value;
                if (val === 'all') setFilter({ isRead: undefined });
                else if (val === 'unread') setFilter({ isRead: false });
                else if (val === 'read') setFilter({ isRead: true });
              }}
              className="text-xs px-2 py-1 rounded bg-[var(--color-background)] border border-[var(--color-border)]"
            >
              <option value="all">全部</option>
              <option value="unread">未读</option>
              <option value="read">已读</option>
            </select>
            <button 
              onClick={markAllAsRead}
              className="text-xs px-2 py-1 rounded hover:bg-[var(--color-muted)]"
              title="全部标记已读"
            >
              ✓
            </button>
            <button 
              onClick={archiveAll}
              className="text-xs px-2 py-1 rounded hover:bg-[var(--color-muted)]"
              title="Inbox Zero - 归档全部"
            >
              📥
            </button>
          </div>
        </div>
      )}
      
      <div className="flex-1 overflow-y-auto">
        {contents.map((content) => (
          <div
            key={content.id}
            onClick={() => {
              if (isSelectMode) {
                toggleSelect(content.id);
              } else {
                onSelectContent(content);
                if (!content.isRead) markAsRead(content.id);
              }
            }}
            className={`p-4 border-b border-[var(--color-border)] cursor-pointer transition-colors ${
              selectedId === content.id ? 'bg-[var(--color-muted)]' : 'hover:bg-[color-mix(in_srgb,var(--color-muted)_50%,transparent)]'
            } ${!content.isRead ? 'bg-[color-mix(in_srgb,var(--color-accent)_30%,transparent)]' : ''} ${
              selectedIds.has(content.id) ? 'ring-2 ring-[var(--color-primary)] ring-inset' : ''
            }`}
          >
            <div className="flex items-start gap-3">
              {isSelectMode && (
                <input
                  type="checkbox"
                  checked={selectedIds.has(content.id)}
                  onChange={() => toggleSelect(content.id)}
                  onClick={(e) => e.stopPropagation()}
                  className="mt-1"
                />
              )}
              <span className="text-lg">{getTypeIcon(content.type)}</span>
              <div className="flex-1 min-w-0">
                <h3 className={`text-sm font-medium line-clamp-2 ${!content.isRead ? 'font-semibold' : ''}`}>
                  {content.title}
                </h3>
                {content.summary && (
                  <p className="text-xs text-[var(--color-muted-foreground)] mt-1 line-clamp-2">
                    {content.summary}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-2 text-xs text-[var(--color-muted-foreground)]">
                  {content.author && <span>{content.author}</span>}
                  <span>{formatDate(content.publishedAt)}</span>
                </div>
              </div>
              {!isSelectMode && (
                <div className="flex flex-col gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleStar(content.id);
                    }}
                    className="p-1 hover:bg-[var(--color-background)] rounded"
                  >
                    {content.isStarred ? '⭐' : '☆'}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      archive(content.id);
                    }}
                    className="p-1 hover:bg-[var(--color-background)] rounded text-xs"
                  >
                    📥
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
