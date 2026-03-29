/**
 * ScheduledTriggerRegistry — Centralized timer management for Main process.
 *
 * Replaces scattered setInterval() calls in SkillScheduler (Renderer)
 * with a unified, queryable registry in Main process.
 *
 * Supports:
 *   - Cron mode: execute once per day at a specific hour
 *   - Interval mode: execute every N minutes
 *   - Enable/disable without unregister
 *   - List all schedules with next-run info
 *   - Execute-now for manual trigger
 *
 * All executions go through TriggerBus.submit().
 */

'use strict';

const { AITrigger } = require('./trigger');

// ─── Constants ───────────────────────────────────────────────────────────

const CRON_CHECK_INTERVAL_MS = 60 * 1000; // Check cron triggers every 60s

// ─── ScheduledTriggerRegistry ────────────────────────────────────────────

class ScheduledTriggerRegistry {
  /**
   * @param {import('./trigger-bus').TriggerBus} triggerBus
   * @param {Object} [options]
   * @param {import('electron-store')} [options.store] - For dedup (cron ran today)
   */
  constructor(triggerBus, options = {}) {
    this._triggerBus = triggerBus;
    this._store = options.store || null;

    /** @type {Map<string, ScheduleEntry>} */
    this._schedules = new Map();

    /** @type {NodeJS.Timeout|null} Cron check timer */
    this._cronTimer = null;

    /** @type {boolean} */
    this._running = false;
  }

  // ─── Public API ──────────────────────────────────────────────────

  /**
   * Register a scheduled trigger.
   *
   * @param {string} scheduleId - Unique ID (e.g. 'skill-daily-report')
   * @param {Function} triggerFactory - Function that returns a fresh AITrigger each execution
   * @param {Object} schedule
   * @param {number}  [schedule.cronHour]        - Hour (0-23) to execute daily
   * @param {number}  [schedule.intervalMinutes]  - Execute every N minutes
   * @param {boolean} [schedule.enabled=true]
   * @param {'HIGH'|'NORMAL'|'LOW'} [schedule.priority='NORMAL']
   */
  register(scheduleId, triggerFactory, schedule) {
    if (this._schedules.has(scheduleId)) {
      console.warn(`[ScheduledTriggerRegistry] Overwriting existing schedule: ${scheduleId}`);
      this.unregister(scheduleId);
    }

    if (typeof triggerFactory !== 'function') {
      throw new Error(`[ScheduledTriggerRegistry] triggerFactory must be a function for ${scheduleId}`);
    }

    if (schedule.cronHour === undefined && schedule.intervalMinutes === undefined) {
      throw new Error(`[ScheduledTriggerRegistry] Schedule "${scheduleId}" must have cronHour or intervalMinutes`);
    }

    const entry = {
      scheduleId,
      triggerFactory,
      schedule: {
        cronHour: schedule.cronHour,
        intervalMinutes: schedule.intervalMinutes,
        enabled: schedule.enabled !== false,
        priority: schedule.priority || 'NORMAL',
      },
      intervalTimer: null,
      lastRunAt: null,
      runCount: 0,
    };

    this._schedules.set(scheduleId, entry);

    // If already running, start the interval timer immediately
    if (this._running && entry.schedule.enabled && entry.schedule.intervalMinutes) {
      this._startIntervalTimer(entry);
    }

    console.log(
      `[ScheduledTriggerRegistry] Registered: ${scheduleId} ` +
      `${schedule.cronHour !== undefined ? `cronHour=${schedule.cronHour}` : ''} ` +
      `${schedule.intervalMinutes ? `interval=${schedule.intervalMinutes}min` : ''} ` +
      `enabled=${entry.schedule.enabled}`
    );
  }

  /**
   * Unregister a scheduled trigger and stop its timer.
   *
   * @param {string} scheduleId
   */
  unregister(scheduleId) {
    const entry = this._schedules.get(scheduleId);
    if (!entry) return;

    if (entry.intervalTimer) {
      clearInterval(entry.intervalTimer);
      entry.intervalTimer = null;
    }

    this._schedules.delete(scheduleId);
    console.log(`[ScheduledTriggerRegistry] Unregistered: ${scheduleId}`);
  }

  /**
   * List all registered schedules.
   *
   * @returns {Array<{ scheduleId: string, schedule: Object, lastRunAt: number|null, runCount: number }>}
   */
  list() {
    const result = [];
    for (const [id, entry] of this._schedules) {
      result.push({
        scheduleId: id,
        schedule: { ...entry.schedule },
        lastRunAt: entry.lastRunAt,
        runCount: entry.runCount,
      });
    }
    return result;
  }

  /**
   * Execute a schedule immediately (bypass timing).
   *
   * @param {string} scheduleId
   * @returns {Promise<{ correlationId: string }|null>} null if not found or disabled
   */
  async executeNow(scheduleId) {
    const entry = this._schedules.get(scheduleId);
    if (!entry) {
      console.warn(`[ScheduledTriggerRegistry] executeNow: unknown scheduleId=${scheduleId}`);
      return null;
    }

    return this._executeTrigger(entry);
  }

