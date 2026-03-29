/**
 * Scene Registry — Centralized AI scene definition management.
 *
 * A Scene is the core unit of AI interaction, replacing the current
 * entry-point-based organization (chat-ui, quick-panel, skill-engine, etc.)
 * with a scene-based model where each scene declares:
 *   - What prompt to use
 *   - Which context providers to load
 *   - Which model profile to apply
 *   - Memory read/write policy
 *   - Post-processing steps
 *   - Guard conditions (consent, cooldown, quiet hours)
 */

'use strict';

/**
 * @typedef {Object} SceneDefinition
 * @property {string}   id              - Unique scene identifier (e.g. 'chat.default')
 * @property {string}   category        - 'chat' | 'quick' | 'skill' | 'vision' | 'memory' | 'proactive' | 'system'
 * @property {string}   description     - Human-readable description
 * @property {Object}   prompt          - Prompt configuration
 * @property {string}   prompt.templateId - PromptRegistry template ID
 * @property {string}   prompt.mode     - 'chat' | 'instruction' | 'vision' | 'extract'
 * @property {string[]} contextProviders - List of ContextHub provider IDs to load
 * @property {string}   modelProfile    - ModelProfiles profile ID
 * @property {string}   outputMode      - 'stream-text' | 'text' | 'markdown' | 'json'
 * @property {string}   memoryPolicy    - 'none' | 'read' | 'write' | 'read-write'
 * @property {string[]} [capabilityPolicy] - Allowed capabilities
 * @property {string[]} [postProcessors]   - Post-processing step IDs
 * @property {Object}   [guards]        - Guard conditions
 * @property {boolean}  [guards.requiresConsent]
 * @property {boolean}  [guards.quietHoursAware]
 * @property {string}   [guards.cooldownKey]
 * @property {number}   [guards.maxPerDay]
 */

/** @type {Map<string, SceneDefinition>} */
const _scenes = new Map();

// ─── Public API ──────────────────────────────────────────────────────────

const SceneRegistry = {
  /**
   * Register a scene definition.
   * @param {SceneDefinition} scene
   */
  register(scene) {
    if (!scene.id || typeof scene.id !== 'string') {
      throw new Error('[SceneRegistry] Scene must have a non-empty string id');
    }
    if (!scene.category) {
      throw new Error(`[SceneRegistry] Scene "${scene.id}" must have a category`);
    }
    if (!scene.prompt || !scene.prompt.templateId) {
      throw new Error(`[SceneRegistry] Scene "${scene.id}" must have prompt.templateId`);
    }
    if (!scene.modelProfile) {
      throw new Error(`[SceneRegistry] Scene "${scene.id}" must have a modelProfile`);
    }

    // Apply defaults
    const definition = {
      contextProviders: [],
      outputMode: 'text',
      memoryPolicy: 'none',
      capabilityPolicy: [],
      postProcessors: [],
      guards: {},
      ...scene,
    };

    _scenes.set(definition.id, Object.freeze(definition));
  },

  /**
   * Get a scene definition by ID.
   * @param {string} sceneId
   * @returns {SceneDefinition|null}
   */
  getScene(sceneId) {
    return _scenes.get(sceneId) || null;
  },

  /**
   * Get a scene definition, throwing if not found.
   * @param {string} sceneId
   * @returns {SceneDefinition}
   */
  getSceneOrThrow(sceneId) {
    const scene = _scenes.get(sceneId);
    if (!scene) {
      throw new Error(`[SceneRegistry] Scene not found: "${sceneId}"`);
    }
    return scene;
  },

  /**
   * Check if a scene exists.
   * @param {string} sceneId
   * @returns {boolean}
   */
  hasScene(sceneId) {
    return _scenes.has(sceneId);
  },

  /**
   * List all registered scene IDs.
   * @returns {string[]}
   */
  listScenes() {
    return [..._scenes.keys()];
  },

  /**
   * List scenes filtered by category.
   * @param {string} [category] - Optional category filter
   * @returns {SceneDefinition[]}
   */
  listScenesDetailed(category) {
    const all = [..._scenes.values()];
    if (category) {
      return all.filter(s => s.category === category);
    }
    return all;
  },

  /**
   * Find scenes by category.
   * @param {string} category
   * @returns {SceneDefinition[]}
   */
  findByCategory(category) {
    return [..._scenes.values()].filter(s => s.category === category);
  },

  /**
   * Remove a scene registration.
   * @param {string} sceneId
   * @returns {boolean}
   */
  removeScene(sceneId) {
    return _scenes.delete(sceneId);
  },

  /**
   * Get the total number of registered scenes.
   * @returns {number}
   */
  get size() {
    return _scenes.size;
  },
};

module.exports = { SceneRegistry };
