/**
 * Prompt Registry — Centralized prompt template management.
 *
 * Replaces scattered prompt definitions across:
 *   - src/chat/personality.js (chat system prompts)
 *   - src/chat/memory-manager.js (memory extraction prompt)
 *   - src/quick-panel/text-processor.js (polish/explain/summarize)
 *   - src/quick-panel/quick-panel-main.js (ask system prompt)
 *   - src/skills/skills/SKILL.md (skill prompt bodies)
 *
 * Supports three registration modes:
 *   1. Direct — JS string prompt registered inline
 *   2. Adapter — reads from existing module at runtime
 *   3. Lazy — deferred loading (e.g. SKILL.md read on first access)
 */

'use strict';

/**
 * @typedef {Object} PromptBundle
 * @property {string}  templateId   - Unique prompt identifier
 * @property {string}  version      - Semantic version for tracking
 * @property {string}  [system]     - System prompt content
 * @property {string}  [userTemplate] - User message template (may contain {variables})
 * @property {string}  [source]     - Where this prompt originates ('inline' | 'adapter' | 'skill-md')
 */

/**
 * @typedef {Object} PromptRegistration
 * @property {string}  templateId
 * @property {string}  version
 * @property {string}  [system]
 * @property {string}  [userTemplate]
 * @property {string}  source
 * @property {Function} [resolver]  - Lazy resolver function for dynamic prompts
 */

/** @type {Map<string, PromptRegistration>} */
const _prompts = new Map();

// ─── Public API ──────────────────────────────────────────────────────────

const PromptRegistry = {
  /**
   * Register a prompt template.
   *
   * @param {Object} opts
   * @param {string}   opts.templateId   - Unique identifier
   * @param {string}   opts.version      - Version string (e.g. '1.0.0')
   * @param {string}   [opts.system]     - System prompt content
   * @param {string}   [opts.userTemplate] - User message template
   * @param {string}   [opts.source]     - Origin descriptor
   * @param {Function} [opts.resolver]   - Lazy resolver: () => { system, userTemplate }
   */
  register({ templateId, version, system, userTemplate, source = 'inline', resolver }) {
    if (!templateId || typeof templateId !== 'string') {
      throw new Error('[PromptRegistry] templateId must be a non-empty string');
    }
    if (!version || typeof version !== 'string') {
      throw new Error(`[PromptRegistry] Prompt "${templateId}" must have a version string`);
    }
    if (!system && !userTemplate && !resolver) {
      throw new Error(`[PromptRegistry] Prompt "${templateId}" must have system, userTemplate, or resolver`);
    }

    _prompts.set(templateId, {
      templateId,
      version,
      system: system || null,
      userTemplate: userTemplate || null,
      source,
      resolver: resolver || null,
    });
  },

  /**
   * Get a prompt bundle by templateId.
   * If the prompt has a resolver, it will be called to fill in dynamic content.
   *
   * @param {string} templateId
   * @param {Object} [context] - Optional context passed to resolver
   * @returns {PromptBundle|null}
   */
  getPrompt(templateId, context = {}) {
    const reg = _prompts.get(templateId);
    if (!reg) {
      console.warn(`[PromptRegistry] Prompt not found: "${templateId}"`);
      return null;
    }

    // If there's a lazy resolver, call it to get dynamic content
    if (reg.resolver) {
      try {
        const resolved = reg.resolver(context);
        return Object.freeze({
          templateId: reg.templateId,
          version: reg.version,
          system: resolved.system || reg.system,
          userTemplate: resolved.userTemplate || reg.userTemplate,
          source: reg.source,
        });
      } catch (err) {
        console.error(`[PromptRegistry] Resolver failed for "${templateId}":`, err.message);
        // Fall back to static content
        return Object.freeze({
          templateId: reg.templateId,
          version: reg.version,
          system: reg.system,
          userTemplate: reg.userTemplate,
          source: reg.source,
        });
      }
    }

    return Object.freeze({
      templateId: reg.templateId,
      version: reg.version,
      system: reg.system,
      userTemplate: reg.userTemplate,
      source: reg.source,
    });
  },

  /**
   * Get a prompt bundle, with fallback if not found.
   *
   * @param {string} templateId
   * @param {PromptBundle} fallback
   * @param {Object} [context]
   * @returns {PromptBundle}
   */
  getPromptOrDefault(templateId, fallback, context = {}) {
    return this.getPrompt(templateId, context) || Object.freeze({ ...fallback });
  },

  /**
   * Check if a prompt template is registered.
   * @param {string} templateId
   * @returns {boolean}
   */
  hasPrompt(templateId) {
    return _prompts.has(templateId);
  },

  /**
   * List all registered template IDs.
   * @returns {string[]}
   */
  listPrompts() {
    return [..._prompts.keys()];
  },

  /**
   * List all prompts with metadata (without content, for overview).
   * @returns {Array<{templateId: string, version: string, source: string}>}
   */
  listPromptsDetailed() {
    return [..._prompts.values()].map(reg => ({
      templateId: reg.templateId,
      version: reg.version,
      source: reg.source,
      hasResolver: !!reg.resolver,
      hasSystem: !!reg.system,
      hasUserTemplate: !!reg.userTemplate,
    }));
  },

  /**
   * Remove a prompt registration.
   * @param {string} templateId
   * @returns {boolean}
   */
  removePrompt(templateId) {
    return _prompts.delete(templateId);
  },

  /**
   * Apply simple variable substitution on a template string.
   * Replaces {key} patterns with values from the vars object.
   *
   * @param {string} template - Template with {variable} placeholders
   * @param {Object} vars     - Key-value pairs for substitution
   * @returns {string}
   */
  renderTemplate(template, vars = {}) {
    if (!template) return '';
    return template.replace(/\{(\w+)\}/g, (match, key) => {
      return vars.hasOwnProperty(key) ? String(vars[key]) : match;
    });
  },
};

