import { useEffect, useCallback } from 'react';

interface KeyboardShortcuts {
  onNextItem?: () => void;
  onPrevItem?: () => void;
  onMarkRead?: () => void;
  onMarkAllRead?: () => void;
  onToggleStar?: () => void;
  onArchive?: () => void;
  onDelete?: () => void;
  onOpenItem?: () => void;
  onOpenExternal?: () => void;
  onCloseReader?: () => void;
  onSearch?: () => void;
  onRefresh?: () => void;
  onAddContent?: () => void;
  onAddFeed?: () => void;
  onShowHelp?: () => void;
  onShowReport?: () => void;
  onShowSettings?: () => void;
  onNextTab?: () => void;
  onPrevTab?: () => void;
  onGoToTab?: (index: number) => void;
  onToggleSelectMode?: () => void;
  onSelectAll?: () => void;
  onAiSummary?: () => void;
  onCommandPalette?: () => void;
  onHighlight?: () => void;
  onHighlightWithNote?: () => void;
  onAddTag?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onToggleLeftSidebar?: () => void;
  onToggleRightSidebar?: () => void;
  onBumpToTop?: () => void;
}

export function useKeyboard(shortcuts: KeyboardShortcuts, enabled = true) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Ignore if typing in input/textarea
    if (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement ||
      e.target instanceof HTMLSelectElement
    ) {
      return;
    }

    // Ignore if modal is open (check for modal backdrop)
    if (document.querySelector('.fixed.inset-0.bg-black\\/50')) {
      if (e.key === 'Escape') {
        // Allow escape to close modals
        return;
      }
      return;
    }

    const { key, metaKey, ctrlKey, shiftKey } = e;
    const mod = metaKey || ctrlKey;

    switch (key) {
      case 'j':
      case 'ArrowDown':
        if (!mod && shortcuts.onNextItem) {
          e.preventDefault();
          shortcuts.onNextItem();
        }
        break;
      case 'k':
        if (mod && shortcuts.onCommandPalette) {
          e.preventDefault();
          shortcuts.onCommandPalette();
        } else if (!mod && shortcuts.onPrevItem) {
          e.preventDefault();
          shortcuts.onPrevItem();
        }
        break;
      case 'ArrowUp':
        if (!mod && shortcuts.onPrevItem) {
          e.preventDefault();
          shortcuts.onPrevItem();
        }
        break;
      case 'Enter':
      case 'o':
        if (!mod && shortcuts.onOpenItem) {
          e.preventDefault();
          shortcuts.onOpenItem();
        }
        break;
      case 'Escape':
        if (shortcuts.onCloseReader) {
          e.preventDefault();
          shortcuts.onCloseReader();
        }
        break;
      case 'm':
        if (!mod && shortcuts.onMarkRead) {
          e.preventDefault();
          shortcuts.onMarkRead();
        }
        break;
      case 's':
        if (!mod && shortcuts.onToggleStar) {
          e.preventDefault();
          shortcuts.onToggleStar();
        }
        break;
      case 'e':
        if (!mod && shortcuts.onArchive) {
          e.preventDefault();
          shortcuts.onArchive();
        }
        break;
      case 'd':
        if (!mod && shortcuts.onDelete) {
          e.preventDefault();
          shortcuts.onDelete();
        }
        break;
      case '/':
        if (!mod && shortcuts.onSearch) {
          e.preventDefault();
          shortcuts.onSearch();
        }
        break;
      case 'r':
        if (mod && shortcuts.onRefresh) {
          e.preventDefault();
          shortcuts.onRefresh();
        }
        break;
      case 'n':
        if (mod && shortcuts.onAddContent) {
          e.preventDefault();
          shortcuts.onAddContent();
        } else if (!mod && shortcuts.onHighlightWithNote) {
          e.preventDefault();
          shortcuts.onHighlightWithNote();
        }
        break;
      case 'f':
        if (mod && shortcuts.onAddFeed) {
          e.preventDefault();
          shortcuts.onAddFeed();
        }
        break;
      case '?':
        if (shortcuts.onShowHelp) {
          e.preventDefault();
          shortcuts.onShowHelp();
        }
        break;
      case 'g':
        if (mod && shortcuts.onShowReport) {
          e.preventDefault();
          shortcuts.onShowReport();
        }
        break;
      case ',':
        if (mod && shortcuts.onShowSettings) {
          e.preventDefault();
          shortcuts.onShowSettings();
        }
        break;
      case 'Tab':
        if (!shiftKey && shortcuts.onNextTab) {
          e.preventDefault();
          shortcuts.onNextTab();
        } else if (shiftKey && shortcuts.onPrevTab) {
          e.preventDefault();
          shortcuts.onPrevTab();
        }
        break;
      case '1':
      case '2':
      case '3':
      case '4':
        if (mod && shortcuts.onGoToTab) {
          e.preventDefault();
          shortcuts.onGoToTab(parseInt(key) - 1);
        }
        break;
      case 'x':
        if (!mod && shortcuts.onToggleSelectMode) {
          e.preventDefault();
          shortcuts.onToggleSelectMode();
        }
        break;
      case 'a':
        if (mod && shortcuts.onSelectAll) {
          e.preventDefault();
          shortcuts.onSelectAll();
        }
        break;
      case 'i':
        if (!mod && shortcuts.onAiSummary) {
          e.preventDefault();
          shortcuts.onAiSummary();
        }
        break;
      case 'v':
        if (!mod && shortcuts.onOpenExternal) {
          e.preventDefault();
          shortcuts.onOpenExternal();
        }
        break;
      case 'M':
        if (shiftKey && shortcuts.onMarkAllRead) {
          e.preventDefault();
          shortcuts.onMarkAllRead();
        }
        break;
      case 'h':
        if (!mod && shortcuts.onHighlight) {
          e.preventDefault();
          shortcuts.onHighlight();
        }
        break;
      case 't':
        if (!mod && shortcuts.onAddTag) {
          e.preventDefault();
          shortcuts.onAddTag();
        }
        break;
      case 'z':
        if (mod && shiftKey && shortcuts.onRedo) {
          e.preventDefault();
          shortcuts.onRedo();
        } else if (mod && shortcuts.onUndo) {
          e.preventDefault();
          shortcuts.onUndo();
        } else if (!mod && shortcuts.onUndo) {
          e.preventDefault();
          shortcuts.onUndo();
        }
        break;
      case '[':
        if (!mod && shortcuts.onToggleLeftSidebar) {
          e.preventDefault();
          shortcuts.onToggleLeftSidebar();
        }
        break;
      case ']':
        if (!mod && shortcuts.onToggleRightSidebar) {
          e.preventDefault();
          shortcuts.onToggleRightSidebar();
        }
        break;
      case 'b':
        if (!mod && shortcuts.onBumpToTop) {
          e.preventDefault();
          shortcuts.onBumpToTop();
        }
        break;
    }
  }, [shortcuts]);

  useEffect(() => {
    if (!enabled) return;
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown, enabled]);
}

