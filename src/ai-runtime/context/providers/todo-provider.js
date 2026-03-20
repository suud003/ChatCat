/**
 * Todo Provider — Provides current todo list for context.
 *
 * Data source: electron-store 'todos' key
 * Original location: src/skills/skill-engine.js:115 (case 'todos')
 *
 * Returns the user's todo list formatted for prompt injection.
 */

'use strict';

const { CONTEXT_PROVIDERS } = require('../provider-types');

const todoProvider = {
  id: CONTEXT_PROVIDERS.TODO,

  /**
   * @param {import('../context-hub').ContextProviderInput} input
   * @returns {Promise<Object>}
   */
  async provide(input) {
    const store = input.store;

    if (!store) {
      return { todos: [], formatted: '## 当前待办\n(无)' };
    }

    const todos = store.get('todos') || [];

    if (todos.length === 0) {
      return { todos: [], formatted: '## 当前待办\n(无)' };
    }

    const list = todos.map(t => `- [${t.completed ? 'x' : ' '}] ${t.text}`).join('\n');
    const doneCount = todos.filter(t => t.completed).length;
    const formatted = `## 当前待办 (${doneCount}/${todos.length} 完成)\n${list}`;

    return { todos, formatted };
  },
};

module.exports = { todoProvider };
