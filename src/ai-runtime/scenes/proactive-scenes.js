/**
 * Proactive Scene Definitions
 *
 * Scenes for proactive/system-initiated AI interactions:
 *   - proactive.scene-message → AI-generated proactive scene message
 *   - system.agent-task       → Internal system AI task
 */

'use strict';

const { CONTEXT_PROVIDERS } = require('../context/provider-types');

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

  contextProviders: [CONTEXT_PROVIDERS.PERSONALITY, CONTEXT_PROVIDERS.BEHAVIOR],
  modelProfile: 'chat-complete',
  outputMode: 'text',
  memoryPolicy: 'read',

  guards: {
    quietHoursAware: true,
    cooldownKey: 'proactive-scene',
    maxPerDay: 20,
  },

  postProcessors: ['sendNotification'],
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
