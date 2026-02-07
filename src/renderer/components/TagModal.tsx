import { useState, useEffect, useRef } from 'react';
import type { Tag } from '../../shared/types';
import { X, Plus, Hash } from 'lucide-react';

interface TagModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (tags: string[]) => void;
  availableTags: Tag[];
  selectedTags?: string[];
}

export function TagModal({ isOpen, onClose, onConfirm, availableTags, selectedTags = [] }: TagModalProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set(selectedTags));
  const [newTagName, setNewTagName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSelected(new Set(selectedTags));
  }, [selectedTags]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Enter' && !e.isComposing) {
        e.preventDefault();
        handleConfirm();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selected, newTagName, onClose]);

  if (!isOpen) return null;

  const toggleTag = (tagName: string) => {
    const newSelected = new Set(selected);
    if (newSelected.has(tagName)) {
      newSelected.delete(tagName);
    } else {
      newSelected.add(tagName);
    }
    setSelected(newSelected);
  };

  const handleConfirm = () => {
    const finalTags = new Set(selected);
    if (newTagName.trim()) {
      finalTags.add(newTagName.trim());
    }
    onConfirm(Array.from(finalTags));
    setNewTagName('');
    onClose();
  };

  const handleCancel = () => {
    setNewTagName('');
    onClose();
  };

  const filteredTags = availableTags.filter(tag => 
    tag.name.toLowerCase().includes(newTagName.toLowerCase()) && 
    !selected.has(tag.name) // Only show unselected tags in the list
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in duration-200">
      <div className="bg-[var(--color-card)] rounded-lg shadow-xl w-full max-w-sm mx-4 border border-[var(--color-border)]">
        <div className="p-4 border-b border-[var(--color-border)] flex items-center justify-between">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <Tag className="w-4 h-4" />
            Manage Tags
          </h3>
          <button onClick={onClose} className="text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]">
            <X className="w-4 h-4" />
          </button>
        </div>
        
        <div className="p-4 space-y-4">
          <div className="relative">
            <Hash className="absolute left-3 top-2.5 w-4 h-4 text-[var(--color-muted-foreground)]" />
            <input
              ref={inputRef}
              type="text"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              placeholder="Search or create tag..."
              className="w-full pl-9 pr-3 py-2 bg-[var(--color-background)] rounded-md border border-[var(--color-input)] text-sm outline-none focus:ring-2 focus:ring-[var(--color-ring)]"
            />
          </div>
          
          <div className="flex flex-wrap gap-2 min-h-[2rem]">
            {Array.from(selected).map(tagName => (
              <span 
                key={tagName} 
                className="flex items-center gap-1 px-2 py-1 bg-[var(--color-primary)] text-[var(--color-primary-foreground)] rounded text-xs font-medium animate-in zoom-in duration-200"
              >
                {tagName}
                <button 
                  onClick={() => toggleTag(tagName)}
                  className="hover:text-red-300"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>

          <div className="border-t border-[var(--color-border)] pt-4">
            <div className="text-xs text-[var(--color-muted-foreground)] mb-2 uppercase tracking-wider font-bold">Suggested</div>
            <div className="max-h-48 overflow-y-auto flex flex-wrap gap-2">
              {filteredTags.length > 0 ? (
                filteredTags.map(tag => (
                  <button
                    key={tag.id}
                    onClick={() => toggleTag(tag.name)}
                    className="px-2.5 py-1 rounded text-xs border border-[var(--color-border)] hover:bg-[var(--color-secondary)] hover:border-[var(--color-primary)] transition-all text-[var(--color-foreground)]"
                  >
                    {tag.name}
                  </button>
                ))
              ) : newTagName && !selected.has(newTagName) ? (
                <button
                  onClick={handleConfirm}
                  className="flex items-center gap-1 px-2.5 py-1 rounded text-xs bg-[var(--color-secondary)] text-[var(--color-foreground)]"
                >
                  <Plus className="w-3 h-3" />
                  Create "{newTagName}"
                </button>
              ) : (
                <div className="text-xs text-[var(--color-muted-foreground)] italic">
                  No matching tags found
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="p-4 border-t border-[var(--color-border)] flex justify-end gap-2 bg-[var(--color-muted)]/30 rounded-b-lg">
          <button
            onClick={handleCancel}
            className="px-3 py-1.5 text-xs font-medium text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="px-3 py-1.5 text-xs font-medium bg-[var(--color-primary)] text-[var(--color-primary-foreground)] rounded hover:opacity-90 transition-opacity"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

function Tag({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l5 5a2 2 0 0 0 2.828 0l7.172-7.172a2 2 0 0 0 0-2.828l-5-5z" />
      <path d="M7 7h.01" />
    </svg>
  )
}
