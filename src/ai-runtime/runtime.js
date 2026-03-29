/**
 * AIRuntime — Unified AI execution engine for Main process.
 *
 * Orchestrates the full AI call pipeline:
 *   1. Resolve scene from SceneRegistry
 *   2. Assemble context via ContextHub
 *   3. Build prompt from PromptRegistry
 *   4. Apply model config from ModelProfiles
 *   5. Execute AI call via injected aiClient
 *
 * Replaces direct AI client calls in:
 *   - QuickPanelManager (qp-process-text, qp-ask)
 *   - SkillEngine (execute)
 *   - ScreenshotOCR (processImage)
 *
 * Post-processing stays with callers — AIRuntime only handles AI orchestration.
 */

'use strict';

const { SceneRegistry } = require('./scene-registry');
const { PromptRegistry } = require('./prompt-registry');
const { ModelProfiles } = require('./model-profiles');
const { ContextHub } = require('./context/context-hub');
const { AITrigger } = require('./trigger');

class AIRuntime {
  /**
   * @param {import('../shared/ai-client-main').AIClientMain} aiClient
   * @param {Object} [options]
   * @param {import('electron-store')} [options.store]   - electron-store instance
   * @param {Object} [options.services]                  - injected services
   */
  constructor(aiClient, { store, services } = {}) {
    this._aiClient = aiClient;
    this._store = store || null;
    this._services = services || {};
  }

  /**
   * Update injected services after initialization.
   * Called when late-initialized modules become available (e.g. skillRegistry).
   *
   * @param {Object} services
   */
  setServices(services) {
    this._services = { ...this._services, ...services };
  }

  // ─── Public API ────────────────────────────────────────────────

  /**
   * Non-streaming AI execution.
   * Used for: skills, memory extraction.
   *
   * @param {Object} trigger - AITrigger object
   * @returns {Promise<string>} AI response text
   */
  async run(trigger) {
    AITrigger.validate(trigger);

    const scene = SceneRegistry.getSceneOrThrow(trigger.sceneId);
    const profile = ModelProfiles.getProfileOrDefault(scene.modelProfile);

    // Assemble context FIRST so prompt resolver can access it
    const context = await ContextHub.assembleContext(scene, {
      trigger,
      runtimeInput: trigger.payload,
      store: this._store,
      services: this._services,
    });

    const promptContext = { ...trigger.payload, _assembledContext: context };
    const prompt = PromptRegistry.getPrompt(scene.prompt.templateId, promptContext);

    const messages = this._buildMessages(scene, prompt, context, trigger.payload);

    console.log(
      `[AIRuntime] run: scene=${trigger.sceneId}, ` +
      `messages=${messages.length}, ` +
      `temp=${profile.temperature}, maxTokens=${profile.maxTokens}`
    );

    const result = await this._aiClient.complete({
      messages,
      temperature: profile.temperature,
      maxTokens: profile.maxTokens,
    });

    return result;
  }

  /**
   * Streaming AI execution with onChunk callback.
   * Used for: Quick Panel text processing, Quick Panel ask.
   *
   * @param {Object}   trigger  - AITrigger object
   * @param {Function} [onChunk] - Called with each content chunk
   * @returns {Promise<string>} Full concatenated result
   */
  async runStream(trigger, onChunk) {
    AITrigger.validate(trigger);

    const scene = SceneRegistry.getSceneOrThrow(trigger.sceneId);
    const profile = ModelProfiles.getProfileOrDefault(scene.modelProfile);

    // Assemble context FIRST so prompt resolver can access it
    const context = await ContextHub.assembleContext(scene, {
      trigger,
      runtimeInput: trigger.payload,
      store: this._store,
      services: this._services,
    });

    const promptContext = { ...trigger.payload, _assembledContext: context };
    const prompt = PromptRegistry.getPrompt(scene.prompt.templateId, promptContext);

    const messages = this._buildMessages(scene, prompt, context, trigger.payload);

    console.log(
      `[AIRuntime] runStream: scene=${trigger.sceneId}, ` +
      `messages=${messages.length}, ` +
      `temp=${profile.temperature}, maxTokens=${profile.maxTokens}`
    );

    const result = await this._aiClient.stream({
      messages,
      onChunk,
      temperature: profile.temperature,
      maxTokens: profile.maxTokens,
    });

    return result;
  }

  /**
   * Vision (multimodal) AI execution.
   * Used for: Screenshot OCR.
   *
   * @param {Object} trigger - AITrigger with payload.base64 and payload.config
   * @returns {Promise<string>} AI response text
   */
  async vision(trigger) {
    AITrigger.validate(trigger);

    const scene = SceneRegistry.getSceneOrThrow(trigger.sceneId);
    const profile = ModelProfiles.getProfileOrDefault(scene.modelProfile);
    const prompt = PromptRegistry.getPrompt(scene.prompt.templateId);

    const { base64, config } = trigger.payload;

    console.log(
      `[AIRuntime] vision: scene=${trigger.sceneId}, ` +
      `temp=${profile.temperature}, maxTokens=${profile.maxTokens}`
    );

    const result = await this._aiClient.vision({
      base64,
      model: config?.visionModel || config?.modelName,
      textPrompt: prompt?.userTemplate || undefined,
      temperature: profile.temperature,
      maxTokens: profile.maxTokens,
    });

    return result;
  }

