import { useState, useEffect, useRef } from 'react';

interface VideoInfo {
  id: string;
  title: string;
  description: string;
  duration: number;
  thumbnail: string;
  channel: string;
  uploadDate: string;
  viewCount: number;
  subtitles: Array<{ lang: string; name: string }>;
}

interface SubtitleEntry {
  start: number;
  end: number;
  text: string;
}

interface YouTubeReaderProps {
  videoId: string;
  title: string;
  onClose: () => void;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// Cache for subtitles by language
interface SubtitleCache {
  timestamps: SubtitleEntry[];
  text: string;
}

export function YouTubeReader({ videoId, title, onClose }: YouTubeReaderProps) {
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [selectedLang, setSelectedLang] = useState<string>('');
  const [isLoadingInfo, setIsLoadingInfo] = useState(true);
  const [isLoadingSubtitle, setIsLoadingSubtitle] = useState(false);
  const [error, setError] = useState<string>('');
  const [viewMode, setViewMode] = useState<'timestamps' | 'text'>('timestamps');
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const subtitleRefs = useRef<(HTMLDivElement | null)[]>([]);
  
  // Cache subtitles per language to avoid reloading on view mode switch
  const subtitleCache = useRef<Map<string, SubtitleCache>>(new Map());
  const [currentSubtitles, setCurrentSubtitles] = useState<SubtitleEntry[]>([]);
  const [currentText, setCurrentText] = useState<string>('');

  useEffect(() => {
    // Reset all state when video changes
    setVideoInfo(null);
    setSelectedLang('');
    setIsLoadingInfo(true);
    setIsLoadingSubtitle(false);
    setError('');
    setActiveIndex(-1);
    setCurrentSubtitles([]);
    setCurrentText('');
    subtitleCache.current.clear();
    
    loadVideoInfo();
  }, [videoId]);

  const loadVideoInfo = async () => {
    setIsLoadingInfo(true);
    setError('');
    try {
      const info = await window.api.getVideoInfo(videoId);
      setVideoInfo(info);
      
      // Auto-select first subtitle language
      if (info.subtitles.length > 0) {
        const defaultLang = info.subtitles.find(s => 
          s.lang.includes('zh') || s.lang.includes('en')
        ) || info.subtitles[0];
        setSelectedLang(defaultLang.lang);
      }
    } catch (e) {
      setError('无法获取视频信息，请确保已安装 yt-dlp');
      console.error(e);
    } finally {
      setIsLoadingInfo(false);
    }
  };

  const loadSubtitle = async (lang: string) => {
    if (!lang) return;
    
    // Check cache first
    const cached = subtitleCache.current.get(lang);
    if (cached) {
      setCurrentSubtitles(cached.timestamps);
      setCurrentText(cached.text);
      return;
    }
    
    setIsLoadingSubtitle(true);
    
    try {
      // Load both formats at once and cache them
      const [timestamps, text] = await Promise.all([
        window.api.getSubtitleWithTimestamps(videoId, lang),
        window.api.downloadSubtitle(videoId, lang),
      ]);
      
      // Cache the results
      subtitleCache.current.set(lang, { timestamps, text });
      
      setCurrentSubtitles(timestamps);
      setCurrentText(text);
    } catch (e) {
      console.error('Failed to load subtitle:', e);
      setCurrentSubtitles([]);
      setCurrentText('');
    } finally {
      setIsLoadingSubtitle(false);
    }
  };

  useEffect(() => {
    if (selectedLang) {
      loadSubtitle(selectedLang);
    }
  }, [selectedLang]);

  const handleTimestampClick = (seconds: number, index: number) => {
    setActiveIndex(index);
    // Post message to iframe to seek (this requires YouTube API integration)
    const iframe = document.querySelector('iframe') as HTMLIFrameElement;
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage(JSON.stringify({
        event: 'command',
        func: 'seekTo',
        args: [seconds, true]
      }), '*');
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)]">
        <button
          onClick={onClose}
          className="text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
        >
          ← 返回列表
        </button>
        <a
          href={`https://www.youtube.com/watch?v=${videoId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-[var(--color-primary)] hover:underline"
        >
          在 YouTube 观看 →
        </a>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Video Section */}
        <div className="flex-1 flex flex-col overflow-y-auto p-6">
          <h1 className="text-xl font-bold mb-4">{title}</h1>
          
          {/* Video Player */}
          <div className="relative w-full mb-6" style={{ paddingBottom: '56.25%' }}>
            <iframe
              id="youtube-player"
              className="absolute top-0 left-0 w-full h-full rounded-lg"
              src={`https://www.youtube-nocookie.com/embed/${videoId}?enablejsapi=1&origin=${window.location.origin}`}
              title={title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </div>

          {/* Video Info */}
          {isLoadingInfo ? (
            <div className="text-[var(--color-muted-foreground)]">加载视频信息...</div>
          ) : error ? (
            <div className="text-red-500 text-sm">{error}</div>
          ) : videoInfo && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 text-sm text-[var(--color-muted-foreground)]">
                <span>{videoInfo.channel}</span>
                <span>{formatDuration(videoInfo.duration)}</span>
                <span>{videoInfo.viewCount.toLocaleString()} 次观看</span>
              </div>
              
              {videoInfo.description && (
                <div className="text-sm whitespace-pre-wrap bg-[var(--color-muted)] p-4 rounded-lg max-h-40 overflow-y-auto">
                  {videoInfo.description}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Subtitle Panel */}
        <aside className="w-96 border-l border-[var(--color-border)] bg-[var(--color-card)] flex flex-col">
          <div className="p-4 border-b border-[var(--color-border)] space-y-3">
            <h3 className="font-semibold">字幕 / Transcript</h3>
            
            {videoInfo && videoInfo.subtitles.length > 0 && (
              <div className="flex gap-2">
                <select
                  value={selectedLang}
                  onChange={(e) => setSelectedLang(e.target.value)}
                  className="flex-1 px-2 py-1.5 text-sm border border-[var(--color-border)] rounded bg-[var(--color-background)]"
                >
                  {videoInfo.subtitles.map((sub) => (
                    <option key={sub.lang} value={sub.lang}>
                      {sub.name || sub.lang}
                    </option>
                  ))}
                </select>
                
                <div className="flex border border-[var(--color-border)] rounded overflow-hidden">
                  <button
                    onClick={() => setViewMode('timestamps')}
                    className={`px-2 py-1 text-xs ${viewMode === 'timestamps' ? 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)]' : 'hover:bg-[var(--color-muted)]'}`}
                  >
                    时间轴
                  </button>
                  <button
                    onClick={() => setViewMode('text')}
                    className={`px-2 py-1 text-xs ${viewMode === 'text' ? 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)]' : 'hover:bg-[var(--color-muted)]'}`}
                  >
                    纯文本
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {isLoadingSubtitle ? (
              <div className="text-[var(--color-muted-foreground)] text-sm">加载字幕中...</div>
            ) : videoInfo?.subtitles.length === 0 ? (
              <div className="text-[var(--color-muted-foreground)] text-sm">此视频没有可用字幕</div>
            ) : viewMode === 'timestamps' && currentSubtitles.length > 0 ? (
              <div className="space-y-1">
                {currentSubtitles.map((entry, index) => (
                  <div
                    key={index}
                    ref={(el) => { subtitleRefs.current[index] = el; }}
                    onClick={() => handleTimestampClick(entry.start, index)}
                    className={`flex gap-3 p-2 rounded cursor-pointer hover:bg-[var(--color-muted)] transition-colors ${
                      activeIndex === index ? 'bg-[var(--color-accent)]' : ''
                    }`}
                  >
                    <span className="text-xs text-[var(--color-primary)] font-mono whitespace-nowrap">
                      {formatTimestamp(entry.start)}
                    </span>
                    <span className="text-sm">{entry.text}</span>
                  </div>
                ))}
              </div>
            ) : viewMode === 'text' && currentText ? (
              <div className="text-sm whitespace-pre-wrap leading-relaxed">
                {currentText}
              </div>
            ) : (
              <div className="text-[var(--color-muted-foreground)] text-sm">
                选择语言加载字幕
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
