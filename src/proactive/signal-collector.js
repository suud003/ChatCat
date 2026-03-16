/**
 * Signal Collector - Proactive Interaction Engine
 *
 * Collects user behavior signals:
 * - Typing data: speed, pauses, continuous work duration
 * - Typing rhythm: baseline tracking, mood detection (frustrated/rushing/steady)
 * - Time signals: hourly, lunch break, end of day, late night
 * - Work phase detection: morning start, afternoon slump, wrap-up, overtime
 * - Idle detection via affection system's last interaction time
 * - Clipboard content classification
 *
 * Emits signals via EventEmitter pattern for ProactiveEngine consumption.
 */

export class SignalCollector {
  constructor() {
    this._listeners = {};
    this._typingTimestamps = [];     // recent keydown timestamps
    this._lastKeyTime = 0;
    this._workStartTime = 0;         // when continuous work began
    this._isTyping = false;
    this._pauseTimer = null;
    this._checkTimer = null;
    this._lastHourCheck = -1;
    this._affectionSystem = null;

    // Config
    this._pauseThresholdMs = 15000;  // 15 seconds pause
    this._typingGapMs = 3000;        // 3 seconds between keys = still typing
    this._speedWindowMs = 60000;     // 1 minute window for speed calc

    // V1.5: Speed baseline tracking (7-day sliding window)
    this._speedSamples = [];         // { speed, timestamp }
    this._speedBaseline = 0;         // average speed over 7 days
    this._lastBaselineUpdate = 0;

    // V1.5: Typing rhythm analysis
    this._keyIntervals = [];         // recent inter-key intervals (ms)
    this._deleteCount = 0;           // delete/backspace count in current window
    this._totalKeyCount = 0;         // total keys in current window
    this._rhythmWindowStart = 0;

    // V1.5: Work phase tracking
    this._firstTypingToday = false;
    this._todayDate = '';

    // V1.5: Clipboard tracking
    this._lastClipboardContent = '';
    this._clipboardRepeatMap = {};   // content hash -> { count, firstSeen }
  }

  /**
   * Initialize with external references.
   */
  init(affectionSystem) {
    this._affectionSystem = affectionSystem;
    this._workStartTime = Date.now();

    // Listen for global keydowns
    window.electronAPI.onGlobalKeydown((data) => this._onKeydown(data));

    // Periodic checks (every 30 seconds)
    this._checkTimer = setInterval(() => this._periodicCheck(), 30000);

    // Initial time check
    this._periodicCheck();

    // V1.5: Load speed baseline from store
    this._loadBaseline();

    // V1.5: Listen for clipboard updates
    window.electronAPI.onClipboardUpdate((item) => this._onClipboardUpdate(item));
  }

  destroy() {
    if (this._checkTimer) clearInterval(this._checkTimer);
    if (this._pauseTimer) clearTimeout(this._pauseTimer);
  }

