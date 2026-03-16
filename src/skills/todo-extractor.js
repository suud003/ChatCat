/**
 * Todo Extractor Skill
 *
 * Runs in main process. Analyzes converted text to find
 * potential todo items. Deduplicates with existing todos.
 */

class TodoExtractor {
  constructor(store) {
    this._store = store;
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
    if (!hasKeywords) {
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

  _getAIConfig() {
    return {
      apiBaseUrl: this._store.get('apiBaseUrl') || 'https://api.openai.com/v1',
      apiKey: this._store.get('apiKey') || '',
      modelName: this._store.get('modelName') || 'gpt-3.5-turbo'
    };
  }

  async _callAI(config, prompt) {
    const { net } = require('electron');
    const url = `${config.apiBaseUrl}/chat/completions`;

    return new Promise((resolve, reject) => {
      const postData = JSON.stringify({
        model: config.modelName,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1000,
        temperature: 0.3
      });

      const request = net.request({
        method: 'POST',
        url,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`
        }
      });

      let responseData = '';

      request.on('response', (response) => {
        response.on('data', (chunk) => { responseData += chunk.toString(); });
        response.on('end', () => {
          try {
            const json = JSON.parse(responseData);
            if (json.choices && json.choices[0]) {
              resolve(json.choices[0].message.content);
            } else {
              reject(new Error('Invalid AI response'));
            }
          } catch (e) {
            reject(new Error(`Parse error: ${e.message}`));
          }
        });
      });

      request.on('error', reject);
      request.write(postData);
      request.end();
    });
  }
}

module.exports = { TodoExtractor };
