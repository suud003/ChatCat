/**
 * TriggerBus — Central AI trigger coordinator for Main process.
 *
 * All AI calls flow through the TriggerBus:
 *   1. submit(trigger) → queued with correlationId
 *   2. Priority queue drains up to N concurrent calls
 *   3. Results cached & pushed to Renderer via IPC events
 *
 * Supports:
 *   - Priority levels: HIGH (chat), NORMAL (skill/QP), LOW (proactive)
 *   - Concurrency limit (default N=3)
 *   - Streaming via onChunk → webContents.send('trigger-chunk')
 *   - Non-streaming via run() → webContents.send('trigger-completed')
 *   - Correlation IDs for end-to-end tracing
 */

'use strict';

const { EventEmitter } = require('events');
const { AITrigger } = require('./trigger');
const { SceneRegistry } = require('./scene-registry');

// ─── Constants ───────────────────────────────────────────────────────────

const PRIORITIES = { HIGH: 0, NORMAL: 1, LOW: 2 };
const PRIORITY_NAMES = { 0: 'HIGH', 1: 'NORMAL', 2: 'LOW' };

const STATUS = {
  QUEUED: 'queued',
  RUNNING: 'running',
  COMPLETED: 'completed',
  ERROR: 'error',
  CANCELLED: 'cancelled',
};

const DEFAULT_MAX_CONCURRENT = 3;
const RESULT_TTL_MS = 5 * 60 * 1000; // 5 minutes — auto-cleanup stale results
const RESULT_CLEANUP_INTERVAL_MS = 60 * 1000; // sweep every 60s

let _correlationCounter = 0;

function _generateCorrelationId() {
  return `cor_${Date.now().toString(36)}_${(++_correlationCounter).toString(36)}`;
}

// ─── TriggerBus ──────────────────────────────────────────────────────────

class TriggerBus extends EventEmitter {
  /**
   * @param {import('./runtime').AIRuntime} aiRuntime
   * @param {Object} [options]
   * @param {number} [options.maxConcurrent=3]  - Max simultaneous AI calls
   * @param {Electron.WebContents} [options.webContents] - For IPC push to Renderer
   */
  constructor(aiRuntime, options = {}) {
    super();
    this._aiRuntime = aiRuntime;
    this._maxConcurrent = options.maxConcurrent || DEFAULT_MAX_CONCURRENT;
    this._webContents = options.webContents || null;

    /** @type {Array<QueueEntry>} Priority-sorted queue */
    this._queue = [];

    /** @type {Map<string, QueueEntry>} correlationId → entry (all states) */
    this._entries = new Map();

    /** @type {number} Currently running AI calls */
    this._activeCount = 0;

    /** @type {boolean} Whether the bus is processing */
    this._running = false;

    /** @type {NodeJS.Timeout|null} Result cleanup timer */
    this._cleanupTimer = null;
  }

  // ─── Configuration ───────────────────────────────────────────────

  /**
   * Set the webContents for IPC push events.
   * Called after BrowserWindow is created.
   *
   * @param {Electron.WebContents} webContents
   */
  setWebContents(webContents) {
    this._webContents = webContents;
  }

  // ─── Public API ──────────────────────────────────────────────────

  /**
   * Submit a trigger for execution.
   *
   * @param {Object} trigger - AITrigger object
   * @param {Object} [options]
   * @param {'HIGH'|'NORMAL'|'LOW'} [options.priority='NORMAL']
   * @returns {{ correlationId: string, triggerId: string }}
   */
  submit(trigger, options = {}) {
    AITrigger.validate(trigger);

    // Verify scene exists
    SceneRegistry.getSceneOrThrow(trigger.sceneId);

    const correlationId = _generateCorrelationId();
    const priority = PRIORITIES[options.priority] ?? PRIORITIES.NORMAL;

    const entry = {
      correlationId,
      trigger,
      priority,
      status: STATUS.QUEUED,
      result: null,
      error: null,
      createdAt: Date.now(),
      startedAt: null,
      completedAt: null,
    };

    this._entries.set(correlationId, entry);
    this._enqueue(entry);

    this.emit('trigger:queued', {
      correlationId,
      triggerId: trigger.id,
      sceneId: trigger.sceneId,
      type: trigger.type,
      priority: PRIORITY_NAMES[priority],
    });

    console.log(
      `[TriggerBus] Queued: ${AITrigger.describe(trigger)} ` +
      `corr=${correlationId} priority=${PRIORITY_NAMES[priority]} ` +
      `queue=${this._queue.length} active=${this._activeCount}`
    );

    // Kick queue processing (non-blocking)
    this._drainQueue();

    return { correlationId, triggerId: trigger.id };
  }

