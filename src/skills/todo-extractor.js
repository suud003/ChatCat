/**
 * Todo Extractor Skill
 *
 * Runs in main process. Analyzes converted text to find
 * potential todo items. Deduplicates with existing todos.
 */

class TodoExtractor {
  /**
   * @param {import('electron-store')} store
   * @param {import('../shared/ai-client-main').AIClientMain} aiClient
   */
  constructor(store, aiClient) {
    this._store = store;
    this._aiClient = aiClient;
  }

  async execute() {
    const today = new Date().toISOString().split('T')[0];
    const convertedText = this._store.get(`convertedText_${today}`) || '';

    if (!convertedText || convertedText.trim().length < 20) {
      return { success: false, reason: 'insufficient-data' };
    }

    // Get last extraction point to only analyze new text
    const lastOffset = this._store.get('todoExtractorLastOffset') || 0;
    const newText = convertedText.substring(lastOffset);

    if (newText.trim().length < 20) {
      return { success: false, reason: 'no-new-content' };
    }

    // Quick keyword pre-check before calling AI
    const todoKeywords = [
      '要做', '需要', '记得', '别忘', '提醒', '待办', 'todo', 'TODO',
      '明天', '下周', '截止', 'deadline', '计划', '安排'
    ];
    const hasKeywords = todoKeywords.some(kw => newText.toLowerCase().includes(kw.toLowerCase()));
    
    // V2 Pillar C: 同时从分段数据中用正则提取候选
    const candidates = [];
    if (this._store.get('contentConsentGranted', false)) {
      const segments = this._store.get(`segments_${today}`) || [];
      for (const segment of segments) {
        for (const line of (segment.lines || [])) {
          if (this._isTodoCandidate(line)) {
            candidates.push({
              text: line,
              time: segment.startTime,
              type: segment.type,
              source: 'content-segment'
            });
          }
        }
      }
    }

    if (!hasKeywords && candidates.length === 0) {
      // Update offset even if no keywords found
      this._store.set('todoExtractorLastOffset', convertedText.length);
      return { success: false, reason: 'no-keywords' };
    }

    const existingTodos = this._store.get('todos') || [];
    const existingTexts = existingTodos.map(t => t.text.toLowerCase());

    const prompt = `你是一个待办事项识别助手。分析以下文本，提取其中隐含的待办事项。

规则：
1. 只提取明确的行动项，不要猜测
2. 每个待办用一行表示
3. 如果有时间信息，标注在括号中
4. 输出 JSON 数组格式: [{"text": "待办内容", "priority": "high/medium/low", "deadline": "时间或null"}]
5. 如果没有找到待办，返回空数组 []

现有待办（避免重复）：
${existingTodos.slice(0, 10).map(t => `- ${t.text}`).join('\n')}

待分析候选（来自正则匹配）：
${candidates.map(c => `- [${c.time}] ${c.text}`).join('\n')}

待分析文本：
${newText.substring(0, 2000)}

请输出 JSON 数组：`;

    try {
      const apiConfig = this._getAIConfig();
      if (!apiConfig.apiKey) {
        return { success: false, reason: 'no-api-key' };
      }

      const response = await this._callAI(apiConfig, prompt);

      // Parse AI response
      let extracted = [];
      try {
        // Try to find JSON array in response
        const match = response.match(/\[[\s\S]*\]/);
        if (match) {
          extracted = JSON.parse(match[0]);
        }
      } catch (e) {
        console.warn('[TodoExtractor] Failed to parse AI response:', e);
        return { success: false, reason: 'parse-error' };
      }

      // Deduplicate
      const newTodos = extracted.filter(item => {
        const normalized = item.text.toLowerCase().trim();
        return !existingTexts.some(existing =>
          existing.includes(normalized) || normalized.includes(existing)
        );
      });

      // Update extraction offset
      this._store.set('todoExtractorLastOffset', convertedText.length);

      if (newTodos.length === 0) {
        return { success: true, todos: [], reason: 'all-duplicates' };
      }

      return {
        success: true,
        todos: newTodos,
        notification: {
          signal: 'todo-detected',
          data: { todoText: newTodos[0].text, count: newTodos.length, todos: newTodos }
        }
      };
    } catch (err) {
      console.warn('[TodoExtractor] AI call failed:', err.message);
      return { success: false, reason: 'ai-error', error: err.message };
    }
  }

  _isTodoCandidate(line) {
    const patterns = [
      /\bTODO\b/i,
      /\bFIXME\b/i,
      /\bHACK\b/i,
      /\bXXX\b/i,
      /待办|明天要|记得|别忘了|需要|应该/,
      /\/\/\s*(todo|fixme)/i,
      /#\s*(todo|fixme)/i,
    ];
    return patterns.some(p => p.test(line));
  }

}

module.exports = { TodoExtractor };
