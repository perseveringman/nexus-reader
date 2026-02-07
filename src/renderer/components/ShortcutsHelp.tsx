import { SHORTCUTS_HELP } from '../hooks/useKeyboard';
import { useEffect } from 'react';

interface ShortcutsHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ShortcutsHelp({ isOpen, onClose }: ShortcutsHelpProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div 
        className="bg-[var(--color-card)] rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold mb-4">键盘快捷键</h2>
        
        <div className="grid grid-cols-2 gap-6">
          {SHORTCUTS_HELP.map((section) => (
            <div key={section.category}>
              <h3 className="text-sm font-medium text-[var(--color-muted-foreground)] mb-2 uppercase tracking-wide">
                {section.category}
              </h3>
              <div className="space-y-1">
                {section.items.map((shortcut) => (
                  <div key={shortcut.key} className="flex justify-between items-center py-1">
                    <span className="text-sm">{shortcut.description}</span>
                    <kbd className="px-2 py-1 bg-[var(--color-muted)] rounded text-xs font-mono whitespace-nowrap">
                      {shortcut.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t border-[var(--color-border)] flex justify-between items-center">
          <span className="text-xs text-[var(--color-muted-foreground)]">
            按 <kbd className="px-1 py-0.5 bg-[var(--color-muted)] rounded text-xs">?</kbd> 随时打开此帮助
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-md hover:bg-[var(--color-muted)]"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