  /**
   * Enable a schedule.
   *
   * @param {string} scheduleId
   */
  enable(scheduleId) {
    const entry = this._schedules.get(scheduleId);
    if (!entry) return;

    entry.schedule.enabled = true;

    // Start interval timer if running
    if (this._running && entry.schedule.intervalMinutes && !entry.intervalTimer) {
      this._startIntervalTimer(entry);
    }

    console.log(`[ScheduledTriggerRegistry] Enabled: ${scheduleId}`);
  }

  /**
   * Disable a schedule (stop its timer but keep registration).
   *
   * @param {string} scheduleId
   */
  disable(scheduleId) {
    const entry = this._schedules.get(scheduleId);
    if (!entry) return;

    entry.schedule.enabled = false;

    // Stop interval timer
    if (entry.intervalTimer) {
      clearInterval(entry.intervalTimer);
      entry.intervalTimer = null;
    }

    console.log(`[ScheduledTriggerRegistry] Disabled: ${scheduleId}`);
  }

  /**
   * Start all enabled schedules.
   */
  start() {
    if (this._running) return;
    this._running = true;

    // Start cron checker (every 60s, checks all cron-based schedules)
    this._cronTimer = setInterval(() => this._checkCronSchedules(), CRON_CHECK_INTERVAL_MS);

    // Start interval timers for all enabled interval schedules
    for (const entry of this._schedules.values()) {
      if (entry.schedule.enabled && entry.schedule.intervalMinutes && !entry.intervalTimer) {
        this._startIntervalTimer(entry);
      }
    }

    console.log(`[ScheduledTriggerRegistry] Started with ${this._schedules.size} schedules`);
  }

  /**
   * Stop all schedules and clear timers.
   */
  stop() {
    this._running = false;

    if (this._cronTimer) {
      clearInterval(this._cronTimer);
      this._cronTimer = null;
    }

    for (const entry of this._schedules.values()) {
      if (entry.intervalTimer) {
        clearInterval(entry.intervalTimer);
        entry.intervalTimer = null;
      }
    }

    console.log('[ScheduledTriggerRegistry] Stopped');
  }

  /**
   * Get the count of registered schedules.
   */
  get size() {
    return this._schedules.size;
  }

  // ─── Internal: Cron Check ────────────────────────────────────────

  /**
   * Check all cron-based schedules. Called every 60 seconds.
   */
  async _checkCronSchedules() {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    for (const entry of this._schedules.values()) {
      if (!entry.schedule.enabled) continue;
      if (entry.schedule.cronHour === undefined) continue;

      // Only trigger if we're within the first 2 minutes of the target hour
      if (currentHour !== entry.schedule.cronHour || currentMinute >= 2) continue;

      // Dedup: check if already ran today
      const today = now.toISOString().split('T')[0];
      const dedupKey = `scheduled_${entry.scheduleId}_${today}`;

      if (this._store) {
        const alreadyRan = this._store.get(dedupKey);
        if (alreadyRan) continue;
        this._store.set(dedupKey, true);
      }

      console.log(`[ScheduledTriggerRegistry] Cron triggered: ${entry.scheduleId} at hour=${currentHour}`);
      this._executeTrigger(entry).catch(err => {
        console.error(`[ScheduledTriggerRegistry] Cron execution failed: ${entry.scheduleId}`, err);
      });
    }
  }

  // ─── Internal: Interval Timer ────────────────────────────────────

  /**
   * Start the interval timer for an entry.
   */
  _startIntervalTimer(entry) {
    if (entry.intervalTimer) return;

    const ms = entry.schedule.intervalMinutes * 60 * 1000;
    entry.intervalTimer = setInterval(() => {
      if (!entry.schedule.enabled) return;

      console.log(`[ScheduledTriggerRegistry] Interval triggered: ${entry.scheduleId}`);
      this._executeTrigger(entry).catch(err => {
        console.error(`[ScheduledTriggerRegistry] Interval execution failed: ${entry.scheduleId}`, err);
      });
    }, ms);
  }

  // ─── Internal: Execution ─────────────────────────────────────────

  /**
   * Execute a trigger via TriggerBus.
   *
   * @param {Object} entry - ScheduleEntry
   * @returns {Promise<{ correlationId: string }>}
   */
  async _executeTrigger(entry) {
    const trigger = entry.triggerFactory();
    AITrigger.validate(trigger);

    const { correlationId } = this._triggerBus.submit(trigger, {
      priority: entry.schedule.priority,
    });

    entry.lastRunAt = Date.now();
    entry.runCount++;

    console.log(
      `[ScheduledTriggerRegistry] Submitted: ${entry.scheduleId} ` +
      `corr=${correlationId} runCount=${entry.runCount}`
    );

    return { correlationId };
  }
}

module.exports = { ScheduledTriggerRegistry };
