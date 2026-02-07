import { useEffect, useRef } from 'react';
import { useUndoStore } from '../stores/undo-store';

export function UndoToast() {
  const { toastAction, toastVisible, dismissToast, undo, undoStack } = useUndoStore();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isUndoMessage = toastAction?.label.startsWith('已撤销') || toastAction?.label.startsWith('已重做');

  useEffect(() => {
    if (toastVisible) {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(dismissToast, 4000);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [toastVisible, toastAction, dismissToast]);

  if (!toastVisible || !toastAction) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 fade-in duration-200">
      <div className="flex items-center gap-3 px-4 py-2.5 bg-[var(--color-card)] border border-[var(--color-border)] rounded-lg shadow-lg">
        <span className="text-sm text-[var(--color-foreground)]">
          {toastAction.label}
        </span>
        {!isUndoMessage && undoStack.length > 0 && (
          <button
            onClick={async () => {
              if (timerRef.current) clearTimeout(timerRef.current);
              await undo();
            }}
            className="text-sm font-medium text-blue-500 hover:text-blue-400 transition-colors px-2 py-0.5 rounded hover:bg-blue-500/10"
          >
            撤销
          </button>
        )}
        <button
          onClick={dismissToast}
          className="text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors ml-1"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M11 3L3 11M3 3l8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
