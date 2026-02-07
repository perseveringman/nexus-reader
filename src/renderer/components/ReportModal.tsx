import { useState } from 'react';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ReportPeriod = 'daily' | 'weekly' | 'monthly';

export function ReportModal({ isOpen, onClose }: ReportModalProps) {
  const [period, setPeriod] = useState<ReportPeriod>('weekly');
  const [report, setReport] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleGenerate = async () => {
    setIsLoading(true);
    setError('');
    setReport('');

    try {
      const result = await window.api.generateReport(period) as { report: string };
      setReport(result.report);
    } catch (e) {
      setError('生成报告失败，请确保已配置 OpenRouter API Key');
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const periodLabels: Record<ReportPeriod, string> = {
    daily: '今日',
    weekly: '本周',
    monthly: '本月',
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[var(--color-card)] rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="p-6 border-b border-[var(--color-border)]">
          <h2 className="text-lg font-semibold">AI 内容摄入报告</h2>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          <div className="flex items-center gap-4 mb-6">
            <span className="text-sm font-medium">报告周期:</span>
            <div className="flex gap-2">
              {(['daily', 'weekly', 'monthly'] as ReportPeriod[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                    period === p
                      ? 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)]'
                      : 'bg-[var(--color-muted)] hover:bg-[var(--color-accent)]'
                  }`}
                >
                  {periodLabels[p]}
                </button>
              ))}
            </div>
            <button
              onClick={handleGenerate}
              disabled={isLoading}
              className="ml-auto px-4 py-1.5 text-sm bg-[var(--color-primary)] text-[var(--color-primary-foreground)] rounded-md hover:opacity-90 disabled:opacity-50"
            >
              {isLoading ? '生成中...' : '生成报告'}
            </button>
          </div>

          {error && (
            <div className="p-4 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-md mb-4 text-sm">
              {error}
            </div>
          )}

          {report ? (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <div className="whitespace-pre-wrap text-sm leading-relaxed">
                {report}
              </div>
            </div>
          ) : !isLoading && !error ? (
            <div className="text-center text-[var(--color-muted-foreground)] py-12">
              <p className="mb-2">点击"生成报告"按钮</p>
              <p className="text-sm">AI 将分析您的内容摄入情况并生成个性化报告</p>
            </div>
          ) : null}

          {isLoading && (
            <div className="text-center text-[var(--color-muted-foreground)] py-12">
              <p>正在分析您的内容数据...</p>
              <p className="text-sm mt-2">这可能需要几秒钟</p>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-[var(--color-border)] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-md hover:bg-[var(--color-muted)]"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
