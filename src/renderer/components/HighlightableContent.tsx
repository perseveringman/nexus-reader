import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { Highlight, CreateHighlightInput } from '../../shared/types';
import { NoteModal } from './NoteModal';

interface HighlightableContentProps {
  contentId: string;
  htmlContent: string;
  highlights: Highlight[];
  onHighlightCreate: (highlight: CreateHighlightInput) => Promise<void>;
  onHighlightUpdate: (id: string, note: string) => Promise<void>;
  onOpenNoteModal?: (highlight?: Highlight, text?: string, paragraphIndex?: number) => void;
  onOpenTagModal?: (highlightId: string) => void;
  focusedParagraph: number;
  onFocusChange: (index: number) => void;
}

interface ParsedParagraph {
  html: string;
  text: string;
}

function parseParagraphs(html: string): ParsedParagraph[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const paragraphs: ParsedParagraph[] = [];
  
  const blockElements = doc.body.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, blockquote, pre');
  
  if (blockElements.length === 0) {
    const lines = html.split(/\n+/).filter(line => line.trim());
    lines.forEach(line => {
      paragraphs.push({ html: line, text: line.replace(/<[^>]*>/g, '') });
    });
  } else {
    blockElements.forEach(el => {
      paragraphs.push({ html: el.outerHTML, text: el.textContent || '' });
    });
  }
  
  return paragraphs.filter(p => p.text.trim().length > 0);
}

