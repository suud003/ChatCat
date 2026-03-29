/**
 * Quick Panel Scene Definitions
 *
 * Scenes for Quick Panel operations:
 *   - quick.polish    → Text polishing
 *   - quick.summarize → Text summarization
 *   - quick.explain   → Text explanation
 *   - quick.ask       → Q&A in Quick Panel
 *   - vision.ocr      → Screenshot / image recognition
 */

'use strict';

const { SceneRegistry } = require('../scene-registry');

// ─── quick.polish ────────────────────────────────────────────────────────

SceneRegistry.register({
  id: 'quick.polish',
  category: 'quick',
  description: '文本润色 — 保持原意，提升表达质量',

  prompt: {
    templateId: 'quick-polish',
    mode: 'instruction',
  },

  contextProviders: [],
  modelProfile: 'quick-polish',
  outputMode: 'stream-text',
  memoryPolicy: 'none',
  postProcessors: [],
});

// ─── quick.summarize ─────────────────────────────────────────────────────

SceneRegistry.register({
  id: 'quick.summarize',
  category: 'quick',
  description: '文本总结 — 提取核心要点',

  prompt: {
    templateId: 'quick-summarize',
    mode: 'instruction',
  },

  contextProviders: [],
  modelProfile: 'quick-summarize',
  outputMode: 'stream-text',
  memoryPolicy: 'none',
  postProcessors: [],
});

// ─── quick.explain ───────────────────────────────────────────────────────

SceneRegistry.register({
  id: 'quick.explain',
  category: 'quick',
  description: '文本解释 — 通俗易懂地解释概念',

  prompt: {
    templateId: 'quick-explain',
    mode: 'instruction',
  },

  contextProviders: [],
  modelProfile: 'quick-explain',
  outputMode: 'stream-text',
  memoryPolicy: 'none',
  postProcessors: [],
});

// ─── quick.translate ─────────────────────────────────────────────────────

SceneRegistry.register({
  id: 'quick.translate',
  category: 'quick',
  description: '文本翻译 — 中英互译',

  prompt: {
    templateId: 'quick-translate',
    mode: 'instruction',
  },

  contextProviders: [],
  modelProfile: 'quick-polish',
  outputMode: 'stream-text',
  memoryPolicy: 'none',
  postProcessors: [],
});

// ─── quick.ask ───────────────────────────────────────────────────────────

SceneRegistry.register({
  id: 'quick.ask',
  category: 'quick',
  description: 'Quick Panel 问答 — 猫咪助手简洁回答问题',

  prompt: {
    templateId: 'quick-ask',
    mode: 'chat',
  },

  // Light personality only — no memory, no behavior
  contextProviders: [],
  modelProfile: 'quick-ask',
  outputMode: 'stream-text',
  memoryPolicy: 'none',
  postProcessors: [],
});

// ─── vision.ocr ──────────────────────────────────────────────────────────

SceneRegistry.register({
  id: 'vision.ocr',
  category: 'vision',
  description: '截图/图片识别 — OCR 文字提取与图片描述',

  prompt: {
    templateId: 'vision-ocr',
    mode: 'vision',
  },

  contextProviders: [],
  modelProfile: 'vision-ocr',
  outputMode: 'text',
  memoryPolicy: 'none',
  postProcessors: [],
});

module.exports = {};
