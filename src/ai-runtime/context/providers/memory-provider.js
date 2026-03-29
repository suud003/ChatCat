/**
 * Memory Provider — Provides long-term memory facts for context.
 *
 * Data source: electron-store 'aiMemories' key
 * Original location: src/chat/memory-manager.js (getTopMemories)
 *
 * Returns stored memory facts that can be injected into the system prompt.
 */

'use strict';

const DEFAULT_TOP_N = 10;

const memoryProvider = {
  id: 'memory',

  /**
   * @param {import('../context-hub').ContextProviderInput} input
   * @returns {Promise<Object>}
   */
  async provide(input) {
    const store = input.store;
    const runtimeInput = input.runtimeInput || {};

    // Allow direct injection of memories (e.g. from renderer-side MemoryManager)
    if (runtimeInput.memories) {
      return {
        memories: runtimeInput.memories,
      };
    }

    // Fall back to store-persisted memories
    if (store) {
      const allMemories = store.get('aiMemories') || [];
      const topN = runtimeInput.maxMemories || DEFAULT_TOP_N;
      return {
        memories: allMemories.slice(-topN),
      };
    }

    return { memories: [] };
  },
};

module.exports = { memoryProvider };
