/**
 * App Context Provider — Provides active window/app context for AI conversations.
 *
 * Data source: electron-store key 'activeWindowSnapshot'
 *   Written by main.js every 60 seconds from activeWindowTracker.
 *
 * Allows AI to know what app/window the user is currently working in,
 * enabling context-aware conversations.
 */

'use strict';

const appContextProvider = {
  id: 'appContext',

  /**
   * @param {import('../context-hub').ContextProviderInput} input
   * @returns {Promise<Object>}
   */
  async provide(input) {
    const store = input.store;
    const snapshot = store?.get('activeWindowSnapshot');
    if (!snapshot) return { available: false };

    return {
      available: true,
      currentApp: snapshot.current?.app || null,
      currentTitle: snapshot.current?.title || null,
      recentApps: (snapshot.recent || []).slice(0, 5).map(r => r.app),
      topApps: Object.entries(snapshot.appUsage || {})
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([app, secs]) => `${app}(${Math.round(secs / 60)}min)`),
    };
  },
};

module.exports = { appContextProvider };
