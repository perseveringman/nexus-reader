import { getDb } from '../database/index.js';

interface OpenRouterResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export class AiService {
  private getApiKey(): string {
    const db = getDb();
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('openRouterKey') as { value: string } | undefined;
    return row?.value || '';
  }

  private getModel(): string {
    const db = getDb();
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('aiModel') as { value: string } | undefined;
    return row?.value || 'openai/gpt-4o-mini';
  }

  private async callOpenRouter(messages: Array<{ role: string; content: string }>): Promise<string> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('OpenRouter API key not configured');
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://nexus-reader.app',
        'X-Title': 'Nexus Reader',
      },
      body: JSON.stringify({
        model: this.getModel(),
        messages,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.statusText}`);
    }

    const data = await response.json() as OpenRouterResponse;
    return data.choices[0]?.message?.content || '';
  }

  async summarize(title: string, content: string): Promise<string> {
    const truncatedContent = content.slice(0, 8000);
    
    const messages = [
      {
        role: 'system',
        content: '你是一个专业的内容摘要助手。请用中文为用户提供简洁、准确的内容摘要，突出核心观点和关键信息。',
      },
      {
        role: 'user',
        content: `请为以下文章生成摘要：\n\n标题：${title}\n\n内容：${truncatedContent}`,
      },
    ];

    return this.callOpenRouter(messages);
  }

  async askQuestion(title: string, content: string, question: string): Promise<string> {
    const truncatedContent = content.slice(0, 8000);
    
    const messages = [
      {
        role: 'system',
        content: '你是一个知识助手，帮助用户深入理解文章内容。请基于文章内容回答用户问题，如果问题超出文章范围，请明确说明。',
      },
      {
        role: 'user',
        content: `文章标题：${title}\n\n文章内容：${truncatedContent}\n\n用户问题：${question}`,
      },
    ];

    return this.callOpenRouter(messages);
  }

  async prioritize(
    contents: Array<{ id: string; title: string; summary: string; type: string }>
  ): Promise<Array<{ id: string; priority: number }>> {
    const contentList = contents.map((c, i) => `${i + 1}. [${c.type}] ${c.title}`).join('\n');
    
    const messages = [
      {
        role: 'system',
        content: `你是一个信息优先级评估助手。根据内容的重要性、时效性和知识价值，为每条内容评分(1-10分，10分最高)。
返回JSON格式: [{"index": 1, "priority": 8}, ...]`,
      },
      {
        role: 'user',
        content: `请为以下内容评估优先级：\n\n${contentList}`,
      },
    ];

    const response = await this.callOpenRouter(messages);
    
    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) return contents.map(c => ({ id: c.id, priority: 5 }));
      
      const priorities = JSON.parse(jsonMatch[0]) as Array<{ index: number; priority: number }>;
      return priorities.map(p => ({
        id: contents[p.index - 1]?.id || '',
        priority: p.priority,
      })).filter(p => p.id);
    } catch {
      return contents.map(c => ({ id: c.id, priority: 5 }));
    }
  }

  async generateReport(
    contents: Array<{ type: string; title: string; summary: string; isRead: number; publishedAt: number }>,
    period: 'daily' | 'weekly' | 'monthly'
  ): Promise<string> {
    const periodName = period === 'daily' ? '今日' : period === 'weekly' ? '本周' : '本月';
    const stats = {
      total: contents.length,
      read: contents.filter(c => c.isRead).length,
      articles: contents.filter(c => c.type === 'article').length,
      videos: contents.filter(c => c.type === 'video').length,
      social: contents.filter(c => c.type === 'social').length,
    };
    
    const titles = contents.slice(0, 30).map(c => `- [${c.type}] ${c.title}`).join('\n');
    
    const messages = [
      {
        role: 'system',
        content: `你是一个个人知识管理助手。请根据用户的内容摄入数据生成简洁的${periodName}报告，包括：
1. 内容摄入概览
2. 主题聚类分析
3. 阅读建议`,
      },
      {
        role: 'user',
        content: `${periodName}内容统计：
- 总计: ${stats.total}条
- 已读: ${stats.read}条
- 文章: ${stats.articles}条
- 视频: ${stats.videos}条
- 社交: ${stats.social}条

内容列表：
${titles}`,
      },
    ];

    return this.callOpenRouter(messages);
  }
}
