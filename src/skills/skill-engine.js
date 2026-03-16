/**
 * Skill Engine — Executes a single Skill via AI.
 *
 * Reads SKILL.md body, gathers context (typing records, todos, etc.), calls AI, returns result.
 * All skills use AI.
 *
 * Runs in main process.
 */

class SkillEngine {
  constructor(store, registry, keyboardRecorder) {
    this._store = store;
    this._registry = registry;
    this._recorder = keyboardRecorder;
  }

  /**
   * Execute a skill by ID.
   * @param {string} skillId - Skill name (e.g. 'daily-report')
   * @param {object} userContext - { userMessage, ... }
   * @returns {object} { success, output, outputType }
   */
  async execute(skillId, userContext = {}) {
    const meta = this._registry.get(skillId);
    if (!meta) {
      return { success: false, output: `未找到技能: ${skillId}`, outputType: 'text' };
    }

    try {
      const body = this._registry.readSkillBody(skillId);
      if (!body) {
        return { success: false, output: '技能模板为空', outputType: 'text' };
      }

      const contextData = this._gatherContext(meta.context, userContext);
      const prompt = `${body}\n\n---\n\n${contextData}`;

      console.log(`[SkillEngine] Skill ${skillId}: prompt length = ${prompt.length} chars`);

      const result = await this._callAI(prompt, meta.temperature);

      // Post-processing: text-converter writes result back to store
      if (skillId === 'text-converter' && result) {
        const today = new Date().toISOString().split('T')[0];
        const storeKey = `convertedText_${today}`;
        this._store.set(storeKey, result);
        console.log(`[SkillEngine] text-converter: saved ${result.length} chars to ${storeKey}`);
      }

      // Post-processing: todo-management parses AI output and writes to todos store
      if (skillId === 'todo-management' && result) {
        this._parseTodosFromAI(result);
      }

      return { success: true, output: result, outputType: 'markdown' };
    } catch (err) {
      console.warn(`[SkillEngine] Skill ${skillId} failed:`, err.message);
      return { success: false, output: `执行失败: ${err.message}`, outputType: 'text' };
    }
  }

  /**
   * Gather context data based on context keys from SKILL.md frontmatter.
   */
  _gatherContext(contextKeys, userContext = {}) {
    if (!contextKeys || contextKeys.length === 0) return '';

    const today = new Date().toISOString().split('T')[0];
    const parts = [];

    for (const key of contextKeys) {
      switch (key) {
        case 'rawTyping': {
          let raw = '';
          try {
            const fs = require('fs');
            const path = require('path');
            const outputDir = this._store.get('recorderOutputDir');
            if (outputDir) {
              const filePath = path.join(outputDir, `keyboard_${today}.txt`);
              if (fs.existsSync(filePath)) {
                raw = fs.readFileSync(filePath, 'utf-8');
              }
            }
          } catch (err) {
            console.warn('[SkillEngine] Failed to read keyboard log:', err.message);
          }
          if (raw) {
            parts.push(`## 今日原始键盘记录（全天）\n${raw}`);
          } else {
            parts.push('## 今日原始键盘记录\n(暂无数据，用户今日尚未打字或未启用记录)');
          }
          break;
        }
        case 'convertedText': {
          const text = this._store.get(`convertedText_${today}`) || '';
          if (text) {
            parts.push(`## 今日打字内容（已转换，全天）\n${text}`);
          } else {
            parts.push('## 今日打字内容（已转换）\n(暂无数据，请先执行 /convert 转换打字记录)');
          }
          break;
        }
        case 'todos': {
          const todos = this._store.get('todos') || [];
          if (todos.length > 0) {
            const list = todos.map(t => `- [${t.completed ? 'x' : ' '}] ${t.text}`).join('\n');
            const doneCount = todos.filter(t => t.completed).length;
            parts.push(`## 当前待办 (${doneCount}/${todos.length} 完成)\n${list}`);
          } else {
            parts.push('## 当前待办\n(无)');
          }
          break;
        }
        case 'pomodoroStats': {
          const stats = this._store.get('pomodoroStats') || { count: 0 };
          parts.push(`## 番茄钟\n今日完成数: ${stats.count || 0}`);
          break;
        }
        case 'userMessage': {
          if (userContext.userMessage) {
            parts.push(`## 用户输入\n${userContext.userMessage}`);
          }
          break;
        }
        default: {
          const val = this._store.get(key);
          if (val) {
            parts.push(`## ${key}\n${typeof val === 'string' ? val : JSON.stringify(val)}`);
          }
        }
      }
    }

    return parts.join('\n\n');
  }

  /**
   * Single AI API call (non-streaming).
   */
  async _callAI(prompt, temperature = 0.5) {
    const config = this._getAIConfig();
    if (!config.apiKey) {
      throw new Error('未配置 API Key，请在设置中配置');
    }

    const { net } = require('electron');
    const url = `${config.apiBaseUrl}/chat/completions`;

    const response = await net.fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: config.modelName,
        messages: [{ role: 'user', content: prompt }],
        temperature: temperature
      })
    });

    const json = await response.json();

    if (json.choices && json.choices[0]) {
      return json.choices[0].message.content;
    } else if (json.error) {
      throw new Error(json.error.message || 'AI API error');
    } else {
      throw new Error('Invalid AI response: ' + JSON.stringify(json).substring(0, 200));
    }
  }

  _getAIConfig() {
    return {
      apiBaseUrl: this._store.get('apiBaseUrl') || 'https://api.openai.com/v1',
      apiKey: this._store.get('apiKey') || '',
      modelName: this._store.get('modelName') || 'gpt-3.5-turbo'
    };
  }

  /**
   * Parse AI-generated todo list and merge into store.
   * Looks for lines matching `- [ ] xxx` pattern.
   */
  _parseTodosFromAI(aiOutput) {
    const lines = aiOutput.split('\n');
    const todos = this._store.get('todos') || [];
    const existingTexts = new Set(todos.map(t => t.text.toLowerCase()));
    let added = 0;

    for (const line of lines) {
      // Match: - [ ] 内容 or - [ ] 内容 — 来源
      const match = line.match(/^[-*]\s*\[[\s]\]\s*(.+)/);
      if (!match) continue;

      let text = match[1].trim();
      // Remove trailing source annotation like " — 来自10:50"
      text = text.replace(/\s*[—\-]\s*来[源自].*$/, '').trim();
      if (!text) continue;

      // Deduplicate
      if (existingTexts.has(text.toLowerCase())) continue;

      todos.push({
        text,
        completed: false,
        createdAt: Date.now(),
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
        source: 'ai-extract'
      });
      existingTexts.add(text.toLowerCase());
      added++;
    }

    if (added > 0) {
      this._store.set('todos', todos);
      console.log(`[SkillEngine] todo-management: added ${added} todos, total ${todos.length}`);
    }
  }
}

module.exports = { SkillEngine };
