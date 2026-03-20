/**
 * Context Hub — Centralized context assembly for AI scenes.
 *
 * Replaces scattered context-gathering logic in:
 *   - src/chat/ai-service.js:71 (_buildSystemPrompt)
 *   - src/skills/skill-engine.js:75 (_gatherContext)
 *   - src/proactive/proactive-engine.js:273 (_buildContext)
 *
 * ContextHub assembles context by invoking only the providers
 * declared in a scene's contextProviders list, enforcing the
 * injection matrix (design doc Section 8.4).
 */

'use strict';

/**
 * @typedef {Object} ContextProvider
 * @property {string}   id       - Provider identifier (e.g. 'personality', 'history')
 * @property {Function} provide  - async (input) => Record<string, any>
 */

/**
 * @typedef {Object} ContextProviderInput
 * @property {Object}  scene        - SceneDefinition
 * @property {Object}  [trigger]    - AITrigger (Phase 3)
 * @property {Object}  [runtimeInput] - Additional runtime data
 * @property {Object}  [store]      - electron-store instance (for main process providers)
 * @property {Object}  [services]   - Injected service references
 */

/** @type {Map<string, ContextProvider>} */
const _providers = new Map();

const ContextHub = {
  /**
   * Register a context provider.
   *
   * @param {ContextProvider} provider - Must have `id` and `provide` function
   */
  registerProvider(provider) {
    if (!provider.id || typeof provider.id !== 'string') {
      throw new Error('[ContextHub] Provider must have a non-empty string id');
    }
    if (typeof provider.provide !== 'function') {
      throw new Error(`[ContextHub] Provider "${provider.id}" must have a provide() function`);
    }
    _providers.set(provider.id, provider);
  },

  /**
   * Assemble context for a scene by invoking declared providers.
   *
   * Only providers listed in scene.contextProviders will be called.
   * Providers run in parallel for performance.
   *
   * @param {Object}  scene        - SceneDefinition with contextProviders[]
   * @param {Object}  [options]    - Additional context
   * @param {Object}  [options.trigger]      - AITrigger
   * @param {Object}  [options.runtimeInput] - Runtime data (userMessage, text, etc.)
   * @param {Object}  [options.store]        - electron-store instance
   * @param {Object}  [options.services]     - Injected services (recorder, etc.)
   * @returns {Promise<Object>} Merged context from all providers
   */
  async assembleContext(scene, options = {}) {
    const providerIds = scene.contextProviders || [];
    if (providerIds.length === 0) {
      return {};
    }

    const input = {
      scene,
      trigger: options.trigger || null,
      runtimeInput: options.runtimeInput || {},
      store: options.store || null,
      services: options.services || {},
    };

    // Run all providers in parallel
    const results = await Promise.allSettled(
      providerIds.map(async (providerId) => {
        const provider = _providers.get(providerId);
        if (!provider) {
          console.warn(`[ContextHub] Provider not found: "${providerId}" (scene: ${scene.id})`);
          return { id: providerId, data: {} };
        }

        try {
          const data = await provider.provide(input);
          return { id: providerId, data: data || {} };
        } catch (err) {
          console.error(`[ContextHub] Provider "${providerId}" failed:`, err.message);
          return { id: providerId, data: {}, error: err.message };
        }
      })
    );

    // Merge all provider results into a single context object
    const context = {};
    for (const result of results) {
      if (result.status === 'fulfilled') {
        const { id, data } = result.value;
        context[id] = data;
      }
    }

    return context;
  },

  /**
   * Check if a provider is registered.
   * @param {string} providerId
   * @returns {boolean}
   */
  hasProvider(providerId) {
    return _providers.has(providerId);
  },

  /**
   * List all registered provider IDs.
   * @returns {string[]}
   */
  listProviders() {
    return [..._providers.keys()];
  },

  /**
   * Get a provider by ID.
   * @param {string} providerId
   * @returns {ContextProvider|null}
   */
  getProvider(providerId) {
    return _providers.get(providerId) || null;
  },

  /**
   * Remove a provider registration.
   * @param {string} providerId
   * @returns {boolean}
   */
  removeProvider(providerId) {
    return _providers.delete(providerId);
  },
};

module.exports = { ContextHub };