  // ─── Internal: Message Building ────────────────────────────────

  /**
   * Build the messages array for an AI call based on scene prompt mode.
   *
   * @param {Object} scene   - SceneDefinition
   * @param {Object} prompt  - PromptBundle from PromptRegistry
   * @param {Object} context - Assembled context from ContextHub
   * @param {Object} payload - Trigger payload
   * @returns {Array<{role: string, content: string}>}
   */
  _buildMessages(scene, prompt, context, payload) {
    const mode = scene.prompt.mode;

    switch (mode) {
      case 'instruction':
        return this._buildInstructionMessages(scene, prompt, context, payload);

      case 'chat':
        return this._buildChatMessages(scene, prompt, context, payload);

      case 'extract':
        return this._buildExtractMessages(scene, prompt, context, payload);

      default:
        console.warn(`[AIRuntime] Unknown prompt mode: "${mode}", falling back to instruction`);
        return this._buildInstructionMessages(scene, prompt, context, payload);
    }
  }

  /**
   * Build messages for instruction mode (skills, quick panel text).
   *
   * For skills: system = SKILL.md body, user = assembled context as markdown sections
   * For quick panel: system = prompt.system, user = rendered userTemplate or payload.text
   */
  _buildInstructionMessages(scene, prompt, context, payload) {
    const systemContent = prompt?.system || '';
    let userContent = '';

    if (scene.category === 'skill') {
      // Skill mode: user content = assembled context formatted as markdown sections
      userContent = this._formatContextAsMarkdown(context, payload);
    } else if (prompt?.userTemplate) {
      // Quick panel mode: render userTemplate with payload vars
      userContent = this._renderTemplate(prompt.userTemplate, payload);
    } else {
      // Fallback: use payload.text directly
      userContent = payload.text || payload.userMessage || '';
    }

    const messages = [];
    if (systemContent) {
      messages.push({ role: 'system', content: systemContent });
    }
    messages.push({ role: 'user', content: userContent });

    return messages;
  }

  /**
   * Build messages for chat mode (quick-ask).
   *
   * System prompt + conversation history passed through.
   */
  _buildChatMessages(scene, prompt, context, payload) {
    const systemContent = prompt?.system || '';
    const messages = [];

    if (systemContent) {
      messages.push({ role: 'system', content: systemContent });
    }

    // For quick-ask: history is a pre-built messages array from renderer
    if (Array.isArray(payload.history)) {
      messages.push(...payload.history);
    }

    return messages;
  }

  /**
   * Build messages for extract mode (memory extraction).
   *
   * System prompt + rendered user template with payload vars.
   */
  _buildExtractMessages(scene, prompt, context, payload) {
    const systemContent = prompt?.system || '';
    let userContent = '';

    if (prompt?.userTemplate) {
      userContent = this._renderTemplate(prompt.userTemplate, payload);
    } else {
      // Fallback: format as "User message: ... Assistant response: ..."
      userContent = `User message: "${payload.userMessage || ''}"\nAssistant response: "${payload.assistantResponse || ''}"`;
    }

    return [
      { role: 'system', content: systemContent },
      { role: 'user', content: userContent },
    ];
  }

  // ─── Internal: Helpers ─────────────────────────────────────────

  /**
   * Format assembled context data into markdown sections.
   * Mimics the output format of SkillEngine._gatherContext().
   *
   * Each context provider returns a `formatted` field with
   * pre-formatted markdown (e.g. "## 今日原始键盘记录\n...").
   *
   * @param {Object} context  - { [providerId]: { formatted, ... } }
   * @param {Object} payload  - Trigger payload (may contain userMessage)
   * @returns {string} Markdown sections joined by double newlines
   */
  _formatContextAsMarkdown(context, payload) {
    const parts = [];

    // Collect formatted sections from each context provider
    for (const [providerId, data] of Object.entries(context)) {
      if (data && data.formatted) {
        parts.push(data.formatted);
      }
    }

    // Append userMessage if present in payload
    if (payload.userContext?.userMessage || payload.userMessage) {
      const msg = payload.userContext?.userMessage || payload.userMessage;
      parts.push(`## 用户输入\n${msg}`);
    }

    return parts.join('\n\n');
  }

  /**
   * Simple template rendering — replace {key} with vars[key].
   * Mirrors PromptRegistry.renderTemplate().
   *
   * @param {string} template
   * @param {Object} vars
   * @returns {string}
   */
  _renderTemplate(template, vars = {}) {
    if (!template) return '';
    return template.replace(/\{(\w+)\}/g, (match, key) => {
      return vars.hasOwnProperty(key) ? String(vars[key]) : match;
    });
  }
}

module.exports = { AIRuntime };
