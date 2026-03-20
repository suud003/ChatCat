/**
 * Skill Scene Definitions
 *
 * Scenes for the Skill system:
 *   - skill.text-converter   → Raw typing → readable Chinese text
 *   - skill.todo-management  → Extract TODOs from typing records
 *   - skill.daily-report     → Generate daily work report
 *   - skill.weekly-report    → Generate weekly work report
 *   - skill.ui-style-guide   → UI style guide reference
 *
 * Note: Skill prompts come from SKILL.md files via PromptRegistry adapters.
 * The templateId uses 'skill.<name>' convention, and actual prompt body
 * is resolved lazily from SkillRegistry.readSkillBody() at runtime.
 */

'use strict';

const { SceneRegistry } = require('../scene-registry');

// ─── skill.text-converter ────────────────────────────────────────────────

SceneRegistry.register({
  id: 'skill.text-converter',
  category: 'skill',
  description: '打字记录转换 — 将原始键盘记录还原为可读中文',

  prompt: {
    templateId: 'skill.text-converter',
    mode: 'instruction',
  },

  contextProviders: ['raw-typing'],
  modelProfile: 'skill-text-converter',
  outputMode: 'text',
  memoryPolicy: 'none',

  postProcessors: ['saveConvertedText'],
});

// ─── skill.todo-management ───────────────────────────────────────────────

SceneRegistry.register({
  id: 'skill.todo-management',
  category: 'skill',
  description: '待办提取 — 从打字记录中智能提取待办事项',

  prompt: {
    templateId: 'skill.todo-management',
    mode: 'instruction',
  },

  contextProviders: ['converted-text', 'raw-typing', 'todo'],
  modelProfile: 'skill-todo',
  outputMode: 'markdown',
  memoryPolicy: 'none',

  postProcessors: ['parseTodo'],
});

// ─── skill.daily-report ──────────────────────────────────────────────────

SceneRegistry.register({
  id: 'skill.daily-report',
  category: 'skill',
  description: '日报生成 — 根据今日打字记录生成结构化工作日报',

  prompt: {
    templateId: 'skill.daily-report',
    mode: 'instruction',
  },

  contextProviders: ['converted-text', 'raw-typing', 'todo', 'pomodoro'],
  modelProfile: 'skill-daily-report',
  outputMode: 'markdown',
  memoryPolicy: 'none',

  postProcessors: ['recordMetrics'],
});

// ─── skill.weekly-report ─────────────────────────────────────────────────

SceneRegistry.register({
  id: 'skill.weekly-report',
  category: 'skill',
  description: '周报生成 — 根据本周记录生成结构化工作周报',

  prompt: {
    templateId: 'skill.weekly-report',
    mode: 'instruction',
  },

  contextProviders: ['converted-text', 'todo'],
  modelProfile: 'skill-complete',
  outputMode: 'markdown',
  memoryPolicy: 'none',

  postProcessors: ['recordMetrics'],
});

// ─── skill.ui-style-guide ────────────────────────────────────────────────

SceneRegistry.register({
  id: 'skill.ui-style-guide',
  category: 'skill',
  description: 'UI 样式指南 — 提供 ChatCat UI 开发的设计规范参考',

  prompt: {
    templateId: 'skill.ui-style-guide',
    mode: 'instruction',
  },

  contextProviders: [],
  modelProfile: 'skill-complete',
  outputMode: 'markdown',
  memoryPolicy: 'none',

  postProcessors: [],
});

module.exports = {};
