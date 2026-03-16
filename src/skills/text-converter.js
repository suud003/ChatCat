/**
 * Text Converter Skill
 *
 * Runs in main process. Reads keyboard recorder data for the current day,
 * calls AI API to convert keystroke records into readable text.
 * Filters sensitive scenarios (password input detection).
 *
 * Stores output as `convertedText_{date}` in electron-store.
 */

class TextConverter {
  constructor(store, keyboardRecorder) {
    this._store = store;
    this._recorder = keyboardRecorder;
  }

  async execute(aiService) {
    const today = new Date().toISOString().split('T')[0];
    const storeKey = `convertedText_${today}`;

    // Get today's recorder content
    let rawContent = '';
    if (this._recorder) {
      rawContent = this._recorder.getTodayContent(200) || '';
    }

    if (!rawContent || rawContent.trim().length < 10) {
      return { success: false, reason: 'insufficient-data' };
    }

    // Filter potential sensitive input (password fields, etc.)
    const filtered = this._filterSensitive(rawContent);
    if (!filtered || filtered.trim().length < 10) {
      return { success: false, reason: 'filtered-sensitive' };
    }

    // Call AI to convert keystrokes to readable text
    const prompt = `你是一个打字记录分析器。以下是用户的键盘输入记录（包含按键码和时间戳），请将其还原为可读的文本段落。
注意：
1. 拼音输入法的连续字母应还原为中文
2. 忽略功能键（Ctrl、Alt等）
3. 识别并分段不同的输入上下文
4. 如果无法确定内容，标记为[不确定]
5. 输出纯文本，不需要格式化

键盘记录：
${filtered}`;

    try {
      const apiConfig = this._getAIConfig();
      if (!apiConfig.apiKey) {
        return { success: false, reason: 'no-api-key' };
      }

      const response = await this._callAI(apiConfig, prompt);

      // Append to existing converted text for today
      const existing = this._store.get(storeKey) || '';
      const updated = existing
        ? existing + '\n\n--- ' + new Date().toLocaleTimeString() + ' ---\n' + response
        : response;

      this._store.set(storeKey, updated);

      return { success: true, text: response };
    } catch (err) {
      console.warn('[TextConverter] AI call failed:', err.message);
      return { success: false, reason: 'ai-error', error: err.message };
    }
  }

  _filterSensitive(content) {
    // Remove lines that look like password input (all dots or asterisks)
    const lines = content.split('\n');
    const filtered = lines.filter(line => {
      const trimmed = line.trim();
      // Skip empty lines
      if (!trimmed) return true;
      // Skip lines that are all dots/asterisks (password fields)
      if (/^[.•*●]+$/.test(trimmed)) return false;
      // Skip lines containing common sensitive field indicators
      if (/password|passwd|密码|token|secret/i.test(trimmed)) return false;
      return true;
    });
    return filtered.join('\n');
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

module.exports = { TextConverter };
