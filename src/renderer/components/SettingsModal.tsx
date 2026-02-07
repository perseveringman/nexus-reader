import { useState, useEffect } from 'react';
import { useSettingsStore } from '../stores/settings-store';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { theme, aiModel, openRouterKey, youtubeApiKey, twitterBearerToken, ytdlpBrowser, updateSettings } = useSettingsStore();
  const [localKey, setLocalKey] = useState(openRouterKey);
  const [localYoutubeKey, setLocalYoutubeKey] = useState(youtubeApiKey);
  const [localTwitterToken, setLocalTwitterToken] = useState(twitterBearerToken);
  const [localModel, setLocalModel] = useState(aiModel);
  const [localTheme, setLocalTheme] = useState(theme);
  const [localBrowser, setLocalBrowser] = useState(ytdlpBrowser);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setLocalKey(openRouterKey);
    setLocalYoutubeKey(youtubeApiKey);
    setLocalTwitterToken(twitterBearerToken);
    setLocalModel(aiModel);
    setLocalTheme(theme);
    setLocalBrowser(ytdlpBrowser);
  }, [openRouterKey, youtubeApiKey, twitterBearerToken, aiModel, theme, ytdlpBrowser]);

  if (!isOpen) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateSettings({
        openRouterKey: localKey,
        youtubeApiKey: localYoutubeKey,
        twitterBearerToken: localTwitterToken,
        aiModel: localModel,
        theme: localTheme,
        ytdlpBrowser: localBrowser,
      });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[var(--color-card)] rounded-lg shadow-xl w-full max-w-lg p-6">
        <h2 className="text-lg font-semibold mb-6">设置</h2>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">主题</label>
            <select
              value={localTheme}
              onChange={(e) => setLocalTheme(e.target.value as 'light' | 'dark' | 'system')}
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-md bg-[var(--color-background)] text-sm"
            >
              <option value="system">跟随系统</option>
              <option value="light">浅色</option>
              <option value="dark">深色</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">OpenRouter API Key</label>
            <input
              type="password"
              value={localKey}
              onChange={(e) => setLocalKey(e.target.value)}
              placeholder="sk-or-..."
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-md bg-[var(--color-background)] text-sm"
            />
            <p className="text-xs text-[var(--color-muted-foreground)] mt-1">
              从 <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="text-[var(--color-primary)] hover:underline">openrouter.ai</a> 获取
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">AI 模型</label>
            <select
              value={localModel}
              onChange={(e) => setLocalModel(e.target.value)}
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-md bg-[var(--color-background)] text-sm"
            >
              <option value="openai/gpt-4o-mini">GPT-4o Mini (推荐)</option>
              <option value="openai/gpt-4o">GPT-4o</option>
              <option value="anthropic/claude-3.5-sonnet">Claude 3.5 Sonnet</option>
              <option value="anthropic/claude-3-haiku">Claude 3 Haiku</option>
              <option value="google/gemini-pro-1.5">Gemini Pro 1.5</option>
              <option value="meta-llama/llama-3.1-70b-instruct">Llama 3.1 70B</option>
            </select>
          </div>

          <div className="border-t border-[var(--color-border)] pt-6">
            <h3 className="text-sm font-medium mb-4">内容源 API (可选)</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">YouTube API Key</label>
                <input
                  type="password"
                  value={localYoutubeKey}
                  onChange={(e) => setLocalYoutubeKey(e.target.value)}
                  placeholder="AIza..."
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-md bg-[var(--color-background)] text-sm"
                />
                <p className="text-xs text-[var(--color-muted-foreground)] mt-1">
                  从 <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="text-[var(--color-primary)] hover:underline">Google Cloud Console</a> 获取
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Twitter Bearer Token</label>
                <input
                  type="password"
                  value={localTwitterToken}
                  onChange={(e) => setLocalTwitterToken(e.target.value)}
                  placeholder="AAAA..."
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-md bg-[var(--color-background)] text-sm"
                />
                <p className="text-xs text-[var(--color-muted-foreground)] mt-1">
                  从 <a href="https://developer.twitter.com/en/portal/dashboard" target="_blank" rel="noopener noreferrer" className="text-[var(--color-primary)] hover:underline">Twitter Developer Portal</a> 获取
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">yt-dlp Cookies 浏览器</label>
                <select
                  value={localBrowser}
                  onChange={(e) => setLocalBrowser(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-md bg-[var(--color-background)] text-sm"
                >
                  <option value="chrome">Chrome</option>
                  <option value="firefox">Firefox</option>
                  <option value="safari">Safari</option>
                  <option value="edge">Edge</option>
                  <option value="brave">Brave</option>
                  <option value="opera">Opera</option>
                </select>
                <p className="text-xs text-[var(--color-muted-foreground)] mt-1">
                  选择已登录YouTube的浏览器以获取字幕
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-[var(--color-border)] pt-6">
            <h3 className="text-sm font-medium mb-4">数据管理</h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={async () => {
                  const result = await window.api.exportOpml();
                  if (result.success) alert(`已导出到: ${result.path}`);
                }}
                className="px-3 py-2 text-sm border border-[var(--color-border)] rounded-md hover:bg-[var(--color-muted)]"
              >
                📤 导出订阅 (OPML)
              </button>
              <button
                onClick={async () => {
                  const result = await window.api.exportJson();
                  if (result.success) alert(`已导出到: ${result.path}`);
                }}
                className="px-3 py-2 text-sm border border-[var(--color-border)] rounded-md hover:bg-[var(--color-muted)]"
              >
                💾 备份全部数据
              </button>
              <button
                onClick={async () => {
                  const result = await window.api.importOpml();
                  if (result.success && result.feeds) {
                    alert(`发现 ${result.feeds.length} 个订阅源，请手动添加`);
                  }
                }}
                className="px-3 py-2 text-sm border border-[var(--color-border)] rounded-md hover:bg-[var(--color-muted)]"
              >
                📥 导入订阅 (OPML)
              </button>
              <button
                onClick={async () => {
                  const result = await window.api.importJson();
                  if (result.success) {
                    alert('导入成功，请重启应用');
                  } else if (result.error) {
                    alert(`导入失败: ${result.error}`);
                  }
                }}
                className="px-3 py-2 text-sm border border-[var(--color-border)] rounded-md hover:bg-[var(--color-muted)]"
              >
                📂 恢复备份
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-8">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-md hover:bg-[var(--color-muted)]"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 text-sm bg-[var(--color-primary)] text-[var(--color-primary-foreground)] rounded-md hover:opacity-90 disabled:opacity-50"
          >
            {isSaving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}
