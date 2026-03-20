/**
 * Personality Provider — Provides cat personality data for system prompt building.
 *
 * Data source: electron-store keys:
 *   - 'catPersonality' → personality key (lively/cool/soft/scholar)
 *   - 'level'          → affection level (1-10)
 *   - 'catMood'        → current mood (happy/normal/bored)
 *
 * V2: Reads entirely from store (persisted by Renderer),
 *     no longer depends on Renderer-only services.affectionSystem.
 */

'use strict';

const personalityProvider = {
  id: 'personality',

  /**
   * @param {import('../context-hub').ContextProviderInput} input
   * @returns {Promise<Object>}
   */
  async provide(input) {
    const store = input.store;

    const personality = store?.get('catPersonality') || 'lively';
    const level = store?.get('level') || 1;
    const mood = store?.get('catMood') || 'normal';

    return {
      personality,
      level,
      mood,
    };
  },
};

module.exports = { personalityProvider };
