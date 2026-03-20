/**
 * AIRuntimeRenderer — Renderer-process AI execution adapter.
 *
 * Provides unified AI orchestration for Renderer-side modules:
 *   - AIService (chat streaming)
 *   - MemoryManager (memory extraction)
 *
 * Uses IPC Registry Mirror to access Phase 1 registry data
 * (SceneRegistry, PromptRegistry, ModelProfiles) without
 * importing CommonJS modules into ESM context.
 *
 * Post-processing stays with callers.
 */

/**
 * @typedef {Object} RendererTrigger
 * @property {string} type     - Trigger type (e.g. 'chat', 'memory')
 * @property {string} sceneId  - Scene ID (e.g. 'chat.default', 'memory.extract')
 * @property {Object} payload  - Type-specific data
 * @property {number} createdAt - Creation timestamp
 */

export class AIRuntimeRenderer {
  /**
   * @param {import('../shared/ai-client-renderer').AIClientRenderer} aiClient
   */
  constructor(aiClient) {
    this._aiClient = aiClient;

    /** @type {Map<string, Object>} Scene definitions from Main */
    this._scenes = new Map();

    /** @type {Map<string, Object>} Prompt bundles from Main */
    this._prompts = new Map();

    /** @type {Map<string, Object>} Model profiles from Main */
    this._profiles = new Map();

    this._initialized = false;
  }

  // ─── Initialization ────────────────────────────────────────────

  /**
   * Load registry data from Main process via IPC.
   * Must be called before any run/runStream calls.
   */
  async init() {
    try {
      const data = await window.electronAPI.getAIRegistries();

      if (data.scenes) {
        for (const s of data.scenes) {
          this._scenes.set(s.id, s);
        }
      }

      if (data.prompts) {
        for (const p of data.prompts) {
          this._prompts.set(p.templateId, p);
        }
      }

      if (data.profiles) {
        for (const p of data.profiles) {
          this._profiles.set(p.id, p);
        }
      }

      this._initialized = true;

      console.log(
        `[AIRuntimeRenderer] Initialized: ` +
        `${this._scenes.size} scenes, ` +
        `${this._prompts.size} prompts, ` +
        `${this._profiles.size} profiles`
      );

      // Warn if any map is unexpectedly empty
      if (this._scenes.size === 0) {
        console.warn('[AIRuntimeRenderer] Warning: No scenes loaded from Main process');
      }
    } catch (err) {
      console.error('[AIRuntimeRenderer] Failed to load registries:', err.message);
      // Continue with empty maps — modules should check isReady()
    }
  }

  /**
   * Check if the runtime is ready (initialized and AI client configured).
   * @returns {boolean}
   */
  isReady() {
    return this._initialized && this._aiClient.isConfigured();
  }

  // ─── Public API ────────────────────────────────────────────────

  /**
   * Streaming AI execution — yields content chunks.
   * Used for: chat streaming.
   *
   * For chat scenes, the caller passes the pre-built system prompt
   * in trigger.payload.systemPrompt (built by AIService._buildSystemPrompt()).
   *
   * @param {RendererTrigger} trigger
   * @returns {AsyncGenerator<string>} Content chunks
   */
  async *runStream(trigger) {
    const scene = this._getScene(trigger.sceneId);
    const profile = this._getProfile(scene.modelProfile);

    let messages;

    if (trigger.payload.systemPrompt) {
      // Chat mode: system prompt pre-built by caller
      messages = [
        { role: 'system', content: trigger.payload.systemPrompt },
        ...(trigger.payload.history || []),
      ];
    } else {
      // Generic: build messages from prompt registry
      const prompt = this._prompts.get(scene.prompt?.templateId);
      messages = this._buildMessages(scene, prompt, trigger.payload);
    }

    console.log(
      `[AIRuntimeRenderer] runStream: scene=${trigger.sceneId}, ` +
      `messages=${messages.length}, ` +
      `temp=${profile.temperature}, maxTokens=${profile.maxTokens}`
    );

    yield* this._aiClient.stream({
      messages,
      temperature: profile.temperature,
      maxTokens: profile.maxTokens,
    });
  }

  /**
   * Non-streaming AI execution.
   * Used for: memory extraction.
   *
   * @param {RendererTrigger} trigger
   * @returns {Promise<string>} AI response text
   */
  async run(trigger) {
    const scene = this._getScene(trigger.sceneId);
    const profile = this._getProfile(scene.modelProfile);
    const prompt = this._prompts.get(scene.prompt?.templateId);

    const messages = this._buildMessages(scene, prompt, trigger.payload);

    console.log(
      `[AIRuntimeRenderer] run: scene=${trigger.sceneId}, ` +
      `messages=${messages.length}, ` +
      `temp=${profile.temperature}, maxTokens=${profile.maxTokens}`
    );

    return await this._aiClient.complete({
      messages,
      temperature: profile.temperature,
      maxTokens: profile.maxTokens,
    });
  }

  // ─── Static Helpers ────────────────────────────────────────────

  /**
   * Create a trigger object in ESM context.
   * Avoids needing to import CommonJS trigger.js.
   *
   * @param {string} type
   * @param {string} sceneId
   * @param {Object} payload
   * @returns {RendererTrigger}
   */
  static createTrigger(type, sceneId, payload = {}) {
    return { type, sceneId, payload, createdAt: Date.now() };
  }

  // ─── Internal ──────────────────────────────────────────────────

  /**
   * Get a scene by ID from local cache.
   * @param {string} sceneId
   * @returns {Object}
   */
  _getScene(sceneId) {
    const scene = this._scenes.get(sceneId);
    if (!scene) {
      throw new Error(`[AIRuntimeRenderer] Scene not found: "${sceneId}"`);
    }
    return scene;
  }

  /**
   * Get a model profile by ID from local cache, with fallback.
   * @param {string} profileId
   * @returns {Object}
   */
  _getProfile(profileId) {
    return this._profiles.get(profileId) || {
      stream: false,
      temperature: 0.4,
      maxTokens: 800,
    };
  }

  /**
   * Build messages array from scene prompt mode.
   *
   * @param {Object} scene
   * @param {Object|undefined} prompt
   * @param {Object} payload
   * @returns {Array<{role: string, content: string}>}
   */
  _buildMessages(scene, prompt, payload) {
    const mode = scene.prompt?.mode || 'instruction';

    switch (mode) {
      case 'extract': {
        // Memory extraction: system + rendered user template
        const systemContent = prompt?.system || '';
        let userContent = '';

        if (prompt?.userTemplate) {
          userContent = this._renderTemplate(prompt.userTemplate, payload);
        } else {
          userContent = `User message: "${payload.userMessage || ''}"\nAssistant response: "${payload.assistantResponse || ''}"`;
        }

        return [
          { role: 'system', content: systemContent },
          { role: 'user', content: userContent },
        ];
      }

      case 'chat': {
        // Chat: system + history array
        const systemContent = prompt?.system || '';
        const messages = [];
        if (systemContent) {
          messages.push({ role: 'system', content: systemContent });
        }
        if (Array.isArray(payload.history)) {
          messages.push(...payload.history);
        }
        return messages;
      }

      default: {
        // Instruction mode fallback
        const systemContent = prompt?.system || '';
        const userContent = prompt?.userTemplate
          ? this._renderTemplate(prompt.userTemplate, payload)
          : (payload.text || payload.userMessage || '');
        const messages = [];
        if (systemContent) {
          messages.push({ role: 'system', content: systemContent });
        }
        messages.push({ role: 'user', content: userContent });
        return messages;
      }
    }
  }

  /**
   * Simple template rendering — replace {key} with vars[key].
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
