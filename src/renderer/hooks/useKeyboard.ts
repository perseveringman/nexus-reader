import { useEffect, useCallback } from 'react';

interface KeyboardShortcuts {
  onNextItem?: () => void;
  onPrevItem?: () => void;
  onMarkRead?: () => void;
  onToggleStar?: () => void;
  onArchive?: () => void;
  onDelete?: () => void;
  onOpenItem?: () => void;
  onCloseReader?: () => void;
  onSearch?: () => void;
  onRefresh?: () => void;
  onAddContent?: () => void;
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
      case 'Delete':
      case 'Backspace':
        if (shiftKey && shortcuts.onDelete) {
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
  { key: 'j / ↓', description: '下一条' },
  { key: 'k / ↑', description: '上一条' },
  { key: 'Enter / o', description: '打开' },
  { key: 'Esc', description: '关闭阅读器' },
  { key: 'm', description: '标记已读' },
  { key: 's', description: '收藏/取消收藏' },
  { key: 'e', description: '归档' },
  { key: 'Shift+Delete', description: '删除' },
  { key: '/', description: '搜索' },
  { key: '⌘+R', description: '刷新' },
  { key: '⌘+N', description: '添加内容' },
];
