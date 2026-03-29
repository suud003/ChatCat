/**
 * Model Profiles — Centralized AI model parameter configuration.
 *
 * Replaces scattered temperature/maxTokens/stream values across:
 *   - src/chat/ai-service.js (temp=0.8, maxTokens=500)
 *   - src/quick-panel/text-processor.js (temp=0.3~0.5, maxTokens=500~800)
 *   - src/quick-panel/quick-panel-main.js (temp=0.4, maxTokens=800)
 *   - src/skills/skill-engine.js (temp=meta.temperature||0.5, maxTokens=2000)
 *   - src/chat/memory-manager.js (temp=0.3, maxTokens=200)
 *   - src/shared/ai-client-main.js (vision: temp=0.2, maxTokens=2000)
 *   - src/shared/ai-client-renderer.js (stream: temp=0.8, complete: temp=0.4)
 */

'use strict';

/**
 * @typedef {Object} ModelProfile
 * @property {boolean}  stream      - Whether to use streaming SSE
 * @property {number}   temperature - Sampling temperature (0.0 - 1.0)
 * @property {number}   maxTokens   - Maximum tokens in response
 * @property {string}   [description] - Human-readable description
 */

/** @type {Map<string, ModelProfile>} */
const _profiles = new Map();

// ─── Built-in Profiles (derived from existing codebase) ──────────────────

const BUILTIN_PROFILES = {
  // Chat scenes — high creativity, streaming
  'chat-stream': {
    stream: true,
    temperature: 0.8,
    maxTokens: 500,
    description: '聊天流式输出 (ai-service.js)',
  },
  'chat-complete': {
    stream: false,
    temperature: 0.8,
    maxTokens: 1000,
    description: '聊天非流式 (主动场景等)',
  },

  // Quick Panel scenes — low-medium creativity, streaming
  'quick-polish': {
    stream: true,
    temperature: 0.3,
    maxTokens: 800,
    description: '文本润色 (text-processor.js)',
  },
  'quick-explain': {
    stream: true,
    temperature: 0.5,
    maxTokens: 800,
    description: '文本解释 (text-processor.js)',
  },
  'quick-summarize': {
    stream: true,
    temperature: 0.4,
    maxTokens: 500,
    description: '文本总结 (text-processor.js)',
  },
  'quick-ask': {
    stream: true,
    temperature: 0.4,
    maxTokens: 800,
    description: 'Quick Panel 问答 (quick-panel-main.js)',
  },

  // Skill scenes — deterministic, non-streaming
  'skill-complete': {
    stream: false,
    temperature: 0.5,
    maxTokens: 2000,
    description: 'Skill 默认执行 (skill-engine.js)',
  },
  'skill-text-converter': {
    stream: false,
    temperature: 0.3,
    maxTokens: 2000,
    description: '打字记录转换 (text-converter SKILL.md)',
  },
  'skill-todo': {
    stream: false,
    temperature: 0.3,
    maxTokens: 2000,
    description: '待办提取 (todo-management SKILL.md)',
  },
  'skill-daily-report': {
    stream: false,
    temperature: 0.5,
    maxTokens: 2000,
    description: '日报生成 (daily-report SKILL.md)',
  },

  // Memory & extraction — low creativity, non-streaming
  'memory-extract': {
    stream: false,
    temperature: 0.3,
    maxTokens: 200,
    description: '记忆提取 (memory-manager.js)',
  },
  'todo-detect': {
    stream: false,
    temperature: 0.2,
    maxTokens: 150,
    description: '聊天中检测待办 (todo-parser)',
  },

  // Vision — low creativity, non-streaming
  'vision-ocr': {
    stream: false,
    temperature: 0.2,
    maxTokens: 2000,
    description: '截图/图片识别 (screenshot-ocr.js)',
  },
};

// ─── Public API ──────────────────────────────────────────────────────────

const ModelProfiles = {
  /**
   * Get a model profile by ID.
   * Returns a frozen copy to prevent external mutation.
   *
   * @param {string} profileId
   * @returns {ModelProfile|null}
   */
  getProfile(profileId) {
    const profile = _profiles.get(profileId);
    if (!profile) {
      console.warn(`[ModelProfiles] Profile not found: "${profileId}"`);
      return null;
    }
    return Object.freeze({ ...profile });
  },

  /**
   * Get a model profile, falling back to a default if not found.
   *
   * @param {string} profileId
   * @param {ModelProfile} [fallback] - Fallback config if profile not found
   * @returns {ModelProfile}
   */
  getProfileOrDefault(profileId, fallback = { stream: false, temperature: 0.4, maxTokens: 800 }) {
    return this.getProfile(profileId) || Object.freeze({ ...fallback });
  },

  /**
   * Register or overwrite a model profile.
   *
   * @param {string} profileId
   * @param {ModelProfile} config
   */
  registerProfile(profileId, config) {
    if (!profileId || typeof profileId !== 'string') {
      throw new Error('[ModelProfiles] profileId must be a non-empty string');
    }
    if (typeof config.temperature !== 'number' || typeof config.maxTokens !== 'number') {
      throw new Error(`[ModelProfiles] Profile "${profileId}" must have numeric temperature and maxTokens`);
    }
    _profiles.set(profileId, { ...config });
  },

  /**
   * List all registered profile IDs.
   * @returns {string[]}
   */
  listProfiles() {
    return [..._profiles.keys()];
  },

  /**
   * List all profiles with their configurations.
   * @returns {Array<{id: string} & ModelProfile>}
   */
  listProfilesDetailed() {
    return [..._profiles.entries()].map(([id, config]) => ({ id, ...config }));
  },

  /**
   * Check if a profile exists.
   * @param {string} profileId
   * @returns {boolean}
   */
  hasProfile(profileId) {
    return _profiles.has(profileId);
  },

  /**
   * Remove a profile.
   * @param {string} profileId
   * @returns {boolean} true if removed
   */
  removeProfile(profileId) {
    return _profiles.delete(profileId);
  },
};

// ─── Initialize built-in profiles ────────────────────────────────────────

for (const [id, config] of Object.entries(BUILTIN_PROFILES)) {
  _profiles.set(id, { ...config });
}

module.exports = { ModelProfiles, BUILTIN_PROFILES };
