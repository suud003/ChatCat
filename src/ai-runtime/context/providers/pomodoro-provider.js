/**
 * Pomodoro Provider — Provides today's pomodoro statistics.
 *
 * Data source: electron-store 'pomodoroStats' key
 * Original location: src/skills/skill-engine.js:126-129 (case 'pomodoroStats')
 *
 * Returns pomodoro completion count for daily-report context.
 */

'use strict';

const { CONTEXT_PROVIDERS } = require('../provider-types');

const pomodoroProvider = {
  id: CONTEXT_PROVIDERS.POMODORO,

  /**
   * @param {import('../context-hub').ContextProviderInput} input
   * @returns {Promise<Object>}
   */
  async provide(input) {
    const store = input.store;

    if (!store) {
      return { count: 0, formatted: '## 番茄钟\n今日完成数: 0' };
    }

    const stats = store.get('pomodoroStats') || { count: 0 };
    const count = stats.count || 0;

    return {
      count,
      formatted: `## 番茄钟\n今日完成数: ${count}`,
    };
  },
};

module.exports = { pomodoroProvider };
