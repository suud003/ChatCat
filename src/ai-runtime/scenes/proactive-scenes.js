/**
 * Proactive Scene Definitions
 *
 * Scenes for proactive/system-initiated AI interactions:
 *   - proactive.scene-message → AI-generated proactive scene message
 *   - system.agent-task       → Internal system AI task
 */

'use strict';

const { SceneRegistry } = require('../scene-registry');

// ─── proactive.scene-message ─────────────────────────────────────────────

SceneRegistry.register({
  id: 'proactive.scene-message',
  category: 'proactive',
  description: '主动场景消息 — 基于行为信号生成关怀/提醒消息',

  prompt: {
    templateId: 'chat-system-prompt',
    mode: 'chat',
  },

  contextProviders: ['personality', 'behavior', 'appContext'],
  modelProfile: 'chat-stream',
  outputMode: 'stream-text',
  memoryPolicy: 'read',

  guards: {
    quietHoursAware: true,
    cooldownKey: 'proactive-scene',
    maxPerDay: 20,
  },

  postProcessors: ['sendNotification'],
});

// ─── offline.adventure ──────────────────────────────────────────────────

SceneRegistry.register({
  id: 'offline.adventure',
  category: 'proactive',
  description: '离线冒险报告 — 猫咪离线期间的探索故事',

  prompt: {
    templateId: 'offline-adventure-prompt',
    mode: 'instruction',
  },

  contextProviders: ['personality'],
  modelProfile: 'chat-complete',
  outputMode: 'text',
  memoryPolicy: 'none',

  guards: {
    quietHoursAware: false,
    maxPerDay: 1,
  },
});

// ─── system.agent-task ───────────────────────────────────────────────────

SceneRegistry.register({
  id: 'system.agent-task',
  category: 'system',
  description: '系统内部 AI 任务 — 供后续 Agent 扩展使用',

  prompt: {
    templateId: 'chat-system-prompt',
    mode: 'instruction',
  },

  contextProviders: [],
  modelProfile: 'skill-complete',
  outputMode: 'text',
  memoryPolicy: 'none',

  postProcessors: ['recordMetrics'],
});

module.exports = {};
