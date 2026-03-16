/**
 * Daily Report Skill
 *
 * Runs in main process. Reads today's converted text and
 * generates a Markdown daily report via AI.
 * Stores as `dailyReport_{date}` in electron-store.
 */

class DailyReport {
  constructor(store) {
    this._store = store;
  }

  async execute() {
    const today = new Date().toISOString().split('T')[0];
    const convertedText = this._store.get(`convertedText_${today}`) || '';

    if (!convertedText || convertedText.trim().length < 20) {
      return { success: false, reason: 'insufficient-data' };
    }

    // Gather additional context
    const todos = this._store.get('todos') || [];
    const pomodoroStats = this._store.get('pomodoroStats') || { count: 0 };
    const todayTodos = todos.filter(t => {
      if (!t.createdAt) return false;
      return new Date(t.createdAt).toISOString().split('T')[0] === today;
    });

    const completedTodos = todayTodos.filter(t => t.completed);

    const prompt = `你是一个智能日报生成助手。请根据以下用户今天的打字记录和工作数据，生成一份简洁的 Markdown 格式日报。

要求：
1. 自动分类工作内容（会议、编码、写作、沟通等）
2. 提炼关键事项和成果
3. 简短总结（不超过 300 字）
4. 使用中文

今日打字内容：
${convertedText.substring(0, 3000)}

今日待办完成情况：
- 总计 ${todayTodos.length} 项，完成 ${completedTodos.length} 项
${todayTodos.map(t => `- [${t.completed ? 'x' : ' '}] ${t.text}`).join('\n')}

番茄钟完成数：${pomodoroStats.count || 0}

请生成日报：`;

    try {
      const apiConfig = this._getAIConfig();
      if (!apiConfig.apiKey) {
        return { success: false, reason: 'no-api-key' };
      }

      const report = await this._callAI(apiConfig, prompt);

      // Store the report
      this._store.set(`dailyReport_${today}`, {
        content: report,
        generatedAt: Date.now(),
        date: today
      });

      return {
        success: true,
        report,
        notification: {
          signal: 'time-trigger',
          data: { hour: new Date().getHours(), type: 'daily-report-ready' }
        }
      };
    } catch (err) {
      console.warn('[DailyReport] AI call failed:', err.message);
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
        max_tokens: 2000,
        temperature: 0.5
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

module.exports = { DailyReport };
