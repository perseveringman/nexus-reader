import { useState, useEffect, useRef } from 'react';

interface NoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (note: string) => void;
  highlightText: string;
  initialNote?: string;
}

export function NoteModal({ isOpen, onClose, onSave, highlightText, initialNote = '' }: NoteModalProps) {
  const [note, setNote] = useState(initialNote);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setNote(initialNote);
  }, [initialNote]);

  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, note, onClose]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(note);
    setNote('');
    onClose();
  };

  const handleCancel = () => {
    setNote('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[var(--color-card)] rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="p-4 border-b border-[var(--color-border)]">
          <h3 className="text-lg font-medium">添加笔记</h3>
        </div>
        
        <div className="p-4 space-y-4">
          <div>
            <label className="text-sm text-[var(--color-muted-foreground)] mb-1 block">高亮文本</label>
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded text-sm max-h-24 overflow-y-auto">
              {highlightText}
            </div>
          </div>
          
          <div>
            <label className="text-sm text-[var(--color-muted-foreground)] mb-1 block">笔记</label>
            <textarea
              ref={textareaRef}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="输入笔记..."
              className="w-full h-32 p-3 bg-[var(--color-secondary)] rounded border border-[var(--color-border)] outline-none focus:ring-2 focus:ring-[var(--color-ring)] resize-none"
            />
          </div>
        </div>
        
        <div className="p-4 border-t border-[var(--color-border)] flex justify-end gap-2">
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm bg-[var(--color-primary)] text-[var(--color-primary-foreground)] rounded hover:opacity-90 transition-opacity"
          >
            保存
          </button>
        </div>
        
        <div className="px-4 pb-3 text-xs text-[var(--color-muted-foreground)]">
          ⌘/Ctrl+Enter 保存，Esc 取消
        </div>
      </div>
    </div>
  );
}
