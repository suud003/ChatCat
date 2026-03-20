/**
 * Converted Text Provider — Provides today's converted (readable) text.
 *
 * Data source: electron-store 'convertedText_{date}' key
 * Original location: src/skills/skill-engine.js:105-112 (case 'convertedText')
 *
 * Returns the text-converter output for skills that need it
 * (daily-report, todo-management).
 */

'use strict';

const convertedTextProvider = {
  id: 'converted-text',

  /**
   * @param {import('../context-hub').ContextProviderInput} input
   * @returns {Promise<Object>}
   */
  async provide(input) {
    const store = input.store;

    if (!store) {
      return { text: '', formatted: '## 今日打字内容（已转换）\n(暂无数据)' };
    }

    const today = new Date().toISOString().split('T')[0];
    const text = store.get(`convertedText_${today}`) || '';

    const formatted = text
      ? `## 今日打字内容（已转换，全天）\n${text}`
      : '## 今日打字内容（已转换）\n(暂无数据，请先执行 /convert 转换打字记录)';

    return { text, formatted };
  },
};

module.exports = { convertedTextProvider };
