/**
 * Behavior Provider — Provides real-time rhythm and activity data.
 *
 * Data source priority:
 *   1. electron-store `rhythmData_{date}` snapshot (written by Renderer every 60s + on state change)
 *   2. Fallback to services.rhythmAnalyzer / compositeEngine (if available, e.g. future Main-side usage)
 *   3. services.signalCollector for proactive scenes
 *
 * V2: Store-first approach — Renderer persists real-time signals
 *     (currentState, avgCPM, deleteRate, mouseActive, todayTypingCount)
 *     into the rhythmData snapshot, so Main process can read them.
 */

'use strict';

const { CONTEXT_PROVIDERS } = require('../provider-types');

const behaviorProvider = {
  id: CONTEXT_PROVIDERS.BEHAVIOR,

  /**
   * @param {import('../context-hub').ContextProviderInput} input
   * @returns {Promise<Object>}
   */
  async provide(input) {
    const store = input.store;
    const services = input.services || {};
    const data = {};

    // V2: Prefer store snapshot (written by Renderer every 60s + on state change)
    const today = new Date().toISOString().split('T')[0];
    const snapshot = store?.get(`rhythmData_${today}`);

    if (snapshot) {
      data.state = snapshot.currentState || 'idle';
      data.avgCPM = Math.round(snapshot.avgCPM || 0);
      data.deleteRate = Math.round((snapshot.deleteRate || 0) * 100);
      data.mouseActive = !!snapshot.mouseActive;
      data.totalTypingMin = Math.round(snapshot.totalTypingMin || 0);
      data.totalFlowMin = Math.round(snapshot.totalFlowMin || 0);
      data.todayTypingCount = snapshot.todayTypingCount || 0;
    } else {
      // Fallback: direct service access (if running in-process)
      if (services.rhythmAnalyzer) {
        const signals = services.rhythmAnalyzer.getCurrentSignals?.() || {};
        const state = services.rhythmAnalyzer.currentState || 'idle';

        data.state = state;
        data.avgCPM = Math.round(signals.avgCPM || 0);
        data.deleteRate = Math.round((signals.deleteRate || 0) * 100);
        data.mouseActive = !!signals.mouseActive;
      }

      if (services.compositeEngine) {
        const fullData = services.compositeEngine.getTodayFullData?.() || {};

        data.totalTypingMin = Math.round(fullData.totalTypingMin || 0);
        data.totalFlowMin = Math.round(fullData.totalFlowMin || 0);
        data.todayTypingCount = services.compositeEngine.todayTypingCount || 0;
      }
    }

    // Signal collector data (for proactive scenes)
    if (services.signalCollector) {
      const signalData = services.signalCollector.getLatestSignals?.() || {};
      data.continuousWorkMinutes = signalData.continuousWorkMinutes || 0;
      data.workPhase = signalData.workPhase || 'unknown';
    }

    return data;
  },
};

module.exports = { behaviorProvider };
