/**
 * Memory Scene Definitions
 *
 * Scenes for memory operations:
 *   - memory.extract → Extract key facts from conversation for long-term memory
 */

'use strict';

const { SceneRegistry } = require('../scene-registry');

// ─── memory.extract ──────────────────────────────────────────────────────

SceneRegistry.register({
  id: 'memory.extract',
  category: 'memory',
  description: '记忆提取 — 从对话中提取关键个人事实存入长期记忆',

  prompt: {
    templateId: 'memory-extract',
    mode: 'extract',
  },

  // Only needs the single conversation turn, not full history
  contextProviders: [],
  modelProfile: 'memory-extract',
  outputMode: 'json',
  memoryPolicy: 'write',

  postProcessors: ['extractMemory'],
});

module.exports = {};
