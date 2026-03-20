/**
 * AITrigger — Standardized request object for AI Runtime execution.
 *
 * Every AI call flows through a trigger that carries:
 *   - type:    what kind of call (chat, quick-text, skill, etc.)
 *   - sceneId: which SceneRegistry scene to use
 *   - payload: source-specific data
 *
 * Used by AIRuntime.run() / runStream() / vision() in Main process,
 * and by AIRuntimeRenderer in Renderer process.
 */

'use strict';

const TRIGGER_TYPES = {
  CHAT: 'chat',
  QUICK_TEXT: 'quick-text',
  QUICK_ASK: 'quick-ask',
  SKILL: 'skill',
  MEMORY: 'memory',
  VISION: 'vision',
};

const VALID_TYPES = new Set(Object.values(TRIGGER_TYPES));

let _idCounter = 0;

/**
 * Generate a simple unique ID (not crypto-grade, just unique within process).
 */
function _generateId() {
  return `trg_${Date.now().toString(36)}_${(++_idCounter).toString(36)}`;
}

const AITrigger = {
  /**
   * Create a new AITrigger.
   *
   * @param {string} type     - One of TRIGGER_TYPES values
   * @param {string} sceneId  - SceneRegistry scene ID (e.g. 'chat.default', 'quick.polish')
   * @param {Object} payload  - Type-specific data
   * @returns {Object} AITrigger object
   */
  create(type, sceneId, payload = {}) {
    if (!type || typeof type !== 'string') {
      throw new Error('[AITrigger] type must be a non-empty string');
    }
    if (!sceneId || typeof sceneId !== 'string') {
      throw new Error('[AITrigger] sceneId must be a non-empty string');
    }

    return {
      id: _generateId(),
      type,
      sceneId,
      payload,
      createdAt: Date.now(),
    };
  },

  /**
   * Validate a trigger object. Throws on invalid structure.
   *
   * @param {Object} trigger
   * @throws {Error} if trigger is malformed
   */
  validate(trigger) {
    if (!trigger || typeof trigger !== 'object') {
      throw new Error('[AITrigger] trigger must be an object');
    }
    if (!trigger.type || typeof trigger.type !== 'string') {
      throw new Error('[AITrigger] trigger.type must be a non-empty string');
    }
    if (!VALID_TYPES.has(trigger.type)) {
      console.warn(`[AITrigger] Unknown trigger type: "${trigger.type}" (not in TRIGGER_TYPES)`);
    }
    if (!trigger.sceneId || typeof trigger.sceneId !== 'string') {
      throw new Error('[AITrigger] trigger.sceneId must be a non-empty string');
    }
    if (trigger.payload !== undefined && typeof trigger.payload !== 'object') {
      throw new Error('[AITrigger] trigger.payload must be an object if provided');
    }
  },

  /**
   * Get a human-readable description of a trigger (for logging).
   *
   * @param {Object} trigger
   * @returns {string}
   */
  describe(trigger) {
    if (!trigger) return '[null trigger]';
    return `[Trigger ${trigger.id || '?'}: ${trigger.type}/${trigger.sceneId}]`;
  },
};

module.exports = { AITrigger, TRIGGER_TYPES };