  // --- EventEmitter ---
  on(event, fn) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(fn);
  }

  off(event, fn) {
    if (!this._listeners[event]) return;
    this._listeners[event] = this._listeners[event].filter(f => f !== fn);
  }

  _emit(event, data) {
    if (!this._listeners[event]) return;
    for (const fn of this._listeners[event]) {
      try { fn(data); } catch (e) { console.warn('[SignalCollector] listener error:', e); }
    }
  }

  // --- Typing Signals ---
  _onKeydown(data) {
    const now = Date.now();

    // Track typing timestamps for speed calculation
    this._typingTimestamps.push(now);
    // Keep only last minute of timestamps
    const cutoff = now - this._speedWindowMs;
    this._typingTimestamps = this._typingTimestamps.filter(t => t > cutoff);

    // V1.5: Track inter-key intervals for rhythm analysis
    if (this._lastKeyTime > 0) {
      const interval = now - this._lastKeyTime;
      if (interval < 5000) { // only track reasonable intervals
        this._keyIntervals.push(interval);
        if (this._keyIntervals.length > 100) this._keyIntervals.shift();
      }
    }

    // V1.5: Track delete/backspace keys
    this._totalKeyCount++;
    if (data && (data.keycode === 14 || data.keycode === 3667)) { // Backspace / Delete
      this._deleteCount++;
    }

    // V1.5: Reset rhythm window every 60 seconds
    if (now - this._rhythmWindowStart > 60000) {
      this._analyzeTypingRhythm();
      this._rhythmWindowStart = now;
      this._deleteCount = 0;
      this._totalKeyCount = 0;
    }

    // Detect if user just resumed typing after pause
    if (!this._isTyping) {
      this._isTyping = true;
      if (!this._workStartTime) {
        this._workStartTime = now;
      }

      // V1.5: First typing of the day
      const today = new Date().toISOString().split('T')[0];
      if (this._todayDate !== today) {
        this._todayDate = today;
        this._firstTypingToday = true;
        this._checkWorkPhase('morning-start');
      }
    }

    // Reset pause detection timer
    if (this._pauseTimer) clearTimeout(this._pauseTimer);
    this._pauseTimer = setTimeout(() => {
      this._isTyping = false;
      this._emit('typing-pause', {
        pauseDurationMs: this._pauseThresholdMs,
        continuousWorkMinutes: this._getContinuousWorkMinutes(),
        typingSpeed: this._getTypingSpeed()
      });
    }, this._pauseThresholdMs);

    this._lastKeyTime = now;

    // Emit speed change if significant
    const speed = this._getTypingSpeed();
    if (this._typingTimestamps.length % 20 === 0) {
      this._emit('typing-speed-change', { speed });

      // V1.5: Record speed sample for baseline
      this._recordSpeedSample(speed);
    }
  }

  _getTypingSpeed() {
    if (this._typingTimestamps.length < 2) return 0;
    const window = Math.min(this._speedWindowMs, Date.now() - this._typingTimestamps[0]);
    if (window <= 0) return 0;
    return Math.round((this._typingTimestamps.length / window) * 60000); // chars per minute
  }

  _getContinuousWorkMinutes() {
    if (!this._workStartTime) return 0;
    return Math.floor((Date.now() - this._workStartTime) / 60000);
  }

  // --- V1.5: Speed Baseline Tracking ---

  async _loadBaseline() {
    try {
      const saved = await window.electronAPI.getStore('typingSpeedBaseline');
      if (saved) {
        this._speedBaseline = saved.baseline || 0;
        this._speedSamples = saved.samples || [];
        // Prune old samples (keep 7 days)
        const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        this._speedSamples = this._speedSamples.filter(s => s.timestamp > weekAgo);
      }
    } catch {}
  }

  _recordSpeedSample(speed) {
    if (speed <= 0) return;

    this._speedSamples.push({ speed, timestamp: Date.now() });

    // Prune to 7 days, max 500 samples
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    this._speedSamples = this._speedSamples.filter(s => s.timestamp > weekAgo);
    if (this._speedSamples.length > 500) {
      this._speedSamples = this._speedSamples.slice(-500);
    }

    // Recalculate baseline every 5 minutes
    if (Date.now() - this._lastBaselineUpdate > 5 * 60 * 1000) {
      this._lastBaselineUpdate = Date.now();
      if (this._speedSamples.length >= 10) {
        const sum = this._speedSamples.reduce((a, s) => a + s.speed, 0);
        this._speedBaseline = Math.round(sum / this._speedSamples.length);

        // Persist
        window.electronAPI.setStore('typingSpeedBaseline', {
          baseline: this._speedBaseline,
          samples: this._speedSamples.slice(-200) // keep last 200 for persistence
        }).catch(() => {});
      }
    }
  }

  // --- V1.5: Typing Rhythm Analysis ---

  _analyzeTypingRhythm() {
    if (this._totalKeyCount < 10 || this._speedBaseline === 0) return;

    const currentSpeed = this._getTypingSpeed();
    const deleteRatio = this._deleteCount / this._totalKeyCount;
    const speedDelta = this._speedBaseline > 0
      ? (currentSpeed - this._speedBaseline) / this._speedBaseline
      : 0;

    let pattern = null;

    // Frustrated/stuck: speed drops >50% + frequent deletes
    if (speedDelta < -0.5 && deleteRatio > 0.15) {
      pattern = 'frustrated';
    }
    // Rushing/angry typing: speed >200% of baseline, sustained
    else if (speedDelta > 1.0 && this._totalKeyCount > 30) {
      pattern = 'rushing';
    }
    // Steady & efficient: speed within ±10% of baseline, sustained
    else if (Math.abs(speedDelta) < 0.1 && this._getContinuousWorkMinutes() >= 20) {
      pattern = 'steady';
    }

    if (pattern) {
      this._emit('typing-rhythm-change', {
        pattern,
        speedDelta,
        currentSpeed,
        baseline: this._speedBaseline,
        deleteRatio
      });
    }
  }

  // --- V1.5: Work Phase Detection ---

  _checkWorkPhase(forcedPhase) {
    if (forcedPhase) {
      this._emit('work-phase', { phase: forcedPhase });
      return;
    }

    const hour = new Date().getHours();
    const speed = this._getTypingSpeed();
    const speedDelta = this._speedBaseline > 0
      ? (speed - this._speedBaseline) / this._speedBaseline
      : 0;

    let phase = null;

    // Afternoon slump: 13:00-14:30, speed below baseline
    if (hour >= 13 && hour < 15 && speedDelta < -0.3) {
      phase = 'afternoon-slump';
    }

    if (phase) {
      this._emit('work-phase', { phase, hour, speedDelta });
    }
  }

  // --- V1.5: Clipboard Signal ---

  _onClipboardUpdate(item) {
    if (!item || !item.text) return;

    const text = item.text.trim();
    if (!text) return;

    // Classify content
    let type = 'text';
    if (/https?:\/\//.test(text)) {
      type = 'url';
    } else if (/\b(function|class|const|let|var|import|export|=>|async|def |fn |pub )\b/.test(text) || /[{}\[\]();]/.test(text)) {
      type = 'code';
    }

    // Check for repeat
    const hash = this._simpleHash(text);
    if (!this._clipboardRepeatMap[hash]) {
      this._clipboardRepeatMap[hash] = { count: 0, firstSeen: Date.now() };
    }
    this._clipboardRepeatMap[hash].count++;

    // Clean old entries (older than 30 min)
    const thirtyMinAgo = Date.now() - 30 * 60 * 1000;
    for (const key of Object.keys(this._clipboardRepeatMap)) {
      if (this._clipboardRepeatMap[key].firstSeen < thirtyMinAgo) {
        delete this._clipboardRepeatMap[key];
      }
    }

    const isRepeat = this._clipboardRepeatMap[hash]?.count >= 3;

    this._emit('clipboard-content', {
      type,
      length: text.length,
      isRepeat,
      repeatCount: this._clipboardRepeatMap[hash]?.count || 1,
      text: text.substring(0, 100) // truncate for safety
    });

    this._lastClipboardContent = text;
  }

  _simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < Math.min(str.length, 200); i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return hash.toString(36);
  }

  // --- Periodic Checks ---
  _periodicCheck() {
    const now = new Date();
    const hour = now.getHours();
    const minutes = now.getMinutes();

    // Continuous work signal
    const workMinutes = this._getContinuousWorkMinutes();
    if (workMinutes > 0 && workMinutes % 30 === 0) {
      this._emit('long-work', { continuousWorkMinutes: workMinutes });
    }

    // Hourly trigger (within first minute of each hour)
    if (hour !== this._lastHourCheck && minutes < 2) {
      this._lastHourCheck = hour;
      this._emit('time-trigger', { hour, type: this._getTimePeriod(hour) });
    }

    // Periodic trigger (every 30s, for scenes with short cooldowns like todo-detect)
    this._emit('periodic', { hour, minutes });

    // Idle detection
    if (this._affectionSystem) {
      const idleMs = Date.now() - this._affectionSystem._lastInteractionTime;
      const idleMinutes = Math.floor(idleMs / 60000);
      if (idleMinutes >= 30) {
        this._emit('idle', { idleMinutes });
      }
      // V1.5: Short idle (5-15 min) — for idle-chat scenes
      if (idleMinutes >= 5 && idleMinutes < 30) {
        this._emit('short-idle', { idleMinutes });
      }
    }

    // V1.5: Work phase check
    this._checkWorkPhase();
  }

  _getTimePeriod(hour) {
    if (hour >= 6 && hour < 9) return 'morning';
    if (hour >= 12 && hour < 13) return 'lunch';
    if (hour >= 17 && hour < 19) return 'evening';
    if (hour >= 22 || hour < 6) return 'late-night';
    return 'work';
  }

  // --- Public Accessors ---
  get isTyping() { return this._isTyping; }
  get typingSpeed() { return this._getTypingSpeed(); }
  get continuousWorkMinutes() { return this._getContinuousWorkMinutes(); }
  get speedBaseline() { return this._speedBaseline; }

  /** Reset work timer (e.g., after a break or pomodoro) */
  resetWorkTimer() {
    this._workStartTime = Date.now();
  }
}