export const SHORTCUTS_HELP = [
  { category: '导航', items: [
    { key: 'j / ↓', description: '下一条' },
    { key: 'k / ↑', description: '上一条' },
    { key: 'Enter / o', description: '打开阅读' },
    { key: 'v', description: '在浏览器中打开' },
    { key: 'Esc', description: '关闭阅读器' },
    { key: 'Tab', description: '下一个 Tab' },
    { key: 'Shift+Tab', description: '上一个 Tab' },
    { key: '⌘+1/2/3/4', description: '切换到指定 Tab' },
  ]},
  { category: '阅读视图', items: [
    { key: '[', description: '切换左侧边栏' },
    { key: ']', description: '切换右侧边栏' },
  ]},
  { category: '内容操作', items: [
    { key: 'm', description: '标记已读' },
    { key: 'Shift+M', description: '全部标记已读' },
    { key: 's', description: '收藏/取消收藏' },
    { key: 'e', description: '归档' },
    { key: 'd', description: '删除' },
    { key: 'b', description: '置顶' },
    { key: 't', description: '添加标签' },
    { key: 'i', description: 'AI 摘要' },
    { key: 'z / ⌘Z', description: '撤销' },
    { key: '⌘⇧Z', description: '重做' },
  ]},
  { category: '高亮与笔记', items: [
    { key: 'h', description: '高亮选中文本' },
    { key: 'n', description: '高亮并添加笔记' },
  ]},
  { category: '批量操作', items: [
    { key: 'x', description: '进入/退出选择模式' },
    { key: '⌘+A', description: '全选' },
  ]},
  { category: '全局', items: [
    { key: '⌘+K', description: '命令面板' },
    { key: '/', description: '搜索' },
    { key: '⌘+N', description: '添加内容' },
    { key: '⌘+F', description: '添加订阅源' },
    { key: '⌘+R', description: '刷新' },
    { key: '⌘+G', description: 'AI 报告' },
    { key: '⌘+,', description: '设置' },
    { key: '?', description: '显示快捷键帮助' },
  ]},
];
