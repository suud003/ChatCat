/**
 * Chat Scene Definitions
 *
 * Scenes for the main chat interface:
 *   - chat.default  → Normal user-initiated conversation
 *   - chat.followup → Follow-up in an ongoing conversation
 *   - chat.proactive → Cat-initiated proactive conversation
 */

'use strict';

const { SceneRegistry } = require('../scene-registry');

// ─── chat.default ────────────────────────────────────────────────────────

SceneRegistry.register({
  id: 'chat.default',
  category: 'chat',
  description: '默认聊天场景 — 用户主动发起的对话',

  prompt: {
    templateId: 'chat-system-prompt',
    mode: 'chat',
  },

  contextProviders: ['personality', 'history', 'memory', 'behavior'],
  modelProfile: 'chat-stream',
  outputMode: 'stream-text',
  memoryPolicy: 'read-write',

  capabilityPolicy: ['todo-detect'],
  postProcessors: ['persistChatHistory', 'extractMemory'],
});

// ─── chat.followup ───────────────────────────────────────────────────────

SceneRegistry.register({
  id: 'chat.followup',
  category: 'chat',
  description: '后续对话 — 在已有上下文中继续对话',

  prompt: {
    templateId: 'chat-system-prompt',
    mode: 'chat',
  },

  contextProviders: ['personality', 'history', 'memory', 'behavior'],
  modelProfile: 'chat-stream',
  outputMode: 'stream-text',
  memoryPolicy: 'read-write',

  capabilityPolicy: ['todo-detect'],
  postProcessors: ['persistChatHistory', 'extractMemory'],
});

// ─── chat.proactive ──────────────────────────────────────────────────────

SceneRegistry.register({
  id: 'chat.proactive',
  category: 'chat',
  description: '主动聊天 — 猫咪基于行为数据主动发起对话',

  prompt: {
    templateId: 'chat-system-prompt',
    mode: 'chat',
  },

  contextProviders: ['personality', 'behavior'],
  modelProfile: 'chat-complete',
  outputMode: 'text',
  memoryPolicy: 'read',

  guards: {
    quietHoursAware: true,
    cooldownKey: 'proactive-chat',
    maxPerDay: 10,
  },

  postProcessors: ['sendNotification'],
});

module.exports = {};
