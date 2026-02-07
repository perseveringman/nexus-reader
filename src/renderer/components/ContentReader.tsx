import { useState } from 'react';
import type { Content } from '../../shared/types';
import { YouTubeReader } from './YouTubeReader';

interface ContentReaderProps {
  content: Content;
  onClose: () => void;
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

export function ContentReader({ content, onClose }: ContentReaderProps) {
  const [summary, setSummary] = useState(content.summary || '');
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [isLoadingAnswer, setIsLoadingAnswer] = useState(false);
  
  const youtubeVideoId = content.type === 'video' && content.url ? extractYouTubeVideoId(content.url) : null;

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
    <div className="flex-1 flex">
      <article className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto p-8">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={onClose}
              className="text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
            >
              ← 返回列表
            </button>
            {content.url && (
              <a
                href={content.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-[var(--color-primary)] hover:underline"
              >
                查看原文 →
              </a>
            )}
          </div>

          <h1 className="text-2xl font-bold mb-4">{content.title}</h1>
          
          <div className="flex items-center gap-4 text-sm text-[var(--color-muted-foreground)] mb-8">
            {content.author && <span>作者: {content.author}</span>}
            <span>{new Date(content.publishedAt).toLocaleDateString('zh-CN')}</span>
          </div>

          {content.thumbnail && (
            <img
              src={content.thumbnail}
              alt={content.title}
              className="w-full rounded-lg mb-8"
            />
          )}

          <div
            className="prose prose-slate dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: content.content || '' }}
          />
        </div>
      </article>

      <aside className="w-80 border-l border-[var(--color-border)] bg-[var(--color-card)] p-4 overflow-y-auto">
        <h3 className="font-semibold mb-4">AI 助手</h3>
        
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">内容摘要</span>
              <button
                onClick={handleSummarize}
                disabled={isLoadingSummary}
                className="text-xs px-2 py-1 bg-[var(--color-primary)] text-[var(--color-primary-foreground)] rounded hover:opacity-90 disabled:opacity-50"
              >
                {isLoadingSummary ? '生成中...' : '生成摘要'}
              </button>
            </div>
            {summary && (
              <div className="text-sm bg-[var(--color-muted)] p-3 rounded-md">
                {summary}
              </div>
            )}
          </div>

          <div className="border-t border-[var(--color-border)] pt-4">
            <span className="text-sm font-medium block mb-2">向 AI 提问</span>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="输入你的问题..."
              className="w-full p-2 text-sm border border-[var(--color-border)] rounded-md bg-[var(--color-background)] resize-none"
              rows={3}
            />
            <button
              onClick={handleAsk}
              disabled={isLoadingAnswer || !question.trim()}
              className="mt-2 w-full text-sm py-2 bg-[var(--color-primary)] text-[var(--color-primary-foreground)] rounded hover:opacity-90 disabled:opacity-50"
            >
              {isLoadingAnswer ? '思考中...' : '提问'}
            </button>
            {answer && (
              <div className="mt-3 text-sm bg-[var(--color-muted)] p-3 rounded-md">
                {answer}
              </div>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
