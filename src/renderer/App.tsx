import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { Sidebar } from './components/Sidebar';
import { ContentList, ContentListRef } from './components/ContentList';
import { ContentReader } from './components/ContentReader';
import { AddFeedModal } from './components/AddFeedModal';
import { AddContentModal } from './components/AddContentModal';
import { SettingsModal } from './components/SettingsModal';
import { ReportModal } from './components/ReportModal';
import { SearchModal } from './components/SearchModal';
import { ShortcutsHelp } from './components/ShortcutsHelp';
import { CommandPalette, useCommandPalette } from './components/CommandPalette';
import { useContentStore } from './stores/content-store';
import { useSettingsStore } from './stores/settings-store';
import { useFeedStore } from './stores/feed-store';
import { useUndoStore } from './stores/undo-store';
import { UndoToast } from './components/UndoToast';
import { useKeyboard } from './hooks/useKeyboard';
import type { Content, ContentType } from '../shared/types';

const TABS: Array<'timeline' | ContentType> = ['timeline', 'article', 'video', 'social'];

export default function App() {
  const [selectedContent, setSelectedContent] = useState<Content | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showAddFeed, setShowAddFeed] = useState(false);
  const [showAddContent, setShowAddContent] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const commandPalette = useCommandPalette();
  const contentListRef = useRef<ContentListRef>(null);
  const { contents, loadContents, markAsRead, toggleStar, archive, deleteContent, activeTab, setActiveTab } = useContentStore();
  const { loadSettings, theme } = useSettingsStore();
  const { syncAllFeeds } = useFeedStore();
  const { undo: undoAction, redo: redoAction } = useUndoStore();

  // Keyboard navigation
  const handleNextItem = useCallback(() => {
    if (contents.length === 0) return;
    const newIndex = Math.min(selectedIndex + 1, contents.length - 1);
    setSelectedIndex(newIndex);
    setSelectedContent(contents[newIndex]);
  }, [contents, selectedIndex]);

  const handlePrevItem = useCallback(() => {
    if (contents.length === 0) return;
    const newIndex = Math.max(selectedIndex - 1, 0);
    setSelectedIndex(newIndex);
    setSelectedContent(contents[newIndex]);
  }, [contents, selectedIndex]);

  const handleOpenItem = useCallback(() => {
    if (contents.length > 0 && !selectedContent) {
      setSelectedContent(contents[selectedIndex]);
    }
  }, [contents, selectedIndex, selectedContent]);

  const handleMarkRead = useCallback(() => {
    if (selectedContent) {
      markAsRead(selectedContent.id);
    }
  }, [selectedContent, markAsRead]);

  const handleToggleStar = useCallback(() => {
    if (selectedContent) {
      toggleStar(selectedContent.id);
    }
  }, [selectedContent, toggleStar]);

  const handleArchive = useCallback(() => {
    if (selectedContent) {
      archive(selectedContent.id);
      handleNextItem();
    }
  }, [selectedContent, archive, handleNextItem]);

  const handleDelete = useCallback(() => {
    if (selectedContent) {
      deleteContent(selectedContent.id);
      handleNextItem();
    }
  }, [selectedContent, deleteContent, handleNextItem]);

  const handleRefresh = useCallback(async () => {
    await syncAllFeeds();
    await loadContents();
  }, [syncAllFeeds, loadContents]);

  const handleMarkAllRead = useCallback(async () => {
    for (const content of contents.filter(c => !c.isRead)) {
      await markAsRead(content.id);
    }
  }, [contents, markAsRead]);

  const handleNextTab = useCallback(() => {
    const currentIndex = TABS.indexOf(activeTab);
    const nextIndex = (currentIndex + 1) % TABS.length;
    setActiveTab(TABS[nextIndex]);
  }, [activeTab, setActiveTab]);

  const handlePrevTab = useCallback(() => {
    const currentIndex = TABS.indexOf(activeTab);
    const prevIndex = (currentIndex - 1 + TABS.length) % TABS.length;
    setActiveTab(TABS[prevIndex]);
  }, [activeTab, setActiveTab]);

  const handleGoToTab = useCallback((index: number) => {
    if (index >= 0 && index < TABS.length) {
      setActiveTab(TABS[index]);
    }
  }, [setActiveTab]);

  const handleOpenExternal = useCallback(() => {
    if (selectedContent?.url) {
      window.open(selectedContent.url, '_blank');
    }
  }, [selectedContent]);

  const [leftSidebarVisible, setLeftSidebarVisible] = useState(true);
  const [rightSidebarVisible, setRightSidebarVisible] = useState(true);
  const toggleLeftSidebar = useCallback(() => setLeftSidebarVisible(v => !v), []);
  const toggleRightSidebar = useCallback(() => setRightSidebarVisible(v => !v), []);

  const handleAiSummary = useCallback(async () => {
    if (selectedContent && !selectedContent.summary) {
      try {
        const summary = await window.api.generateSummary(selectedContent.id);
        if (summary) {
          setSelectedContent({ ...selectedContent, summary });
        }
      } catch (error) {
        console.error('Failed to generate summary:', error);
      }
    }
  }, [selectedContent]);

  useKeyboard({
    onNextItem: handleNextItem,
    onPrevItem: handlePrevItem,
    onOpenItem: handleOpenItem,
    onCloseReader: () => setSelectedContent(null),
    onMarkRead: handleMarkRead,
    onMarkAllRead: handleMarkAllRead,
    onToggleStar: handleToggleStar,
    onArchive: handleArchive,
    onDelete: handleDelete,
    onSearch: () => setShowSearch(true),
    onRefresh: handleRefresh,
    onAddContent: () => setShowAddContent(true),
    onAddFeed: () => setShowAddFeed(true),
    onShowHelp: () => setShowShortcuts(true),
    onShowReport: () => setShowReport(true),
    onShowSettings: () => setShowSettings(true),
    onNextTab: handleNextTab,
    onPrevTab: handlePrevTab,
    onGoToTab: handleGoToTab,
    onToggleSelectMode: () => contentListRef.current?.toggleSelectMode(),
    onSelectAll: () => contentListRef.current?.selectAll(),
    onAiSummary: handleAiSummary,
    onOpenExternal: handleOpenExternal,
    onUndo: undoAction,
    onRedo: redoAction,
    onCommandPalette: commandPalette.open,
    onToggleLeftSidebar: toggleLeftSidebar,
    onToggleRightSidebar: toggleRightSidebar,
  });

  // Update selectedIndex when content changes
  useEffect(() => {
    if (selectedContent) {
      const index = contents.findIndex(c => c.id === selectedContent.id);
      if (index !== -1) {
        setSelectedIndex(index);
      }
    }
  }, [selectedContent, contents]);

  useEffect(() => {
    loadSettings();
    loadContents();
  }, [loadSettings, loadContents]);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else if (theme === 'light') {
      root.classList.remove('dark');
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.toggle('dark', prefersDark);
    }
  }, [theme]);

  const commands = useMemo(() => [
    // 导航
    { id: 'nav-next', name: '下一条', shortcut: 'j', category: '导航', action: handleNextItem },
    { id: 'nav-prev', name: '上一条', shortcut: 'k', category: '导航', action: handlePrevItem },
    { id: 'nav-open', name: '打开', shortcut: 'Enter', category: '导航', action: handleOpenItem },
    { id: 'nav-close', name: '关闭阅读器', shortcut: 'Esc', category: '导航', action: () => setSelectedContent(null) },
    // Tab切换
    { id: 'tab-timeline', name: 'Timeline', shortcut: '⌘1', category: 'Tab切换', action: () => handleGoToTab(0) },
    { id: 'tab-article', name: '文章', shortcut: '⌘2', category: 'Tab切换', action: () => handleGoToTab(1) },
    { id: 'tab-video', name: '视频', shortcut: '⌘3', category: 'Tab切换', action: () => handleGoToTab(2) },
    { id: 'tab-social', name: '社交', shortcut: '⌘4', category: 'Tab切换', action: () => handleGoToTab(3) },
    // 内容操作
    { id: 'content-read', name: '标记已读', shortcut: 'm', category: '内容操作', action: handleMarkRead },
    { id: 'content-read-all', name: '全部已读', shortcut: 'Shift+M', category: '内容操作', action: handleMarkAllRead },
    { id: 'content-star', name: '收藏', shortcut: 's', category: '内容操作', action: handleToggleStar },
    { id: 'content-archive', name: '归档', shortcut: 'e', category: '内容操作', action: handleArchive },
    { id: 'content-delete', name: '删除', shortcut: 'd', category: '内容操作', action: handleDelete },
    { id: 'content-summary', name: 'AI摘要', shortcut: 'i', category: '内容操作', action: handleAiSummary },
    { id: 'content-external', name: '在浏览器打开', shortcut: 'v', category: '内容操作', action: handleOpenExternal },
    { id: 'content-pin', name: '置顶', shortcut: 'b', category: '内容操作', action: () => {} },
    // 撤销/重做
    { id: 'undo', name: '撤销', shortcut: '⌘Z', category: '内容操作', action: undoAction },
    { id: 'redo', name: '重做', shortcut: '⌘⇧Z', category: '内容操作', action: redoAction },
    // 高亮
    { id: 'highlight-paragraph', name: '高亮段落', shortcut: 'h', category: '高亮', action: () => {} },
    { id: 'highlight-note', name: '高亮并笔记', shortcut: 'n', category: '高亮', action: () => {} },
    { id: 'highlight-tag', name: '添加标签', shortcut: 't', category: '高亮', action: () => {} },
    // 批量操作
    { id: 'batch-select', name: '选择模式', shortcut: 'x', category: '批量操作', action: () => contentListRef.current?.toggleSelectMode() },
    { id: 'batch-all', name: '全选', shortcut: '⌘A', category: '批量操作', action: () => contentListRef.current?.selectAll() },
    // 全局
    { id: 'global-search', name: '搜索', shortcut: '/', category: '全局', action: () => setShowSearch(true) },
    { id: 'global-add-content', name: '添加内容', shortcut: '⌘N', category: '全局', action: () => setShowAddContent(true) },
    { id: 'global-add-feed', name: '添加订阅', shortcut: '⌘F', category: '全局', action: () => setShowAddFeed(true) },
    { id: 'global-refresh', name: '刷新', shortcut: '⌘R', category: '全局', action: handleRefresh },
    { id: 'global-report', name: 'AI报告', shortcut: '⌘G', category: '全局', action: () => setShowReport(true) },
    { id: 'global-settings', name: '设置', shortcut: '⌘,', category: '全局', action: () => setShowSettings(true) },
    { id: 'global-shortcuts', name: '快捷键帮助', shortcut: '?', category: '全局', action: () => setShowShortcuts(true) },
    // 视图
    { id: 'view-left', name: '切换左侧栏', shortcut: '[', category: '视图', action: toggleLeftSidebar },
    { id: 'view-right', name: '切换右侧栏', shortcut: ']', category: '视图', action: toggleRightSidebar },
  ], [
    handleNextItem, handlePrevItem, handleOpenItem, handleGoToTab,
    handleMarkRead, handleMarkAllRead, handleToggleStar, handleArchive,
    handleDelete, handleAiSummary, handleOpenExternal, handleRefresh,
    toggleLeftSidebar, toggleRightSidebar, undoAction, redoAction
  ]);

  return (
    <div className="flex h-screen bg-[var(--color-background)]">
      {leftSidebarVisible && (
        <Sidebar 
          onOpenSettings={() => setShowSettings(true)}
          onOpenAddFeed={() => setShowAddFeed(true)}
          onOpenAddContent={() => setShowAddContent(true)}
          onOpenReport={() => setShowReport(true)}
          onOpenSearch={() => setShowSearch(true)}
          onOpenShortcuts={() => setShowShortcuts(true)}
        />
      )}
      <main className="flex flex-1 overflow-hidden">
        <ContentList ref={contentListRef} onSelectContent={setSelectedContent} selectedId={selectedContent?.id} />
        {selectedContent ? (
          <ContentReader 
            content={selectedContent} 
            onClose={() => setSelectedContent(null)} 
            showRightSidebar={rightSidebarVisible}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-[var(--color-muted-foreground)] pt-[28px]">
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-2">选择一篇内容开始阅读</h2>
              <p className="text-sm">从左侧列表中选择文章、视频或社交媒体内容</p>
              <p className="text-xs mt-4 opacity-50">按 <kbd className="px-1.5 py-0.5 bg-[var(--color-muted)] rounded">⌘K</kbd> 打开命令面板</p>
            </div>
          </div>
        )}
      </main>

      <AddFeedModal isOpen={showAddFeed} onClose={() => setShowAddFeed(false)} />
      <AddContentModal isOpen={showAddContent} onClose={() => setShowAddContent(false)} />
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
      <ReportModal isOpen={showReport} onClose={() => setShowReport(false)} />
      <SearchModal isOpen={showSearch} onClose={() => setShowSearch(false)} />
      <ShortcutsHelp isOpen={showShortcuts} onClose={() => setShowShortcuts(false)} />
      <CommandPalette isOpen={commandPalette.isOpen} onClose={commandPalette.close} commands={commands} />
      <UndoToast />
    </div>
  );
}
