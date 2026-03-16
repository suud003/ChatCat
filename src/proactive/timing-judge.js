/**
 * Timing Judge - Determines when it's appropriate to push notifications
 *
 * Checks forbidden conditions, detects optimal timing,
 * and manages a priority-based delay queue.
 */

export class TimingJudge {
  constructor() {
    this._pomodoroActive = false;
    this._doNotDisturb = false;
    this._lastPushTime = 0;
    this._minPushIntervalMs = 5 * 60 * 1000; // 5 minutes between pushes
    this._queue = [];        // { notification, priority, timestamp }
    this._maxQueueSize = 3;
    this._signalCollector = null;
    this._flushTimer = null;
  }

  init(signalCollector) {
    this._signalCollector = signalCollector;

    // Auto-flush queue every 60 seconds
    this._flushTimer = setInterval(() => this._tryFlush(), 60000);
  }

  destroy() {
    if (this._flushTimer) clearInterval(this._flushTimer);
  }

  /**
   * Check if it's OK to push a notification right now.
   */
  canPush() {
    // Hard blocks
    if (this._doNotDisturb) return false;
    if (this._pomodoroActive) return false;

    // Currently typing rapidly (< 3s gap)
    if (this._signalCollector && this._signalCollector.isTyping) return false;

    // Too soon since last push
    if (Date.now() - this._lastPushTime < this._minPushIntervalMs) return false;

    // Check quiet hours
    const hour = new Date().getHours();
    if (this._quietStart !== undefined && this._quietEnd !== undefined) {
      if (this._quietStart > this._quietEnd) {
        // Wraps midnight, e.g., 23-7
        if (hour >= this._quietStart || hour < this._quietEnd) return false;
      } else {
        if (hour >= this._quietStart && hour < this._quietEnd) return false;
      }
    }

    return true;
  }

  /**
   * Check if current moment is an optimal time for interaction.
   */
  isOptimalTime() {
    if (!this._signalCollector) return false;
    // Just paused typing (> 15s)
    return !this._signalCollector.isTyping;
  }

  /**
   * Enqueue a notification for later delivery.
   * Returns true if immediately pushable, false if queued.
   */
  enqueue(notification) {
    if (this.canPush()) {
      this._lastPushTime = Date.now();
      return { immediate: true, notification };
    }

    // Add to priority queue
    this._queue.push({
      notification,
      priority: this._getPriority(notification.level),
      timestamp: Date.now()
    });

    // Sort by priority descending
    this._queue.sort((a, b) => b.priority - a.priority);

    // Trim excess
    if (this._queue.length > this._maxQueueSize) {
      this._queue.length = this._maxQueueSize;
    }

    return { immediate: false, queued: true };
  }

  /**
   * Try to flush the highest-priority queued notification.
   */
  flush() {
    if (this._queue.length === 0) return null;
    if (!this.canPush()) return null;

    const item = this._queue.shift();
    this._lastPushTime = Date.now();
    return item.notification;
  }

  setPomodoroActive(active) {
    this._pomodoroActive = active;
  }

  setDoNotDisturb(dnd) {
    this._doNotDisturb = dnd;
  }

  setQuietHours(start, end) {
    this._quietStart = start;
    this._quietEnd = end;
  }

  setMinPushInterval(ms) {
    this._minPushIntervalMs = ms;
  }

  _getPriority(level) {
    const priorities = { L0: 0, L1: 1, L2: 2, L3: 3 };
    return priorities[level] || 0;
  }

  _tryFlush() {
    // Attempt to deliver queued notifications when conditions allow
    if (this._queue.length > 0 && this.canPush()) {
      const item = this._queue.shift();
      this._lastPushTime = Date.now();
      if (this._onFlush) {
        this._onFlush(item.notification);
      }
    }
  }

  /** Set callback for queue auto-flush delivery */
  set onFlush(fn) {
    this._onFlush = fn;
  }
}