export function HighlightableContent({
  contentId,
  htmlContent,
  highlights,
  onHighlightCreate,
  onHighlightUpdate,
  onOpenNoteModal,
  onOpenTagModal,
  focusedParagraph,
  onFocusChange,
}: HighlightableContentProps) {
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [pendingHighlight, setPendingHighlight] = useState<CreateHighlightInput | null>(null);
  const [editingHighlight, setEditingHighlight] = useState<Highlight | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const paragraphs = useMemo(() => parseParagraphs(htmlContent), [htmlContent]);

  const highlightsByParagraph = useMemo(() => {
    const map = new Map<number, Highlight[]>();
    highlights.forEach(h => {
      const existing = map.get(h.paragraphIndex) || [];
      existing.push(h);
      map.set(h.paragraphIndex, existing);
    });
    return map;
  }, [highlights]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return;
    }

    if (noteModalOpen) return;

    switch (e.key) {
      case 'ArrowUp':
      case 'k':
        e.preventDefault();
        onFocusChange(Math.max(0, focusedParagraph - 1));
        break;
      case 'ArrowDown':
      case 'j':
        e.preventDefault();
        onFocusChange(Math.min(paragraphs.length - 1, focusedParagraph + 1));
        break;
      case 'h':
      case 'H':
        e.preventDefault();
        handleHighlightParagraph(false);
        break;
      case 'n':
      case 'N':
        e.preventDefault();
        handleHighlightParagraph(true);
        break;
      case 't':
      case 'T':
        e.preventDefault();
        handleAddTag();
        break;
    }
  }, [focusedParagraph, paragraphs.length, onFocusChange, noteModalOpen]);

  const handleAddTag = useCallback(() => {
    const paragraphHighlights = highlightsByParagraph.get(focusedParagraph);
    if (paragraphHighlights && paragraphHighlights.length > 0 && onOpenTagModal) {
      onOpenTagModal(paragraphHighlights[0].id);
    }
  }, [focusedParagraph, highlightsByParagraph, onOpenTagModal]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    const focusedEl = containerRef.current?.querySelector(`[data-paragraph-index="${focusedParagraph}"]`);
    if (focusedEl) {
      focusedEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [focusedParagraph]);

  const handleHighlightParagraph = async (withNote: boolean) => {
    if (focusedParagraph < 0 || focusedParagraph >= paragraphs.length) return;

    const paragraph = paragraphs[focusedParagraph];
    const text = paragraph.text;

    const highlightInput: CreateHighlightInput = {
      contentId,
      text,
      startOffset: 0,
      endOffset: text.length,
      paragraphIndex: focusedParagraph,
    };

    if (withNote) {
      setPendingHighlight(highlightInput);
      setNoteModalOpen(true);
    } else {
      await onHighlightCreate(highlightInput);
    }
  };

  const handleTextSelection = useCallback(async () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;

    const range = selection.getRangeAt(0);
    const selectedText = selection.toString().trim();
    if (!selectedText) return;

    const paragraphEl = range.startContainer.parentElement?.closest('[data-paragraph-index]');
    if (!paragraphEl) return;

    const paragraphIndex = parseInt(paragraphEl.getAttribute('data-paragraph-index') || '-1', 10);
    if (paragraphIndex < 0) return;

    const highlightInput: CreateHighlightInput = {
      contentId,
      text: selectedText,
      startOffset: range.startOffset,
      endOffset: range.endOffset,
      paragraphIndex,
    };

    await onHighlightCreate(highlightInput);
    selection.removeAllRanges();
  }, [contentId, onHighlightCreate]);

  const handleNoteModalSave = async (note: string) => {
    if (pendingHighlight) {
      await onHighlightCreate({ ...pendingHighlight, note });
      setPendingHighlight(null);
    } else if (editingHighlight) {
      await onHighlightUpdate(editingHighlight.id, note);
      setEditingHighlight(null);
    }
  };

  const handleNoteModalClose = () => {
    setNoteModalOpen(false);
    setPendingHighlight(null);
    setEditingHighlight(null);
  };

  const renderParagraph = (paragraph: ParsedParagraph, index: number) => {
    const isFocused = index === focusedParagraph;
    const paragraphHighlights = highlightsByParagraph.get(index) || [];
    const isHighlighted = paragraphHighlights.length > 0;

    return (
      <div
        key={index}
        data-paragraph-index={index}
        className={`relative px-4 py-2 rounded transition-colors cursor-pointer ${
          isFocused ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-[var(--color-background)]' : ''
        } ${isHighlighted ? 'bg-yellow-100 dark:bg-yellow-900/30' : 'hover:bg-[var(--color-secondary)]'}`}
        onClick={() => onFocusChange(index)}
        onDoubleClick={handleTextSelection}
      >
        {isFocused && (
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-l" />
        )}
        <div 
          className="prose prose-lg max-w-none dark:prose-invert font-serif leading-relaxed text-[var(--color-foreground)]"
          dangerouslySetInnerHTML={{ __html: paragraph.html }}
        />
        {paragraphHighlights.length > 0 && paragraphHighlights[0].note && (
          <div 
            className="mt-2 text-xs text-[var(--color-muted-foreground)] italic cursor-pointer hover:text-[var(--color-foreground)]"
            onClick={(e) => {
              e.stopPropagation();
              setEditingHighlight(paragraphHighlights[0]);
              setNoteModalOpen(true);
            }}
          >
            📝 {paragraphHighlights[0].note}
          </div>
        )}
      </div>
    );
  };

  return (
    <div ref={containerRef} className="space-y-1" onMouseUp={handleTextSelection}>
      {paragraphs.map((paragraph, index) => renderParagraph(paragraph, index))}
      
      <NoteModal
        isOpen={noteModalOpen}
        onClose={handleNoteModalClose}
        onSave={handleNoteModalSave}
        highlightText={pendingHighlight?.text || editingHighlight?.text || ''}
        initialNote={editingHighlight?.note}
      />
      
      <div className="fixed bottom-4 right-4 bg-[var(--color-card)] border border-[var(--color-border)] rounded-lg shadow-lg px-4 py-2 text-xs text-[var(--color-muted-foreground)]">
        <div className="flex gap-4">
          <span>↑↓ 导航</span>
          <span>H 高亮</span>
          <span>N 高亮+笔记</span>
          <span>T 添加标签</span>
        </div>
      </div>
    </div>
  );
}
