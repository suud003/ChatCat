export class CompositeSignalEngine {
  constructor(signalCollector, mouseSignalCollector) {
    this._signalCollector = signalCollector;
    this._mouseCollector = mouseSignalCollector;
    
    this._hourlyActivity = new Array(24).fill(null).map(() => ({
      typingMinutes: 0,
      avgCPM: 0,
      peakCPM: 0,
      deleteRate: 0,
      clicks: 0,
      mouseDist: 0,
      idleMinutes: 0,
      activityScore: 0
    }));
    
    this._dailyBaselines = [];
    this._hourlyPatterns = {};
    
    this._todayDate = new Date().toISOString().split('T')[0];
    this._todayTypingCount = 0;
    this._todayFlowMinutes = 0;
    this._listeners = {};
  }
  
  async init() {
    const saved = await window.electronAPI.getStore('rhythmBaselines');
    if (saved) {
      this._dailyBaselines = saved;
      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
      this._dailyBaselines = this._dailyBaselines.filter(
        b => new Date(b.date).getTime() > thirtyDaysAgo
      );
    }
    
    const patterns = await window.electronAPI.getStore('hourlyPatterns');
    if (patterns) this._hourlyPatterns = patterns;
    
    // Load today's activity if it exists
    const todayData = await window.electronAPI.getStore(`rhythmData_${this._todayDate}`);
    if (todayData && todayData.hourlyActivity) {
      // Restore hourly activity array
      todayData.hourlyActivity.forEach((hData, i) => {
        if (i >= 0 && i < 24) {
          Object.assign(this._hourlyActivity[i], hData);
        }
      });
      // Restore totals
      this._todayTypingCount = todayData.totalKeys || this._hourlyActivity.reduce((sum, d) => sum + Math.round(d.avgCPM * d.typingMinutes), 0); // fallback calculation
      this._todayFlowMinutes = todayData.totalFlowMin || 0;
    }
    
    this._timer = setInterval(() => this._updateHourlyActivity(), 30000);
    this._dailyTimer = setInterval(() => this._checkDayEnd(), 60000);
  }

  _updateHourlyActivity() {
    const hour = new Date().getHours();
    const data = this._hourlyActivity[hour];
    const mouseSnapshot = this._mouseCollector.snapshot;
    
    if (mouseSnapshot && !mouseSnapshot.isStill) {
      data.clicks += mouseSnapshot.clicksPerMin / 2;
      data.mouseDist += mouseSnapshot.moveDistance;
    }
    
    if (this._signalCollector.isTyping) {
      data.typingMinutes += 0.5;
      data.avgCPM = (data.avgCPM + this._signalCollector.typingSpeed) / 2;
      data.peakCPM = Math.max(data.peakCPM, this._signalCollector.typingSpeed);
      data.deleteRate = (data.deleteRate + (this._signalCollector.deleteRate || 0)) / 2;
      
      this._todayTypingCount += Math.round(this._signalCollector.typingSpeed * 0.5);
    } else {
      data.idleMinutes += 0.5;
    }
    
    data.activityScore = this._calculateActivityScore(hour);
    
    if (this._signalCollector.continuousWorkMinutes > 15 && this._signalCollector.isTyping) {
      this._todayFlowMinutes += 0.5;
    }

    this._emit('activity-tick', {
      score: data.activityScore,
      hour,
      signals: {
        typing: !!this._signalCollector.isTyping,
        avgCPM: this._signalCollector.typingSpeed || 0,
        deleteRate: this._signalCollector.deleteRate || 0,
        continuousWorkMinutes: this._signalCollector.continuousWorkMinutes || 0,
        mouseActive: !!(mouseSnapshot && !mouseSnapshot.isStill),
        clicksPerMin: mouseSnapshot ? mouseSnapshot.clicksPerMin || 0 : 0,
        moveDistance: mouseSnapshot ? mouseSnapshot.moveDistance || 0 : 0
      }
    });
  }

  _calculateActivityScore(hour) {
    const data = this._hourlyActivity[hour];
    if (!data) return 0;
    
    const typingScore = Math.min(100, data.typingMinutes / 50 * 100);
    const clickScore = Math.min(100, data.clicks / 200 * 100);
    const moveScore = Math.min(100, data.mouseDist / 50000 * 100);
    
    return Math.round(typingScore * 0.5 + clickScore * 0.3 + moveScore * 0.2);
  }

  async _checkDayEnd() {
    const today = new Date().toISOString().split('T')[0];
    if (this._todayDate !== today) {
      await this._cleanOldData();
      this._todayDate = today;
      this._hourlyActivity.forEach(data => {
        data.typingMinutes = 0;
        data.avgCPM = 0;
        data.peakCPM = 0;
        data.deleteRate = 0;
        data.clicks = 0;
        data.mouseDist = 0;
        data.idleMinutes = 0;
        data.activityScore = 0;
      });
      this._todayTypingCount = 0;
      this._todayFlowMinutes = 0;
    }
  }

  async _cleanOldData() {
    for (let i = 8; i < 40; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = `rhythmData_${d.toISOString().split('T')[0]}`;
      await window.electronAPI.setStore(key, undefined);
    }
  }

  on(event, fn) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(fn);
  }

  off(event, fn) {
    if (!this._listeners[event]) return;
    this._listeners[event] = this._listeners[event].filter(listener => listener !== fn);
  }

  _emit(event, data) {
    if (!this._listeners[event]) return;
    this._listeners[event].forEach(fn => fn(data));
  }

  getBestWorkingHours() {
    const hourScores = [];
    for (let h = 0; h < 24; h++) {
      const pattern = this._hourlyPatterns[h];
      if (pattern && pattern.sampleCount >= 3) {
        hourScores.push({ hour: h, avgScore: pattern.avgActivity });
      }
    }
    return hourScores.sort((a, b) => b.avgScore - a.avgScore).slice(0, 3);
  }

  getPersonalizedRestThreshold() {
    if (this._dailyBaselines.length < 3) return 90;
    
    const workStreaks = this._dailyBaselines
      .map(b => b.longestStreak || 60)
      .sort((a, b) => a - b);
    
    const p90Index = Math.floor(workStreaks.length * 0.9);
    return workStreaks[p90Index] || 90;
  }

  get todayActivity() { return this._hourlyActivity; }
  get todayTypingCount() { return this._todayTypingCount; }
  get todayFlowMinutes() { return this._todayFlowMinutes; }
  
  getActivityScore(hour) { return this._calculateActivityScore(hour); }
  getBaselineComparison() {
    const baseline = this._signalCollector.speedBaseline || 0;
    const current = this._signalCollector.typingSpeed || 0;
    const speedDelta = baseline > 0 ? (current - baseline) / baseline : 0;
    return { speedDelta, baseline, current };
  }
  
  getTodayFullData() {
    return {
      date: this._todayDate,
      hourlyActivity: this._hourlyActivity.map((data, hour) => ({ hour, ...data })),
      totalTypingMin: this._hourlyActivity.reduce((sum, d) => sum + d.typingMinutes, 0),
      totalFlowMin: this._todayFlowMinutes,
      totalKeys: this._todayTypingCount, // explicitly include totalKeys
      bestHour: this.getBestWorkingHours()[0]?.hour || 0
    };
  }
}