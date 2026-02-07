import { useState, useEffect, useRef } from 'react';
import { useContentStore } from '../stores/content-store';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const { setFilter, loadContents } = useContentStore();

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setFilter({ search: query.trim() });
    } else {
      setFilter({ search: undefined });
    }
    await loadContents();
    onClose();
  };

  const handleClear = async () => {
    setQuery('');
    setFilter({ search: undefined });
    await loadContents();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center pt-[20vh] z-50">
      <div className="bg-[var(--color-card)] rounded-lg shadow-xl w-full max-w-lg">
        <form onSubmit={handleSearch}>
          <div className="flex items-center gap-3 p-4 border-b border-[var(--color-border)]">
            <span className="text-[var(--color-muted-foreground)]">🔍</span>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索内容..."
              className="flex-1 bg-transparent outline-none text-lg"
              autoFocus
            />
            {query && (
              <button
                type="button"
                onClick={handleClear}
                className="text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
              >
                清除
              </button>
            )}
          </div>
          <div className="p-3 flex justify-between items-center text-xs text-[var(--color-muted-foreground)]">
            <span>按 Enter 搜索，Esc 关闭</span>
            <button
              type="submit"
              className="px-3 py-1 bg-[var(--color-primary)] text-[var(--color-primary-foreground)] rounded"
            >
              搜索
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
