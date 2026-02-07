import { useState, useImperativeHandle, forwardRef } from 'react';
import { useContentStore } from '../stores/content-store';
import type { Content } from '../../shared/types';
import { 
  FileText, 
  Youtube, 
  MessageCircle, 
  LayoutList, 
  CheckSquare, 
  Check, 
  Archive, 
  Star, 
  Inbox, 
  Trash2,
  X,
  Filter
} from 'lucide-react';

interface ContentListProps {
  onSelectContent: (content: Content) => void;
  selectedId?: string;
}

export interface ContentListRef {
  toggleSelectMode: () => void;
  selectAll: () => void;
  clearSelection: () => void;
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  if (diff < 60 * 1000) return 'Just now';
  if (diff < 60 * 60 * 1000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 7 * 24 * 60 * 60 * 1000) return `${Math.floor(diff / 86400000)}d ago`;
  
  return date.toLocaleDateString('zh-CN');
}

function TypeIcon({ type, className }: { type: string, className?: string }) {
  switch (type) {
    case 'article': return <FileText className={className} />;
    case 'video': return <Youtube className={className} />;
    case 'social': return <MessageCircle className={className} />;
    default: return <LayoutList className={className} />;
  }
}

export const ContentList = forwardRef<ContentListRef, ContentListProps>(function ContentList({ onSelectContent, selectedId }, ref) {
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
    setIsSelectMode(true);
    setSelectedIds(new Set(contents.map(c => c.id)));
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    setIsSelectMode(false);
  };

  const toggleSelectMode = () => {
    if (isSelectMode) {
      clearSelection();
    } else {
      setIsSelectMode(true);
    }
  };

  useImperativeHandle(ref, () => ({
    toggleSelectMode,
    selectAll,
    clearSelection,
  }));

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
      <div className="w-96 border-r border-[var(--color-border)] flex items-center justify-center bg-[var(--color-background)]">
        <div className="text-[var(--color-muted-foreground)] text-sm">Loading...</div>
      </div>
    );
  }

  if (contents.length === 0) {
    return (
      <div className="w-96 border-r border-[var(--color-border)] flex items-center justify-center bg-[var(--color-background)]">
        <div className="text-center text-[var(--color-muted-foreground)] p-8">
          <div className="bg-[var(--color-muted)] w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
            <Inbox className="w-6 h-6 opacity-50" />
          </div>
          <p className="text-sm font-medium mb-1">No content</p>
          <p className="text-xs opacity-70">Add feeds or save links to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-96 border-r border-[var(--color-border)] flex flex-col bg-[var(--color-background)] h-full">
      {isSelectMode ? (
        <div className="h-14 flex items-center justify-between px-4 border-b border-[var(--color-border)] bg-[var(--color-secondary)]">
          <span className="text-xs font-medium">{selectedIds.size} selected</span>
          <div className="flex gap-1">
            <button onClick={selectAll} className="p-1.5 hover:bg-[var(--color-muted)] rounded" title="Select All">
              <CheckSquare className="w-4 h-4" />
            </button>
            <button onClick={batchMarkRead} className="p-1.5 hover:bg-[var(--color-muted)] rounded" title="Mark Read">
              <Check className="w-4 h-4" />
            </button>
            <button onClick={batchArchive} className="p-1.5 hover:bg-[var(--color-muted)] rounded" title="Archive">
              <Archive className="w-4 h-4" />
            </button>
            <button onClick={batchDelete} className="p-1.5 hover:bg-red-100 text-red-600 rounded" title="Delete">
              <Trash2 className="w-4 h-4" />
            </button>
            <button onClick={clearSelection} className="p-1.5 hover:bg-[var(--color-muted)] rounded" title="Cancel">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="h-14 flex items-center justify-between px-4 border-b border-[var(--color-border)] bg-[var(--color-background)]/80 backdrop-blur-sm sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-[var(--color-muted-foreground)] uppercase tracking-wider">{contents.length} Items</span>
          </div>
          <div className="flex items-center gap-1">
             <div className="relative group">
                <button className="p-1.5 hover:bg-[var(--color-muted)] rounded text-[var(--color-muted-foreground)]">
                  <Filter className="w-3.5 h-3.5" />
                </button>
                <select
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'all') setFilter({ isRead: undefined });
                    else if (val === 'unread') setFilter({ isRead: false });
                    else if (val === 'read') setFilter({ isRead: true });
                  }}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                >
                  <option value="all">All</option>
                  <option value="unread">Unread</option>
                  <option value="read">Read</option>
                </select>
             </div>
            
            <button 
              onClick={() => setIsSelectMode(true)}
              className="p-1.5 hover:bg-[var(--color-muted)] rounded text-[var(--color-muted-foreground)]"
              title="Select Mode"
            >
              <CheckSquare className="w-3.5 h-3.5" />
            </button>
            <button 
              onClick={markAllAsRead}
              className="p-1.5 hover:bg-[var(--color-muted)] rounded text-[var(--color-muted-foreground)]"
              title="Mark all as read"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
            <button 
              onClick={archiveAll}
              className="p-1.5 hover:bg-[var(--color-muted)] rounded text-[var(--color-muted-foreground)]"
              title="Archive all"
            >
              <Archive className="w-3.5 h-3.5" />
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
            className={`group relative p-3 border-b border-[var(--color-border)] cursor-pointer transition-all hover:bg-[var(--color-muted)]/50 ${
              selectedId === content.id ? 'bg-[var(--color-muted)] border-l-2 border-l-[var(--color-accent)]' : 'border-l-2 border-l-transparent'
            } ${!content.isRead ? 'bg-[var(--color-background)]' : 'bg-[var(--color-background)] opacity-75 grayscale-[0.3]'}`}
          >
            <div className="flex gap-3">
              {isSelectMode && (
                <div className="pt-1">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(content.id)}
                    onChange={() => toggleSelect(content.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-4 h-4 rounded border-gray-300 text-[var(--color-primary)] focus:ring-[var(--color-ring)]"
                  />
                </div>
              )}
              
              <div className="pt-0.5 text-[var(--color-muted-foreground)]">
                <TypeIcon type={content.type} className="w-4 h-4" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h3 className={`text-sm leading-snug mb-1 text-[var(--color-foreground)] ${!content.isRead ? 'font-semibold' : 'font-medium'}`}>
                    {content.title}
                  </h3>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                     <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleStar(content.id);
                        }}
                        className={`p-1 rounded hover:bg-[var(--color-background)] ${content.isStarred ? 'text-[var(--color-accent)] opacity-100' : 'text-[var(--color-muted-foreground)]'}`}
                      >
                        <Star className={`w-3.5 h-3.5 ${content.isStarred ? 'fill-current' : ''}`} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          archive(content.id);
                        }}
                        className="p-1 rounded hover:bg-[var(--color-background)] text-[var(--color-muted-foreground)]"
                        title="Archive"
                      >
                        <Archive className="w-3.5 h-3.5" />
                      </button>
                  </div>
                </div>
                
                {content.summary && (
                  <p className="text-xs text-[var(--color-muted-foreground)] line-clamp-2 mb-2 leading-relaxed">
                    {content.summary}
                  </p>
                )}
                
                <div className="flex items-center gap-2 text-[10px] text-[var(--color-muted-foreground)] uppercase tracking-wider font-medium">
                  {content.author && <span className="max-w-[100px] truncate">{content.author}</span>}
                  <span>•</span>
                  <span>{formatDate(content.publishedAt)}</span>
                </div>
              </div>
            </div>
            
            {content.isStarred && !isSelectMode && (
               <div className="absolute top-0 right-0 p-1">
                 <div className="w-0 h-0 border-t-[12px] border-r-[12px] border-t-[var(--color-accent)] border-r-transparent opacity-80"></div>
               </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
});