// ─── Built-in Prompt Registrations ───────────────────────────────────────

// Memory extraction prompt (from src/chat/memory-manager.js:11)
PromptRegistry.register({
  templateId: 'memory-extract',
  version: '1.0.0',
  source: 'inline',
  system: `You are a memory extraction assistant. Given a user message and assistant response from a chat, extract key personal facts about the user.

Rules:
- Only extract concrete, memorable facts (name, preferences, habits, birthday, work info, etc.)
- Return a JSON array of objects: [{"fact": "...", "category": "..."}]
- Categories: name, preference, habit, birthday, work, other
- If no memorable facts, return an empty array: []
- Keep facts short (under 50 chars each)
- Max 3 facts per extraction
- Do NOT extract generic conversational content
- Respond with ONLY the JSON array, no other text`,
  userTemplate: 'User message: "{userMessage}"\nAssistant response: "{assistantResponse}"',
});

// Quick Panel: Polish (from src/quick-panel/text-processor.js)
PromptRegistry.register({
  templateId: 'quick-polish',
  version: '1.0.0',
  source: 'adapter:text-processor',
  system: `你是一个专业的文本润色助手。
要求：
1. 保持原意不变，提升表达质量
2. 修正语法和错别字
3. 使措辞更加专业、得体
4. 如果是中文则保持中文，如果是英文则保持英文
5. 只输出润色后的文本，不要解释`,
  userTemplate: '请润色以下文本：\n\n{text}',
});

// Quick Panel: Summarize (from src/quick-panel/text-processor.js)
PromptRegistry.register({
  templateId: 'quick-summarize',
  version: '1.0.0',
  source: 'adapter:text-processor',
  system: `你是一个专业的内容总结助手。
要求：
1. 提取核心要点，用简洁的条目列出
2. 保留关键信息，忽略细枝末节
3. 如果内容较长，分层级总结
4. 用中文输出（除非原文是英文）
5. 格式：使用 • 符号列出要点`,
  userTemplate: '请总结以下内容的核心要点：\n\n{text}',
});

// Quick Panel: Explain (from src/quick-panel/text-processor.js)
PromptRegistry.register({
  templateId: 'quick-explain',
  version: '1.0.0',
  source: 'adapter:text-processor',
  system: `你是一个耐心的教学助手，擅长用通俗易懂的方式解释概念。
要求：
1. 先给出一句话简明解释
2. 然后用"举个例子"补充说明
3. 如果是代码，逐行注释关键逻辑
4. 如果是专业术语，类比日常概念
5. 控制在200字以内`,
  userTemplate: '请解释以下内容：\n\n{text}',
});

// Quick Panel: Ask (from src/quick-panel/quick-panel-main.js:129)
PromptRegistry.register({
  templateId: 'quick-ask',
  version: '1.0.0',
  source: 'adapter:quick-panel-main',
  system: '你是 ChatCat 🐱，一只聪明的AI猫咪助手。简洁准确地回答用户的问题。',
});

// Vision OCR default prompt (from src/shared/ai-client-main.js:128)
PromptRegistry.register({
  templateId: 'vision-ocr',
  version: '1.0.0',
  source: 'inline',
  userTemplate: '请识别并描述这张图片的内容。如果包含文字，请提取文字；如果包含代码，请保留代码格式。',
});

// Chat system prompt — uses resolver since it's dynamic (personality/level/mood/memories)
// The actual prompt building logic stays in personality.js; we just reference it here.
// Resolver is registered in scenes/chat-scenes.js after personality module is available.

module.exports = { PromptRegistry };
