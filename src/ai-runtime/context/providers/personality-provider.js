/**
 * Personality Provider — Provides cat personality data for system prompt building.
 *
 * Data source: electron-store 'catPersonality' key
 * Original location: src/chat/personality.js (PERSONALITIES + buildSystemPrompt)
 *
 * Returns the personality key (e.g. 'lively', 'cool', 'soft', 'scholar')
 * so that the prompt composer can build the appropriate system prompt.
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
    const services = input.services || {};

    const personality = store
      ? (store.get('catPersonality') || 'lively')
      : 'lively';

    const level = services.affectionSystem?.level || 1;
    const mood = services.affectionSystem?.mood || 'normal';

    return {
      personality,
      level,
      mood,
    };
  },
};

module.exports = { personalityProvider };
