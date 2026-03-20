/**
 * Behavior Provider — Provides real-time rhythm and activity data.
 *
 * Data source: RhythmAnalyzer + CompositeEngine (injected via services)
 * Original location: src/chat/ai-service.js:78-103 (rhythm data injection)
 *
 * Returns typing speed, state, work stats for scenes that need behavioral context.
 */

'use strict';

const behaviorProvider = {
  id: 'behavior',

  /**
   * @param {import('../context-hub').ContextProviderInput} input
   * @returns {Promise<Object>}
   */
  async provide(input) {
    const services = input.services || {};
    const data = {};

    // RhythmAnalyzer data
    if (services.rhythmAnalyzer) {
      const signals = services.rhythmAnalyzer.getCurrentSignals?.() || {};
      const state = services.rhythmAnalyzer.currentState || 'idle';

      data.state = state;
      data.avgCPM = Math.round(signals.avgCPM || 0);
      data.deleteRate = Math.round((signals.deleteRate || 0) * 100);
      data.mouseActive = !!signals.mouseActive;
    }

    // CompositeEngine data
    if (services.compositeEngine) {
      const fullData = services.compositeEngine.getTodayFullData?.() || {};

      data.totalTypingMin = Math.round(fullData.totalTypingMin || 0);
      data.totalFlowMin = Math.round(fullData.totalFlowMin || 0);
      data.todayTypingCount = services.compositeEngine.todayTypingCount || 0;
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
