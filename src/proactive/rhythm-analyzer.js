export class RhythmAnalyzer {
  constructor(signalCollector, mouseSignalCollector) {
    this._signalCollector = signalCollector;
    this._mouseCollector = mouseSignalCollector;
    
    this._currentState = 'idle';
    this._stateStartTime = Date.now();
    this._confidence = 0;
    
    this._stateHistory = [];
    this._maxHistorySize = 500;
    
    this._flowCandidate = false;
    this._flowCandidateStart = 0;
    this._highSpeedStreak = 0;
    
    this._typingBursts = [];
    
    this._analyzeIntervalMs = 30000;
    this._listeners = {};
  }

  init() {
    this._timer = setInterval(() => this._analyze(), this._analyzeIntervalMs);
    
    this._signalCollector.on('typing-rhythm-change', (data) => {
      // Stub for future use
    });
    
    this._signalCollector.on('typing-pause', (data) => {
      this._onTypingPause(data);
    });
    
    this._mouseCollector.on('mouse-snapshot', (snapshot) => {
      // Relying mostly on setInterval analyze cycle
    });
  }

  _analyze() {
    const now = Date.now();
    const typing = this._signalCollector.isTyping;
    const speed = this._signalCollector.typingSpeed || 0;
    const baseline = this._signalCollector.speedBaseline || 0;
    const mouseSnapshot = this._mouseCollector.snapshot;
    const liveSignals = this.getCurrentSignals();
    const mouseActive = liveSignals.mouseActive;
    const lastKeyTime = this._signalCollector.lastKeyTime || 0;
    const timeSinceKey = now - lastKeyTime;
    
    let newState = this._currentState;
    let confidence = 0;
    
    if (timeSinceKey > 30 * 60 * 1000 && (mouseSnapshot?.isStill ?? true)) {
      newState = 'away';
      confidence = 1.0;
    }
    else if (!typing && timeSinceKey > 3 * 60 * 1000 && mouseActive) {
      newState = 'reading';
      confidence = 0.9;
    }
    else if (typing && baseline > 0) {
      const speedRatio = speed / baseline;
      const deleteRate = this._signalCollector.deleteRate || 0;
      
      if (speedRatio > 1.1 && deleteRate < 0.08) {
        if (!this._flowCandidate) {
          this._flowCandidate = true;
          this._flowCandidateStart = now;
        }
        const flowDuration = now - this._flowCandidateStart;
        if (flowDuration > 20 * 60 * 1000) {
          newState = 'flow';
          confidence = Math.min(1.0, (flowDuration / (30 * 60 * 1000)) * 0.8 + 0.2);
        }
      } else {
        this._flowCandidate = false;
      }
      
      if (speedRatio < 0.5 && deleteRate > 0.15) {
        const stuckDuration = now - this._stateStartTime;
        if (stuckDuration > 2 * 60 * 1000 || this._currentState === 'stuck') {
          newState = 'stuck';
          confidence = Math.min(1.0, (1 - speedRatio) * 0.5 + deleteRate * 2);
        }
      }
      
      if (this._detectChattingPattern()) {
        newState = 'chatting';
        confidence = Math.min(1.0, this._typingBursts.length / 5);
      }
    }
    // 新增：当正在打字但 baseline 还未建立时，进入 typing 状态
    else if (typing) {
      newState = 'typing';
      confidence = 0.6;
    }
    
    if (newState !== this._currentState) {
      this._onStateChange(newState, confidence);
    }
    
    this._emit('rhythm-tick', {
      state: this._currentState,
      confidence: this._confidence,
      duration: now - this._stateStartTime,
      signals: liveSignals
    });
  }

  _onStateChange(newState, confidence) {
    const now = Date.now();
    const prevState = this._currentState;
    const prevDuration = now - this._stateStartTime;
    
    if (prevState !== 'idle') {
      this._stateHistory.push({
        state: prevState,
        startTime: this._stateStartTime,
        endTime: now,
        duration: prevDuration
      });
      if (this._stateHistory.length > this._maxHistorySize) {
        this._stateHistory.shift();
      }
    }
    
    this._currentState = newState;
    this._stateStartTime = now;
    this._confidence = confidence;
    
    this._emit('rhythm-state-change', {
      state: newState,
      prevState,
      prevDuration,
      confidence,
      timestamp: now
    });
    
    if (prevState === 'flow' && newState !== 'flow') {
      this._emit('flow-ended', {
        duration: prevDuration,
        avgCPM: this._signalCollector.typingSpeed || 0
      });
    }
  }

  _detectChattingPattern() {
    const now = Date.now();
    this._typingBursts = this._typingBursts.filter(b => now - b.time < 5 * 60 * 1000);
    return this._typingBursts.length >= 3;
  }

  _onTypingPause(data) {
    if (data.continuousWorkMinutes < 0.5 && data.pauseDurationMs >= 5000 && data.pauseDurationMs <= 30000) {
      this._typingBursts.push({
        time: Date.now(),
        speed: data.typingSpeed,
        pauseAfter: data.pauseDurationMs
      });
    }
  }

  get currentState() { return this._currentState; }
  get stateDuration() { return Date.now() - this._stateStartTime; }
  get confidence() { return this._confidence; }
  get stateHistory() { return [...this._stateHistory]; }

  getCurrentSignals() {
    const speed = this._signalCollector.typingSpeed || 0;
    const baseline = this._signalCollector.speedBaseline || 0;
    return {
      avgCPM: speed,
      deleteRate: this._signalCollector.deleteRate || 0,
      mouseActive: this._mouseCollector?.isActiveNow || false,
      baselineDeviation: baseline > 0
        ? `${speed > baseline ? '+' : ''}${Math.round((speed - baseline) / baseline * 100)}%`
        : 'N/A'
    };
  }

  getDailySummary() {
    const today = new Date().toISOString().split('T')[0];
    const todayHistory = this._stateHistory.filter(h => {
      return new Date(h.startTime).toISOString().split('T')[0] === today;
    });
    
    const summary = {
      flowSessions: [],
      stuckEvents: [],
      totalFlowMinutes: 0,
      totalActiveMinutes: 0,
      stateBreakdown: {}
    };
    
    for (const h of todayHistory) {
      const minutes = h.duration / 60000;
      summary.stateBreakdown[h.state] = (summary.stateBreakdown[h.state] || 0) + minutes;
      
      if (h.state === 'flow') {
        summary.flowSessions.push({
          start: new Date(h.startTime).toTimeString().slice(0, 5),
          end: new Date(h.endTime).toTimeString().slice(0, 5),
          durationMin: Math.round(minutes)
        });
        summary.totalFlowMinutes += minutes;
      }
      if (h.state === 'stuck') {
        summary.stuckEvents.push({
          time: new Date(h.startTime).toTimeString().slice(0, 5),
          durationMin: Math.round(minutes)
        });
      }
      if (h.state !== 'away') {
        summary.totalActiveMinutes += minutes;
      }
    }
    
    return summary;
  }

  on(event, fn) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(fn);
  }
  off(event, fn) {
    if (!this._listeners[event]) return;
    this._listeners[event] = this._listeners[event].filter(l => l !== fn);
  }
  _emit(event, data) {
    if (!this._listeners[event]) return;
    this._listeners[event].forEach(fn => fn(data));
  }
}