  /**
   * Get the result of a completed trigger.
   * If still running/queued, waits up to `timeout` ms.
   *
   * @param {string} correlationId
   * @param {number} [timeout=30000] - Max wait time in ms
   * @returns {Promise<{ status: string, result: string|null, error: string|null }>}
   */
  async getResult(correlationId, timeout = 30000) {
    const entry = this._entries.get(correlationId);
    if (!entry) {
      return { status: 'not_found', result: null, error: 'Unknown correlationId' };
    }

    // Already done
    if (entry.status === STATUS.COMPLETED || entry.status === STATUS.ERROR || entry.status === STATUS.CANCELLED) {
      return { status: entry.status, result: entry.result, error: entry.error };
    }

    // Wait for completion
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        cleanup();
        resolve({ status: 'timeout', result: null, error: `Timed out after ${timeout}ms` });
      }, timeout);

      const onComplete = (event) => {
        if (event.correlationId === correlationId) {
          cleanup();
          resolve({ status: entry.status, result: entry.result, error: entry.error });
        }
      };

      const onError = (event) => {
        if (event.correlationId === correlationId) {
          cleanup();
          resolve({ status: entry.status, result: null, error: entry.error });
        }
      };

      const cleanup = () => {
        clearTimeout(timer);
        this.removeListener('trigger:completed', onComplete);
        this.removeListener('trigger:error', onError);
      };

      this.on('trigger:completed', onComplete);
      this.on('trigger:error', onError);
    });
  }

  /**
   * Get the current status of a trigger.
   *
   * @param {string} correlationId
   * @returns {{ status: string, queuePosition: number|null, priority: string|null }}
   */
  getStatus(correlationId) {
    const entry = this._entries.get(correlationId);
    if (!entry) {
      return { status: 'not_found', queuePosition: null, priority: null };
    }

    let queuePosition = null;
    if (entry.status === STATUS.QUEUED) {
      queuePosition = this._queue.findIndex(e => e.correlationId === correlationId);
      if (queuePosition === -1) queuePosition = null;
    }

    return {
      status: entry.status,
      queuePosition,
      priority: PRIORITY_NAMES[entry.priority] || null,
    };
  }

  /**
   * Cancel a queued (not yet running) trigger.
   *
   * @param {string} correlationId
   * @returns {boolean} true if cancelled, false if already running/completed
   */
  cancel(correlationId) {
    const entry = this._entries.get(correlationId);
    if (!entry) return false;

    if (entry.status !== STATUS.QUEUED) {
      console.log(`[TriggerBus] Cannot cancel ${correlationId}: status=${entry.status}`);
      return false;
    }

    entry.status = STATUS.CANCELLED;
    entry.completedAt = Date.now();

    // Remove from queue
    const idx = this._queue.findIndex(e => e.correlationId === correlationId);
    if (idx !== -1) {
      this._queue.splice(idx, 1);
    }

    this.emit('trigger:cancelled', { correlationId });
    console.log(`[TriggerBus] Cancelled: ${correlationId}`);
    return true;
  }

  /**
   * Start the TriggerBus (enable processing + result cleanup).
   */
  start() {
    if (this._running) return;
    this._running = true;

    // Periodic cleanup of stale results
    this._cleanupTimer = setInterval(() => this._cleanupStaleResults(), RESULT_CLEANUP_INTERVAL_MS);

    console.log(`[TriggerBus] Started (maxConcurrent=${this._maxConcurrent})`);
  }

  /**
   * Stop the TriggerBus (halt processing, clear timers).
   */
  stop() {
    this._running = false;
    if (this._cleanupTimer) {
      clearInterval(this._cleanupTimer);
      this._cleanupTimer = null;
    }
    console.log('[TriggerBus] Stopped');
  }

  /**
   * Get bus statistics.
   *
   * @returns {{ queued: number, active: number, total: number, maxConcurrent: number }}
   */
  stats() {
    return {
      queued: this._queue.length,
      active: this._activeCount,
      total: this._entries.size,
      maxConcurrent: this._maxConcurrent,
    };
  }

  // ─── Internal: Queue Management ──────────────────────────────────

  /**
   * Insert entry into priority queue (sorted by priority, then createdAt).
   */
  _enqueue(entry) {
    // Binary insertion to maintain sorted order
    let lo = 0;
    let hi = this._queue.length;

    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      const cmp = this._queue[mid];
      if (cmp.priority < entry.priority ||
          (cmp.priority === entry.priority && cmp.createdAt <= entry.createdAt)) {
        lo = mid + 1;
      } else {
        hi = mid;
      }
    }

    this._queue.splice(lo, 0, entry);
  }

  /**
   * Drain the queue: start executing entries up to concurrency limit.
   */
  _drainQueue() {
    if (!this._running) return;

    while (this._activeCount < this._maxConcurrent && this._queue.length > 0) {
      const entry = this._queue.shift();

      // Skip cancelled entries that are still in queue
      if (entry.status === STATUS.CANCELLED) continue;

      this._executeEntry(entry);
    }
  }

  /**
   * Execute a single queue entry.
   */
  async _executeEntry(entry) {
    this._activeCount++;
    entry.status = STATUS.RUNNING;
    entry.startedAt = Date.now();

    this.emit('trigger:started', {
      correlationId: entry.correlationId,
      triggerId: entry.trigger.id,
      sceneId: entry.trigger.sceneId,
    });

    this._sendToRenderer('trigger-started', {
      correlationId: entry.correlationId,
      sceneId: entry.trigger.sceneId,
    });

    try {
      const scene = SceneRegistry.getSceneOrThrow(entry.trigger.sceneId);
      const isStream = scene.outputMode === 'stream-text';

      let result;

      if (scene.prompt.mode === 'vision') {
        // Vision execution
        result = await this._aiRuntime.vision(entry.trigger);
      } else if (isStream) {
        // Streaming execution — push chunks via IPC
        result = await this._aiRuntime.runStream(entry.trigger, (chunk) => {
          this._sendToRenderer('trigger-chunk', {
            correlationId: entry.correlationId,
            chunk,
          });
          this.emit('trigger:chunk', {
            correlationId: entry.correlationId,
            chunk,
          });
        });
      } else {
        // Non-streaming execution
        result = await this._aiRuntime.run(entry.trigger);
      }

      entry.status = STATUS.COMPLETED;
      entry.result = result;
      entry.completedAt = Date.now();

      const elapsed = entry.completedAt - entry.startedAt;

      this.emit('trigger:completed', {
        correlationId: entry.correlationId,
        triggerId: entry.trigger.id,
        sceneId: entry.trigger.sceneId,
        result,
        elapsed,
      });

      this._sendToRenderer('trigger-completed', {
        correlationId: entry.correlationId,
        result,
        elapsed,
      });

      console.log(
        `[TriggerBus] Completed: ${AITrigger.describe(entry.trigger)} ` +
        `corr=${entry.correlationId} elapsed=${elapsed}ms`
      );
    } catch (err) {
      entry.status = STATUS.ERROR;
      entry.error = err.message || String(err);
      entry.completedAt = Date.now();

      this.emit('trigger:error', {
        correlationId: entry.correlationId,
        triggerId: entry.trigger.id,
        error: entry.error,
      });

      this._sendToRenderer('trigger-error', {
        correlationId: entry.correlationId,
        error: entry.error,
      });

      console.error(
        `[TriggerBus] Error: ${AITrigger.describe(entry.trigger)} ` +
        `corr=${entry.correlationId} err=${entry.error}`
      );
    } finally {
      this._activeCount--;
      // Continue draining
      this._drainQueue();
    }
  }

  // ─── Internal: IPC Push ──────────────────────────────────────────

  /**
   * Send an event to Renderer via webContents.
   * Silently skips if webContents is not set or destroyed.
   *
   * @param {string} channel
   * @param {Object} data
   */
  _sendToRenderer(channel, data) {
    if (!this._webContents || this._webContents.isDestroyed()) return;
    try {
      this._webContents.send(channel, data);
    } catch (err) {
      // webContents may be destroyed between check and send
      console.warn(`[TriggerBus] Failed to send to renderer: ${err.message}`);
    }
  }

  // ─── Internal: Cleanup ───────────────────────────────────────────

  /**
   * Remove stale completed/error results older than RESULT_TTL_MS.
   */
  _cleanupStaleResults() {
    const now = Date.now();
    let cleaned = 0;

    for (const [id, entry] of this._entries) {
      if (
        (entry.status === STATUS.COMPLETED || entry.status === STATUS.ERROR || entry.status === STATUS.CANCELLED) &&
        entry.completedAt && (now - entry.completedAt > RESULT_TTL_MS)
      ) {
        this._entries.delete(id);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`[TriggerBus] Cleaned ${cleaned} stale results, remaining=${this._entries.size}`);
    }
  }
}

module.exports = { TriggerBus, PRIORITIES, PRIORITY_NAMES, STATUS };
