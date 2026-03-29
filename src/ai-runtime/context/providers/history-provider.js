/**
 * History Provider — Provides conversation history for context.
 *
 * Data source: electron-store 'chatHistory' key or injected conversation array
 * Original location: src/chat/ai-service.js (this.conversationHistory)
 *
 * Returns recent conversation messages for injection into the prompt.
 * Respects scene-level limits (e.g. memory.extract only needs single turn).
 */

'use strict';

const DEFAULT_MAX_MESSAGES = 20;

const historyProvider = {
  id: 'history',

  /**
   * @param {import('../context-hub').ContextProviderInput} input
   * @returns {Promise<Object>}
   */
  async provide(input) {
    const store = input.store;
    const runtimeInput = input.runtimeInput || {};

    // Allow direct injection of history (e.g. from renderer-side AIService)
    if (runtimeInput.conversationHistory) {
      const maxMessages = runtimeInput.maxHistoryMessages || DEFAULT_MAX_MESSAGES;
      return {
        messages: runtimeInput.conversationHistory.slice(-maxMessages),
      };
    }

    // Fall back to store-persisted history
    if (store) {
      const history = store.get('chatHistory') || [];
      return {
        messages: history.slice(-DEFAULT_MAX_MESSAGES),
      };
    }

    return { messages: [] };
  },
};

module.exports = { historyProvider };
