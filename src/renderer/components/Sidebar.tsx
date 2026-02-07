import React from 'react';
import { useContentStore } from '../stores/content-store';
import { FeedList } from './FeedList';
import type { ContentType } from '../../shared/types';
import { 
  LayoutList, 
  FileText, 
  Video, 
  MessageCircle, 
  Search, 
  BarChart2, 
  Settings, 
  Keyboard, 
  Plus 
} from 'lucide-react';

const tabs: Array<{ id: 'timeline' | ContentType; label: string; icon: React.ElementType }> = [
  { id: 'timeline', label: 'Timeline', icon: LayoutList },
  { id: 'article', label: '文章', icon: FileText },
  { id: 'video', label: '视频', icon: Video },
  { id: 'social', label: '社交', icon: MessageCircle },
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
    <aside className="w-64 bg-[var(--color-background)] border-r border-[var(--color-border)] flex flex-col pt-6 text-[var(--color-foreground)]">
      <div className="h-12 drag-region flex items-center justify-between px-4 mb-2">
        <h1 className="font-semibold text-sm tracking-tight">Nexus Reader</h1>
        <button
          onClick={onOpenAddContent}
          className="no-drag p-1.5 hover:bg-[var(--color-muted)] rounded-md text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors"
          title="添加内容"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
      
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-[var(--color-secondary)] text-[var(--color-foreground)]'
                  : 'text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.id === 'timeline' && unreadCount > 0 && (
                <span className="ml-auto bg-[var(--color-accent)] text-[var(--color-accent-foreground)] text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center">
                  {unreadCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <FeedList onAddFeed={onOpenAddFeed} />
      
      <div className="p-3 mt-auto space-y-0.5 border-t border-[var(--color-border)]">
        {onOpenSearch && (
          <button 
            onClick={onOpenSearch}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-sm font-medium text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)] transition-colors group"
          >
            <Search className="w-4 h-4" />
            <span>搜索</span>
            <span className="ml-auto text-[10px] font-mono opacity-50 border border-[var(--color-border)] px-1 rounded bg-[var(--color-card)] group-hover:border-[var(--color-muted-foreground)]">/</span>
          </button>
        )}
        <button 
          onClick={onOpenReport}
          className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-sm font-medium text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)] transition-colors"
        >
          <BarChart2 className="w-4 h-4" />
          <span>AI 报告</span>
        </button>
        <button 
          onClick={onOpenSettings}
          className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-sm font-medium text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)] transition-colors"
        >
          <Settings className="w-4 h-4" />
          <span>设置</span>
        </button>
        {onOpenShortcuts && (
          <button 
            onClick={onOpenShortcuts}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-sm font-medium text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)] transition-colors group"
          >
            <Keyboard className="w-4 h-4" />
            <span>快捷键</span>
            <span className="ml-auto text-[10px] font-mono opacity-50 border border-[var(--color-border)] px-1 rounded bg-[var(--color-card)] group-hover:border-[var(--color-muted-foreground)]">?</span>
          </button>
        )}
      </div>
    </aside>
  );
}
