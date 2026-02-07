import { useState, useEffect, useRef, useMemo } from 'react';

interface Command {
  id: string;
  name: string;
  shortcut: string;
  category: string;
  action: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  commands: Command[];
}

const CATEGORIES_ORDER = ['导航', 'Tab切换', '内容操作', '高亮', '批量操作', '全局', '视图'];

function fuzzyMatch(text: string, query: string): boolean {
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  let queryIndex = 0;
  for (let i = 0; i < lowerText.length && queryIndex < lowerQuery.length; i++) {
    if (lowerText[i] === lowerQuery[queryIndex]) {
      queryIndex++;
    }
  }
  return queryIndex === lowerQuery.length;
}

export function CommandPalette({ isOpen, onClose, commands }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filteredCommands = useMemo(() => {
    if (!query.trim()) return commands;
    return commands.filter(cmd => 
      fuzzyMatch(cmd.name, query) || fuzzyMatch(cmd.category, query)
    );
  }, [commands, query]);

  const groupedCommands = useMemo(() => {
    const groups: Record<string, Command[]> = {};
    for (const cmd of filteredCommands) {
      if (!groups[cmd.category]) {
        groups[cmd.category] = [];
      }
      groups[cmd.category].push(cmd);
    }
    return CATEGORIES_ORDER
      .filter(cat => groups[cat])
      .map(cat => ({ category: cat, commands: groups[cat] }));
  }, [filteredCommands]);

  const flatList = useMemo(() => {
    return groupedCommands.flatMap(g => g.commands);
  }, [groupedCommands]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    const selectedEl = listRef.current?.querySelector(`[data-index="${selectedIndex}"]`);
    selectedEl?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(i => Math.min(i + 1, flatList.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(i => Math.max(i - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (flatList[selectedIndex]) {
            flatList[selectedIndex].action();
            onClose();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, flatList, selectedIndex]);

  if (!isOpen) return null;

  let globalIndex = -1;

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-start justify-center pt-[15vh] z-50"
      onClick={onClose}
    >
      <div 
        className="bg-[var(--color-card)] rounded-lg shadow-xl w-full max-w-lg overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 p-4 border-b border-[var(--color-border)]">
          <span className="text-[var(--color-muted-foreground)]">⌘</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="输入命令..."
            className="flex-1 bg-transparent outline-none text-lg"
            autoFocus
          />
        </div>

        <div ref={listRef} className="max-h-[60vh] overflow-y-auto">
          {groupedCommands.length === 0 ? (
            <div className="p-4 text-center text-[var(--color-muted-foreground)]">
              没有找到匹配的命令
            </div>
          ) : (
            groupedCommands.map(group => (
              <div key={group.category}>
                <div className="px-4 py-2 text-xs font-medium text-[var(--color-muted-foreground)] uppercase tracking-wide bg-[var(--color-muted)]/50">
                  {group.category}
                </div>
                {group.commands.map(cmd => {
                  globalIndex++;
                  const isSelected = globalIndex === selectedIndex;
                  const currentIndex = globalIndex;
                  return (
                    <div
                      key={cmd.id}
                      data-index={currentIndex}
                      onClick={() => {
                        cmd.action();
                        onClose();
                      }}
                      onMouseEnter={() => setSelectedIndex(currentIndex)}
                      className={`flex items-center justify-between px-4 py-2.5 cursor-pointer transition-colors ${
                        isSelected 
                          ? 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)]' 
                          : 'hover:bg-[var(--color-muted)]'
                      }`}
                    >
                      <span className="text-sm">{cmd.name}</span>
                      <kbd className={`px-2 py-1 rounded text-xs font-mono ${
                        isSelected 
                          ? 'bg-[var(--color-primary-foreground)]/20' 
                          : 'bg-[var(--color-muted)]'
                      }`}>
                        {cmd.shortcut}
                      </kbd>
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>

        <div className="p-2 border-t border-[var(--color-border)] flex items-center justify-between text-xs text-[var(--color-muted-foreground)]">
          <div className="flex items-center gap-3">
            <span><kbd className="px-1.5 py-0.5 bg-[var(--color-muted)] rounded">↑↓</kbd> 导航</span>
            <span><kbd className="px-1.5 py-0.5 bg-[var(--color-muted)] rounded">Enter</kbd> 执行</span>
            <span><kbd className="px-1.5 py-0.5 bg-[var(--color-muted)] rounded">Esc</kbd> 关闭</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function useCommandPalette() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
  };
}
