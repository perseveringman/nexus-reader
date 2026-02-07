import { useState, useEffect, useCallback } from 'react';
import type { Content, Highlight, CreateHighlightInput, Tag as TagType } from '../../shared/types';
import { YouTubeReader } from './YouTubeReader';
import { HighlightableContent } from './HighlightableContent';
import { NoteModal } from './NoteModal';
import { TagModal } from './TagModal';
import { 
  ArrowLeft, 
  ExternalLink, 
  Highlighter, 
  Bot, 
  Trash2, 
  Edit2, 
  Tag, 
  MessageSquare, 
  Sparkles,
  ChevronLeft
} from 'lucide-react';

interface ContentReaderProps {
  content: Content;
  onClose: () => void;
  showRightSidebar?: boolean;
}

function extractYouTubeVideoId(url: string): string | null {
  const patterns = [
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/,
    /youtu\.be\/([a-zA-Z0-9_-]+)/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export function ContentReader({ content, onClose, showRightSidebar = true }: ContentReaderProps) {
  const [summary, setSummary] = useState(content.summary || '');
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [isLoadingAnswer, setIsLoadingAnswer] = useState(false);
  
  // Highlight system state
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [focusedParagraph, setFocusedParagraph] = useState(0);
  const [activeTab, setActiveTab] = useState<'ai' | 'highlights'>('highlights');
  
  // Modal state
  const [noteModal, setNoteModal] = useState<{ isOpen: boolean; highlight?: Highlight; text?: string; paragraphIndex?: number }>({ isOpen: false });
  const [tagModal, setTagModal] = useState<{ isOpen: boolean; highlightId?: string; contentId?: string }>({ isOpen: false });
  const [allTags, setAllTags] = useState<TagType[]>([]);
  
  const youtubeVideoId = content.type === 'video' && content.url ? extractYouTubeVideoId(content.url) : null;

  // Load highlights
  useEffect(() => {
    const loadHighlights = async () => {
      try {
        const data = await window.api.getHighlights(content.id);
        setHighlights(data);
      } catch (error) {
        console.error('Failed to load highlights:', error);
      }
    };
    loadHighlights();
  }, [content.id]);

  // Load all tags
  useEffect(() => {
    const loadTags = async () => {
      try {
        const tags = await window.api.getAllTags();
        setAllTags(tags);
      } catch (error) {
        console.error('Failed to load tags:', error);
      }
    };
    loadTags();
  }, []);

  const handleCreateHighlight = useCallback(async (input: CreateHighlightInput) => {
    try {
      const highlight = await window.api.createHighlight(input);
      // Dedupe: only add if not already in list
      setHighlights(prev => {
        const exists = prev.some(h => h.id === highlight.id);
        if (exists) return prev;
        return [...prev, highlight];
      });
    } catch (error) {
      console.error('Failed to create highlight:', error);
    }
  }, []);

  const handleUpdateHighlight = useCallback(async (id: string, note: string) => {
    try {
      await window.api.updateHighlight(id, { note });
      setHighlights(prev => prev.map(h => h.id === id ? { ...h, note } : h));
    } catch (error) {
      console.error('Failed to update highlight:', error);
    }
  }, []);

  const handleDeleteHighlight = useCallback(async (id: string) => {
    try {
      await window.api.deleteHighlight(id);
      setHighlights(prev => prev.filter(h => h.id !== id));
    } catch (error) {
      console.error('Failed to delete highlight:', error);
    }
  }, []);

  const handleAddTagToHighlight = useCallback(async (highlightId: string, tags: string[]) => {
    try {
      for (const tag of tags) {
        await window.api.addHighlightTag(highlightId, tag);
      }
      setHighlights(prev => prev.map(h => 
        h.id === highlightId 
          ? { ...h, tags: [...new Set([...h.tags, ...tags])] }
          : h
      ));
      // Refresh all tags
      const newTags = await window.api.getAllTags();
      setAllTags(newTags);
    } catch (error) {
      console.error('Failed to add tags:', error);
    }
  }, []);

  const handleOpenNoteModal = useCallback((highlight?: Highlight, text?: string, paragraphIndex?: number) => {
    setNoteModal({ isOpen: true, highlight, text, paragraphIndex });
  }, []);

  const handleSaveNote = useCallback(async (note: string) => {
    if (noteModal.highlight) {
      await handleUpdateHighlight(noteModal.highlight.id, note);
    } else if (noteModal.text && noteModal.paragraphIndex !== undefined) {
      await handleCreateHighlight({
        contentId: content.id,
        text: noteModal.text,
        note,
        startOffset: 0,
        endOffset: noteModal.text.length,
        paragraphIndex: noteModal.paragraphIndex,
      });
    }
    setNoteModal({ isOpen: false });
  }, [noteModal, content.id, handleCreateHighlight, handleUpdateHighlight]);

  const handleOpenTagModal = useCallback((highlightId: string) => {
    setTagModal({ isOpen: true, highlightId });
  }, []);

  const handleSaveTags = useCallback(async (tags: string[]) => {
    if (tagModal.highlightId) {
      await handleAddTagToHighlight(tagModal.highlightId, tags);
    }
    setTagModal({ isOpen: false });
  }, [tagModal, handleAddTagToHighlight]);

  // Use enhanced YouTube reader for videos
  if (youtubeVideoId) {
    return <YouTubeReader videoId={youtubeVideoId} title={content.title} onClose={onClose} />;
  }

  const handleSummarize = async () => {
    setIsLoadingSummary(true);
    try {
      const result = await window.api.summarize(content.id);
      setSummary(result.summary);
    } catch (error) {
      console.error('Failed to summarize:', error);
    } finally {
      setIsLoadingSummary(false);
    }
  };

  const handleAsk = async () => {
    if (!question.trim()) return;
    setIsLoadingAnswer(true);
    try {
      const result = await window.api.askQuestion(content.id, question);
      setAnswer(result.answer);
    } catch (error) {
      console.error('Failed to ask:', error);
    } finally {
      setIsLoadingAnswer(false);
    }
  };

  return (
    <div className="flex-1 flex bg-background h-full overflow-hidden">
      <article className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-8 py-12">
          <div className="flex items-center justify-between mb-8 sticky top-0 bg-background/95 backdrop-blur z-10 py-4 border-b border-border">
            <button
              onClick={onClose}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Library</span>
            </button>
            {content.url && (
              <a
                href={content.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                <span>Original Source</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>

          <header className="mb-10">
            <h1 className="text-3xl font-serif font-bold mb-4 text-foreground leading-tight tracking-tight">{content.title}</h1>
            
            <div className="flex items-center flex-wrap gap-4 text-sm text-muted-foreground">
              {content.author && <span className="font-medium text-foreground">{content.author}</span>}
              <span>{new Date(content.publishedAt).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
              {highlights.length > 0 && (
                <span className="flex items-center gap-1 text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 px-2 py-0.5 rounded-full text-xs font-medium">
                  <Highlighter className="w-3 h-3" />
                  {highlights.length} highlights
                </span>
              )}
            </div>
          </header>

          {content.thumbnail && (
            <img
              src={content.thumbnail}
              alt={content.title}
              className="w-full rounded-xl mb-10 shadow-sm border border-border"
            />
          )}

          <div className="font-serif text-lg leading-relaxed text-foreground/90">
             <HighlightableContent
              contentId={content.id}
              htmlContent={content.content || ''}
              highlights={highlights}
              onHighlightCreate={handleCreateHighlight}
              onHighlightUpdate={handleUpdateHighlight}
              onOpenNoteModal={handleOpenNoteModal}
              onOpenTagModal={handleOpenTagModal}
              focusedParagraph={focusedParagraph}
              onFocusChange={setFocusedParagraph}
            />
          </div>
        </div>
      </article>

      {showRightSidebar && (
        <aside className="w-80 border-l border-border bg-card flex flex-col">
          <div className="flex border-b border-border bg-muted/30">
            <button
              onClick={() => setActiveTab('highlights')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
                activeTab === 'highlights'
                  ? 'text-foreground bg-background border-b-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <Highlighter className="w-4 h-4" />
              Highlights
            </button>
            <button
              onClick={() => setActiveTab('ai')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
                activeTab === 'ai'
                  ? 'text-foreground bg-background border-b-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <Bot className="w-4 h-4" />
              AI Assistant
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 bg-background/50">
            {activeTab === 'highlights' ? (
              <div className="space-y-4">
                {highlights.length === 0 ? (
                  <div className="text-center text-muted-foreground py-12 px-4">
                    <div className="bg-muted w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                       <Highlighter className="w-6 h-6 opacity-50" />
                    </div>
                    <p className="font-medium mb-1">No highlights yet</p>
                    <p className="text-xs opacity-75 mb-4">Select text to highlight</p>
                    
                    <div className="text-xs text-left bg-muted/50 p-3 rounded-md space-y-1 inline-block">
                      <p>Shortcuts:</p>
                      <div className="flex items-center gap-2"><kbd className="px-1.5 py-0.5 bg-background border rounded text-[10px]">H</kbd> Highlight</div>
                      <div className="flex items-center gap-2"><kbd className="px-1.5 py-0.5 bg-background border rounded text-[10px]">N</kbd> Highlight & Note</div>
                    </div>
                  </div>
                ) : (
                  highlights.map(highlight => (
                    <div
                      key={highlight.id}
                      className="group p-4 rounded-lg bg-yellow-50/80 dark:bg-yellow-900/10 border border-yellow-100 dark:border-yellow-900/30 hover:shadow-sm transition-all"
                    >
                      <p className="text-sm leading-relaxed mb-3 text-foreground/90 font-serif border-l-2 border-yellow-400 pl-3">
                        {highlight.text}
                      </p>
                      
                      {highlight.note && (
                        <div className="flex items-start gap-2 text-xs text-muted-foreground bg-background/50 p-2 rounded mb-3">
                          <MessageSquare className="w-3 h-3 mt-0.5 shrink-0" />
                          <span>{highlight.note}</span>
                        </div>
                      )}
                      
                      {highlight.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {highlight.tags.map(tag => (
                            <span
                              key={tag}
                              className="text-[10px] px-1.5 py-0.5 bg-primary/5 text-primary rounded-full font-medium"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                      
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleOpenNoteModal(highlight)}
                          className="p-1.5 hover:bg-background rounded text-muted-foreground hover:text-foreground"
                          title="Edit Note"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenTagModal(highlight.id)}
                          className="p-1.5 hover:bg-background rounded text-muted-foreground hover:text-foreground"
                          title="Add Tags"
                        >
                          <Tag className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteHighlight(highlight.id)}
                          className="p-1.5 hover:bg-red-50 hover:text-red-600 rounded text-muted-foreground transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-purple-500" />
                      Summary
                    </span>
                    <button
                      onClick={handleSummarize}
                      disabled={isLoadingSummary}
                      className="text-xs px-3 py-1.5 bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-50 transition-all font-medium"
                    >
                      {isLoadingSummary ? 'Generating...' : 'Regenerate'}
                    </button>
                  </div>
                  {summary ? (
                    <div className="text-sm bg-muted/30 p-4 rounded-lg leading-relaxed border border-border">
                      {summary}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground text-sm border-2 border-dashed border-muted rounded-lg">
                      No summary generated yet
                    </div>
                  )}
                </div>

                <div className="border-t border-border pt-6">
                  <span className="text-sm font-medium block mb-3">Ask AI</span>
                  <div className="relative">
                    <textarea
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      placeholder="Ask a question about this content..."
                      className="w-full p-3 text-sm border border-input rounded-lg bg-background focus:ring-2 focus:ring-ring resize-none min-h-[80px]"
                    />
                    <button
                      onClick={handleAsk}
                      disabled={isLoadingAnswer || !question.trim()}
                      className="absolute bottom-2 right-2 p-1.5 bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-50 transition-all"
                      title="Send"
                    >
                      <ArrowLeft className="w-4 h-4 rotate-180" />
                    </button>
                  </div>
                  
                  {answer && (
                    <div className="mt-4 text-sm bg-muted/30 p-4 rounded-lg border border-border">
                      <div className="flex items-center gap-2 mb-2 text-purple-600 font-medium text-xs uppercase tracking-wider">
                        <Bot className="w-3.5 h-3.5" />
                        Answer
                      </div>
                      <div className="leading-relaxed">
                        {answer}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </aside>
      )}

      <NoteModal
        isOpen={noteModal.isOpen}
        onClose={() => setNoteModal({ isOpen: false })}
        onSave={handleSaveNote}
        highlightText={noteModal.highlight?.text || noteModal.text || ''}
        initialNote={noteModal.highlight?.note || ''}
      />

      <TagModal
        isOpen={tagModal.isOpen}
        onClose={() => setTagModal({ isOpen: false })}
        onConfirm={handleSaveTags}
        availableTags={allTags}
        selectedTagIds={tagModal.highlightId ? highlights.find(h => h.id === tagModal.highlightId)?.tags || [] : []}
      />
    </div>
  );
}
