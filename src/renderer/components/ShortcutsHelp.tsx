import { SHORTCUTS_HELP } from '../hooks/useKeyboard';

interface ShortcutsHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ShortcutsHelp({ isOpen, onClose }: ShortcutsHelpProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div 
        className="bg-[var(--color-card)] rounded-lg shadow-xl w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold mb-4">快捷键</h2>
        
        <div className="space-y-2">
          {SHORTCUTS_HELP.map((shortcut) => (
            <div key={shortcut.key} className="flex justify-between items-center py-1">
              <span className="text-sm">{shortcut.description}</span>
              <kbd className="px-2 py-1 bg-[var(--color-muted)] rounded text-xs font-mono">
                {shortcut.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t border-[var(--color-border)] flex justify-end">
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
