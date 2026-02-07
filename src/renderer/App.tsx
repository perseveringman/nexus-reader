import { useEffect, useState, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { ContentList } from './components/ContentList';
import { ContentReader } from './components/ContentReader';
import { AddFeedModal } from './components/AddFeedModal';
import { AddContentModal } from './components/AddContentModal';
import { SettingsModal } from './components/SettingsModal';
import { ReportModal } from './components/ReportModal';
import { SearchModal } from './components/SearchModal';
import { ShortcutsHelp } from './components/ShortcutsHelp';
import { useContentStore } from './stores/content-store';
import { useSettingsStore } from './stores/settings-store';
import { useFeedStore } from './stores/feed-store';
import { useKeyboard } from './hooks/useKeyboard';
import type { Content } from '../shared/types';

export default function App() {
  const [selectedContent, setSelectedContent] = useState<Content | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showAddFeed, setShowAddFeed] = useState(false);
  const [showAddContent, setShowAddContent] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const { contents, loadContents, markAsRead, toggleStar, archive, deleteContent } = useContentStore();
  const { loadSettings, theme } = useSettingsStore();
  const { syncAllFeeds } = useFeedStore();

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

  useKeyboard({
    onNextItem: handleNextItem,
    onPrevItem: handlePrevItem,
    onOpenItem: handleOpenItem,
    onCloseReader: () => setSelectedContent(null),
    onMarkRead: handleMarkRead,
    onToggleStar: handleToggleStar,
    onArchive: handleArchive,
    onDelete: handleDelete,
    onSearch: () => setShowSearch(true),
    onRefresh: handleRefresh,
    onAddContent: () => setShowAddContent(true),
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

  return (
    <div className="flex h-screen bg-[var(--color-background)]">
      <Sidebar 
        onOpenSettings={() => setShowSettings(true)}
        onOpenAddFeed={() => setShowAddFeed(true)}
        onOpenAddContent={() => setShowAddContent(true)}
        onOpenReport={() => setShowReport(true)}
        onOpenSearch={() => setShowSearch(true)}
        onOpenShortcuts={() => setShowShortcuts(true)}
      />
      <main className="flex flex-1 overflow-hidden">
        <ContentList onSelectContent={setSelectedContent} selectedId={selectedContent?.id} />
        {selectedContent ? (
          <ContentReader content={selectedContent} onClose={() => setSelectedContent(null)} />
        ) : (
          <div className="flex-1 flex items-center justify-center text-[var(--color-muted-foreground)]">
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-2">选择一篇内容开始阅读</h2>
              <p className="text-sm">从左侧列表中选择文章、视频或社交媒体内容</p>
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
    </div>
  );
}
