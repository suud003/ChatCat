/**
 * TriggerBusRenderer — Renderer-side adapter for TriggerBus (ESM).
 *
 * Communicates with Main process TriggerBus via IPC:
 *   - submit()           → IPC 'trigger-bus-submit'
 *   - getResult()        → IPC 'trigger-bus-get-result'
 *   - subscribeToUpdates → IPC events 'trigger-chunk', 'trigger-completed', etc.
 *
 * Used by AIService (chat streaming), SkillScheduler, ProactiveEngine.
 */

export class TriggerBusRenderer {
  constructor() {
    /** @type {Map<string, Set<Function>>} correlationId → subscribers */
    this._subscribers = new Map();

    /** @type {Map<string, { resolve: Function, timer?: NodeJS.Timeout }>} */
    this._waiters = new Map();

    /** @type {boolean} */
    this._initialized = false;
  }

  /**
   * Initialize IPC event listeners.
   * Must be called once after construction.
   */
  init() {
    if (this._initialized) return;

    // Listen for streaming chunks from Main TriggerBus
    window.electronAPI.onTriggerChunk((data) => {
      this._notifySubscribers(data.correlationId, { type: 'chunk', data: data.chunk });
    });

    // Listen for completion
    window.electronAPI.onTriggerCompleted((data) => {
      this._notifySubscribers(data.correlationId, { type: 'completed', data: data.result, elapsed: data.elapsed });
      this._resolveWaiter(data.correlationId, { status: 'completed', result: data.result, error: null });
      // Auto-cleanup subscribers on completion
      this._subscribers.delete(data.correlationId);
    });

    // Listen for errors
    window.electronAPI.onTriggerError((data) => {
      this._notifySubscribers(data.correlationId, { type: 'error', error: data.error });
      this._resolveWaiter(data.correlationId, { status: 'error', result: null, error: data.error });
      this._subscribers.delete(data.correlationId);
    });

    // Listen for started
    window.electronAPI.onTriggerStarted((data) => {
      this._notifySubscribers(data.correlationId, { type: 'started', sceneId: data.sceneId });
    });

    this._initialized = true;
    console.log('[TriggerBusRenderer] Initialized');
  }

  // ─── Public API ──────────────────────────────────────────────────

  /**
   * Submit a trigger to TriggerBus via IPC.
   *
   * @param {Object} trigger - AITrigger-like object { type, sceneId, payload }
   * @param {Object} [options]
   * @param {'HIGH'|'NORMAL'|'LOW'} [options.priority='NORMAL']
   * @returns {Promise<{ correlationId: string, triggerId: string }>}
   */
  async submit(trigger, options = {}) {
    return window.electronAPI.triggerBusSubmit({
      type: trigger.type,
      sceneId: trigger.sceneId,
      payload: trigger.payload,
    }, options);
  }

  /**
   * Wait for a trigger result (polling + IPC event).
   *
   * @param {string} correlationId
   * @param {number} [timeout=30000]
   * @returns {Promise<{ status: string, result: string|null, error: string|null }>}
   */
  async waitForResult(correlationId, timeout = 30000) {
    // Check if already completed via IPC
    try {
      const status = await window.electronAPI.triggerBusGetStatus(correlationId);
      if (status.status === 'completed' || status.status === 'error' || status.status === 'cancelled') {
        const result = await window.electronAPI.triggerBusGetResult(correlationId);
        return result;
      }
    } catch { /* continue to wait */ }

    // Wait for IPC event
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this._waiters.delete(correlationId);
        resolve({ status: 'timeout', result: null, error: `Timed out after ${timeout}ms` });
      }, timeout);

      this._waiters.set(correlationId, { resolve, timer });
    });
  }

  /**
   * Subscribe to real-time updates for a correlationId.
   *
   * @param {string} correlationId
   * @param {Function} callback - (event) => void, where event.type = 'started'|'chunk'|'completed'|'error'
   * @returns {Function} unsubscribe function
   */
  subscribeToUpdates(correlationId, callback) {
    if (!this._subscribers.has(correlationId)) {
      this._subscribers.set(correlationId, new Set());
    }
    this._subscribers.get(correlationId).add(callback);

    // Return unsubscribe function
    return () => {
      const subs = this._subscribers.get(correlationId);
      if (subs) {
        subs.delete(callback);
        if (subs.size === 0) {
          this._subscribers.delete(correlationId);
        }
      }
    };
  }

  /**
   * Convenience: submit + waitForResult.
   *
   * @param {Object} trigger
   * @param {Object} [options]
   * @returns {Promise<{ status: string, result: string|null, error: string|null }>}
   */
  async submitAndWait(trigger, options = {}) {
    const { correlationId } = await this.submit(trigger, options);
    return this.waitForResult(correlationId);
  }

  /**
   * Convenience: submit + stream chunks via async generator.
   * Used for chat streaming.
   *
   * @param {Object} trigger
   * @param {Object} [options]
   * @yields {string} chunks
   * @returns {AsyncGenerator<string, string>} returns full result
   */
  async *submitAndStream(trigger, options = {}) {
    const { correlationId } = await this.submit(trigger, options);

    let fullResult = '';
    let done = false;
    let error = null;

    // Chunk buffer for async generator consumption
    const chunks = [];
    let resolveChunk = null;

    const unsubscribe = this.subscribeToUpdates(correlationId, (event) => {
      if (event.type === 'chunk') {
        chunks.push(event.data);
        fullResult += event.data;
        if (resolveChunk) {
          resolveChunk();
          resolveChunk = null;
        }
      } else if (event.type === 'completed') {
        done = true;
        if (typeof event.data === 'string' && event.data.length > fullResult.length) {
          fullResult = event.data;
        }
        if (resolveChunk) {
          resolveChunk();
          resolveChunk = null;
        }
      } else if (event.type === 'error') {
        done = true;
        error = event.error;
        if (resolveChunk) {
          resolveChunk();
          resolveChunk = null;
        }
      }
    });

    try {
      while (!done) {
        if (chunks.length > 0) {
          yield chunks.shift();
        } else {
          // Wait for next chunk or completion
          await new Promise((resolve) => {
            resolveChunk = resolve;
          });
          // Yield any remaining chunks
          while (chunks.length > 0) {
            yield chunks.shift();
          }
        }
      }

      // Yield any final chunks
      while (chunks.length > 0) {
        yield chunks.shift();
      }

      if (error) {
        throw new Error(error);
      }

      return fullResult;
    } finally {
      unsubscribe();
    }
  }

  // ─── Internal ────────────────────────────────────────────────────

  _notifySubscribers(correlationId, event) {
    const subs = this._subscribers.get(correlationId);
    if (!subs) return;

    for (const callback of subs) {
      try {
        callback(event);
      } catch (err) {
        console.error(`[TriggerBusRenderer] Subscriber error for ${correlationId}:`, err);
      }
    }
  }

  _resolveWaiter(correlationId, result) {
    const waiter = this._waiters.get(correlationId);
    if (!waiter) return;

    if (waiter.timer) clearTimeout(waiter.timer);
    waiter.resolve(result);
    this._waiters.delete(correlationId);
  }
}
