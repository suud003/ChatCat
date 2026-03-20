/**
 * Raw Typing Provider — Provides raw keyboard log for today.
 *
 * Data source: Keyboard log file (keyboard_{date}.txt)
 * Original location: src/skills/skill-engine.js:83-103 (case 'rawTyping')
 *
 * Returns today's raw keyboard log content for skills that need it
 * (text-converter, daily-report, todo-management).
 */

'use strict';

const fs = require('fs');
const path = require('path');

const rawTypingProvider = {
  id: 'raw-typing',

  /**
   * @param {import('../context-hub').ContextProviderInput} input
   * @returns {Promise<Object>}
   */
  async provide(input) {
    const store = input.store;

    if (!store) {
      return { raw: '', formatted: '## 今日原始键盘记录\n(暂无数据)' };
    }

    const today = new Date().toISOString().split('T')[0];
    let raw = '';

    try {
      const outputDir = store.get('recorderOutputDir');
      if (outputDir) {
        const filePath = path.join(outputDir, `keyboard_${today}.txt`);
        if (fs.existsSync(filePath)) {
          raw = fs.readFileSync(filePath, 'utf-8');
        }
      }
    } catch (err) {
      console.warn('[RawTypingProvider] Failed to read keyboard log:', err.message);
    }

    const formatted = raw
      ? `## 今日原始键盘记录（全天）\n${raw}`
      : '## 今日原始键盘记录\n(暂无数据，用户今日尚未打字或未启用记录)';

    return { raw, formatted };
  },
};

module.exports = { rawTypingProvider };
