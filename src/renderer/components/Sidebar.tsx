import { useContentStore } from '../stores/content-store';
import { FeedList } from './FeedList';
import type { ContentType } from '../../shared/types';

const tabs: Array<{ id: 'timeline' | ContentType; label: string; icon: string }> = [
  { id: 'timeline', label: 'Timeline', icon: '📰' },
  { id: 'article', label: '文章', icon: '📄' },
  { id: 'video', label: '视频', icon: '🎬' },
  { id: 'social', label: '社交', icon: '💬' },
];

interface SidebarProps {
  onOpenSettings: () => void;
  onOpenAddFeed: () => void;
  onOpenAddContent: () => void;
  onOpenReport: () => void;
  onOpenShortcuts?: () => void;
  onOpenSearch?: () => void;
}

export function Sidebar({ onOpenSettings, onOpenAddFeed, onOpenAddContent, onOpenReport, onOpenShortcuts, onOpenSearch }: SidebarProps) {
  const { activeTab, setActiveTab, contents } = useContentStore();
  
  const unreadCount = contents.filter((c) => !c.isRead).length;

  return (
    <aside className="w-56 bg-[var(--color-card)] border-r border-[var(--color-border)] flex flex-col">
      <div className="h-12 drag-region flex items-center justify-between px-4 border-b border-[var(--color-border)]">
        <h1 className="font-semibold text-lg">Nexus Reader</h1>
        <button
          onClick={onOpenAddContent}
          className="no-drag text-lg hover:bg-[var(--color-muted)] rounded p-1"
          title="添加内容"
        >
          ➕
        </button>
      </div>
      
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
              activeTab === tab.id
                ? 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)]'
                : 'hover:bg-[var(--color-muted)] text-[var(--color-foreground)]'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
            {tab.id === 'timeline' && unreadCount > 0 && (
              <span className="ml-auto bg-[var(--color-accent)] text-[var(--color-accent-foreground)] text-xs px-2 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </button>
        ))}
      </nav>

      <FeedList onAddFeed={onOpenAddFeed} />
      
      <div className="p-2 border-t border-[var(--color-border)] space-y-1">
        {onOpenSearch && (
          <button 
            onClick={onOpenSearch}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm hover:bg-[var(--color-muted)] text-[var(--color-muted-foreground)]"
          >
            <span>🔍</span>
            <span>搜索</span>
            <span className="ml-auto text-xs opacity-50">/</span>
          </button>
        )}
        <button 
          onClick={onOpenReport}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm hover:bg-[var(--color-muted)] text-[var(--color-muted-foreground)]"
        >
          <span>📊</span>
          <span>AI 报告</span>
        </button>
        <button 
          onClick={onOpenSettings}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm hover:bg-[var(--color-muted)] text-[var(--color-muted-foreground)]"
        >
          <span>⚙️</span>
          <span>设置</span>
        </button>
        {onOpenShortcuts && (
          <button 
            onClick={onOpenShortcuts}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm hover:bg-[var(--color-muted)] text-[var(--color-muted-foreground)]"
          >
            <span>⌨️</span>
            <span>快捷键</span>
            <span className="ml-auto text-xs opacity-50">?</span>
          </button>
        )}
      </div>
    </aside>
  );
}
