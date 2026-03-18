export class MouseSignalCollector {
  constructor() {
    this._snapshotIntervalMs = 30000;
    this._stillThresholdMs = 60000;
    this._activeWindowMs = 5000;
    
    this._clickTimestamps = [];
    this._lastClickTime = 0;
    
    this._lastPosition = null;
    this._moveDistanceAccum = 0;
    this._moveSegments = [];
    
    this._currentSnapshot = null;
    this._listeners = {};
  }

  init() {
    this._removeGlobalClick = window.electronAPI.onGlobalClick((data) => this._onClick(data));
    this._removeGlobalMousemove = window.electronAPI.onGlobalMousemove((data) => this._onMousemove(data));
    this._timer = setInterval(() => this._emitSnapshot(), this._snapshotIntervalMs);
  }
  
  destroy() {
    if (this._timer) clearInterval(this._timer);
    if (typeof this._removeGlobalClick === 'function') {
      this._removeGlobalClick();
      this._removeGlobalClick = null;
    }
    if (typeof this._removeGlobalMousemove === 'function') {
      this._removeGlobalMousemove();
      this._removeGlobalMousemove = null;
    }
  }

  _onClick(data) {
    const now = Date.now();
    this._clickTimestamps.push(now);
    this._lastClickTime = now;
    
    const cutoff = now - 30000;
    this._clickTimestamps = this._clickTimestamps.filter(t => t > cutoff);
  }

  _onMousemove(data) {
    const now = Date.now();
    const { x, y } = data;
    
    if (this._lastPosition) {
      const dx = x - this._lastPosition.x;
      const dy = y - this._lastPosition.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const dt = now - this._lastPosition.time;
      
      if (distance >= 2 && dt >= 10) {
        this._moveDistanceAccum += distance;
        this._moveSegments.push({ distance, duration: dt });
      }
    }
    this._lastPosition = { x, y, time: now };
  }

  _emitSnapshot() {
    const now = Date.now();
    
    const recentClicks = this._clickTimestamps.filter(t => t > now - 30000);
    const clicksPerMin = recentClicks.length * 2;
    
    const totalDuration = this._moveSegments.reduce((sum, s) => sum + s.duration, 0);
    const moveSpeed = totalDuration > 0 
      ? (this._moveDistanceAccum / totalDuration) * 1000
      : 0;
    
    const lastActivity = Math.max(this._lastClickTime, this._lastPosition?.time || 0);
    const isStill = (now - lastActivity) > this._stillThresholdMs;
    
    const snapshot = {
      clicksPerMin,
      moveDistance: Math.round(this._moveDistanceAccum),
      moveSpeed: Math.round(moveSpeed * 10) / 10,
      isStill,
      timestamp: now
    };
    
    this._currentSnapshot = snapshot;
    this._emit('mouse-snapshot', snapshot);
    
    this._moveDistanceAccum = 0;
    this._moveSegments = [];
  }

  get snapshot() { return this._currentSnapshot; }
  get lastActivityTime() { return Math.max(this._lastClickTime, this._lastPosition?.time || 0); }
  get isActiveNow() { return (Date.now() - this.lastActivityTime) <= this._activeWindowMs; }
  get isStill() { return this._currentSnapshot?.isStill ?? true; }
  get clicksPerMin() { return this._currentSnapshot?.clicksPerMin ?? 0; }

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
