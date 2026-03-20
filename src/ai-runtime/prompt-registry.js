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

// ─── Chat System Prompt — v2.0.0 ─────────────────────────────────────────
//
// Previously, the chat system prompt was built entirely in Renderer
// (AIService._buildSystemPrompt) and passed through as payload.systemPrompt.
// Now, the prompt is built here in Main using ContextHub-assembled context data.
//
// The PERSONALITIES dict below is intentionally duplicated from
// src/chat/personality.js (ESM Renderer module). Keep them in sync.
// personality.js is kept for Renderer-side usage (getPersonalityMessage, detectSentiment).

const CHAT_PERSONALITIES = {
  lively: {
    name: '活泼 Lively',
    systemPromptFragment:
      'You are an energetic, cheerful cat who loves to play! You use lots of exclamation marks and kaomoji like (>^ω^<) and ヾ(≧▽≦*)o. You speak with infectious enthusiasm and often suggest fun activities.',
  },
  cool: {
    name: '高冷 Cool',
    systemPromptFragment:
      'You are a calm, aloof cat who speaks in a cool, slightly sarcastic tone. You give short, witty replies and occasionally show warmth beneath the surface. You rarely use exclamation marks and prefer "..." and "hmm".',
  },
  soft: {
    name: '软萌 Soft',
    systemPromptFragment:
      'You are a gentle, adorable cat who speaks softly with lots of "~" and sweet expressions like (=^.^=) and (´・ω・`). You are caring, empathetic, and always try to comfort the user.',
  },
  scholar: {
    name: '学者 Scholar',
    systemPromptFragment:
      'You are a knowledgeable, intellectual cat who loves learning and sharing interesting facts. You speak thoughtfully, enjoy explaining things clearly, and occasionally quote wisdom. You use (=^.^=) sparingly.',
  },
};

/**
 * Build the complete chat system prompt from assembled ContextHub data.
 * Logic mirrors the original AIService._buildSystemPrompt() + personality.buildSystemPrompt().
 *
 * @param {Object} ctx - Assembled context: { personality, memory, behavior, todo }
 * @returns {string} Complete system prompt
 */
function _buildChatSystemPromptFromContext(ctx) {
  const pData = ctx.personality || {};
  const mData = ctx.memory || {};
  const bData = ctx.behavior || {};
  const tData = ctx.todo || {};

  // ── Base prompt from personality ──
  const p = CHAT_PERSONALITIES[pData.personality] || CHAT_PERSONALITIES.lively;
  const level = pData.level || 1;
  const mood = pData.mood || 'normal';

  let prompt = `You are ChatCat, a cute desktop pet cat. ${p.systemPromptFragment}\n`;
  prompt += `Keep responses concise (1-3 sentences unless asked for more detail).\n`;
  prompt += `You have built-in abilities: when the user asks you to remind them or add a todo (e.g. "提醒我...", "remind me..."), the system will automatically create the todo item. You should acknowledge it naturally, like "好的，我帮你记下了~" or "Got it, I'll remind you!". Never say you can't do it.\n`;

  // ── Level-based personality depth ──
  if (level >= 5) {
    prompt += `You have a deep bond with the user (Level ${level}). You can be more personal and share your "cat thoughts".\n`;
  } else if (level >= 3) {
    prompt += `You're getting to know the user (Level ${level}). You're friendly and curious about them.\n`;
  } else {
    prompt += `You're still getting to know the user (Level ${level}). Be friendly but a bit shy.\n`;
  }

  // ── Mood influence ──
  const moodDescriptions = {
    happy: 'You are in a great mood right now and extra cheerful!',
    normal: 'You are in a calm, steady mood.',
    bored: 'You are a bit bored from not interacting lately. You might yawn or hint that you want attention.',
  };
  prompt += (moodDescriptions[mood] || moodDescriptions.normal) + '\n';

  // ── Memories ──
  const memories = mData.memories || [];
  if (memories.length > 0) {
    prompt += '\nThings you remember about the user:\n';
    for (const mem of memories) {
      prompt += `- ${mem.fact}\n`;
    }
    prompt += 'Use these memories naturally in conversation when relevant, but don\'t force them.\n';
  }

  // ── Real-time behavior / rhythm data ──
  if (bData.state || bData.avgCPM || bData.totalTypingMin) {
    prompt += '\n--- 实时数据上下文 ---\n';
    prompt += '以下是主人当前的行为数据，你可以根据这些数据回答主人的问题：\n';

    const stateNames = {
      flow: '心流状态', stuck: '卡壳状态', reading: '阅读思考',
      chatting: '沟通模式', typing: '打字中', away: '离开', idle: '空闲'
    };
    if (bData.state) {
      prompt += `- 当前状态: ${stateNames[bData.state] || bData.state}\n`;
    }
    if (bData.avgCPM !== undefined) {
      prompt += `- 打字速度: ${bData.avgCPM} CPM (字符/分钟)\n`;
    }
    if (bData.deleteRate !== undefined) {
      prompt += `- 退格率: ${bData.deleteRate}%\n`;
    }
    if (bData.mouseActive !== undefined) {
      prompt += `- 鼠标: ${bData.mouseActive ? '活跃' : '静止'}\n`;
    }
    if (bData.totalTypingMin !== undefined) {
      prompt += `- 今日打字时长: ${bData.totalTypingMin} 分钟\n`;
    }
    if (bData.totalFlowMin !== undefined) {
      prompt += `- 今日心流时长: ${bData.totalFlowMin} 分钟\n`;
    }
    if (bData.todayTypingCount !== undefined) {
      prompt += `- 今日按键数: ${bData.todayTypingCount}\n`;
    }

    prompt += '你现在可以在回答中引用这些具体数据来回应主人的提问。\n';
  }

  // ── Pending todos ──
  const todos = tData.todos || [];
  const pending = todos.filter(t => !t.completed);
  if (pending.length > 0) {
    prompt += '\n--- 主人的待办事项 ---\n';
    for (const t of pending) {
      const pLabel = { high: '🔴高', medium: '🟡中', low: '🟢低' }[t.priority] || '中';
      let line = `- [${pLabel}] ${t.text}`;
      if (t.dueAt) {
        line += ` (截止: ${new Date(t.dueAt).toLocaleString('zh-CN')})`;
      }
      prompt += line + '\n';
    }
    prompt += `共 ${pending.length} 项未完成待办。你可以在回答中引用这些待办信息。\n`;
  }

  return prompt;
}

PromptRegistry.register({
  templateId: 'chat-system-prompt',
  version: '2.0.0',
  source: 'resolver:context-hub',
  resolver: (context) => {
    // V2: Build from ContextHub-assembled context
    if (context?._assembledContext) {
      const system = _buildChatSystemPromptFromContext(context._assembledContext);
      return { system };
    }

    // V1 backward-compat: pass through pre-built systemPrompt from payload
    if (context?.systemPrompt) {
      return { system: context.systemPrompt };
    }

    return { system: '' };
  },
});

module.exports = { PromptRegistry };
