/**
 * Skill Scheduler — Manages timed execution of Skills
 *
 * Legacy skills (textConverter, dailyReport, todoExtractor) remain for backward compat.
 * New SKILL.md-based skills with `schedule` config are loaded from registry via IPC.
 *
 * Runs in renderer process, communicates with main process via IPC.
 */

export class SkillScheduler {
  constructor() {
    this._skills = {};          // skillId -> { interval, timer, enabled, execute }
    this._running = {};         // skillId -> boolean
    this._onStatusChange = null;
    this._proactiveEngine = null;
    this._scheduledTimers = []; // timers for SKILL.md-based scheduled skills
  }

  async init(proactiveEngine) {
    this._proactiveEngine = proactiveEngine;

    // Load enabled states
    const enabled = await window.electronAPI.getStore('skillsEnabled') || {
      textConverter: true,
      dailyReport: true,
      todoExtractor: true
    };

    // Register legacy skills with their schedules
    this._skills = {
      textConverter: {
        interval: 10 * 60 * 1000,  // 10 minutes
        timer: null,
        enabled: enabled.textConverter !== false,
        execute: () => this._triggerSkill('textConverter')
      },
      dailyReport: {
        interval: 60 * 1000,       // Check every minute for daily trigger
        timer: null,
        enabled: enabled.dailyReport !== false,
        execute: () => this._checkDailyReport()
      },
      todoExtractor: {
        interval: 60 * 60 * 1000,  // 1 hour
        timer: null,
        enabled: enabled.todoExtractor !== false,
        execute: () => this._triggerSkill('todoExtractor')
      }
    };

    // Start enabled legacy skills
    for (const [id, skill] of Object.entries(this._skills)) {
      if (skill.enabled) {
        this._startSkill(id);
      }
    }

    // Load SKILL.md-based scheduled skills from registry
    await this._loadRegistrySchedules();
  }

  /**
   * Load scheduled skills from registry and set up timers.
   */
  async _loadRegistrySchedules() {
    try {
      const allMeta = await window.electronAPI.skillGetAllMeta();
      const scheduled = allMeta.filter(m => m.schedule);

      for (const meta of scheduled) {
        if (meta.schedule.cronHour !== undefined) {
          // cronHour: check every minute if it's the right hour
          const timer = setInterval(async () => {
            const now = new Date();
            if (now.getHours() === meta.schedule.cronHour && now.getMinutes() < 2) {
              // Check if already ran today
              const today = now.toISOString().split('T')[0];
              const key = `skillScheduled_${meta.name}_${today}`;
              const ran = await window.electronAPI.getStore(key);
              if (!ran) {
                await window.electronAPI.setStore(key, true);
                this._triggerRegistrySkill(meta.name);
              }
            }
          }, 60 * 1000);
          this._scheduledTimers.push(timer);
        } else if (meta.schedule.interval) {
          // interval in minutes
          const timer = setInterval(() => {
            this._triggerRegistrySkill(meta.name);
          }, meta.schedule.interval * 60 * 1000);
          this._scheduledTimers.push(timer);
        }
      }

      if (scheduled.length > 0) {
        console.log(`[SkillScheduler] Loaded ${scheduled.length} scheduled skills from registry`);
      }
    } catch (err) {
      console.warn('[SkillScheduler] Failed to load registry schedules:', err);
    }
  }

  /**
   * Trigger a SKILL.md-based skill and notify proactive engine.
   */
  async _triggerRegistrySkill(skillId) {
    try {
      this._emitStatus(skillId, 'running');
      const result = await window.electronAPI.skillExecute(skillId, {});
      this._emitStatus(skillId, 'completed', result);

      // Notify proactive engine for L3 bubble
      if (result && result.success && this._proactiveEngine) {
        this._proactiveEngine._processSignal('time-trigger', {
          hour: new Date().getHours(),
          type: `${skillId}-ready`
        });
      }
    } catch (err) {
      console.warn(`[SkillScheduler] Registry skill ${skillId} failed:`, err);
      this._emitStatus(skillId, 'error', err.message);
    }
  }

  destroy() {
    for (const id of Object.keys(this._skills)) {
      this._stopSkill(id);
    }
    for (const timer of this._scheduledTimers) {
      clearInterval(timer);
    }
    this._scheduledTimers = [];
  }

  _startSkill(skillId) {
    const skill = this._skills[skillId];
    if (!skill || skill.timer) return;

    skill.timer = setInterval(() => {
      if (skill.enabled && !this._running[skillId]) {
        skill.execute();
      }
    }, skill.interval);

    console.log(`[SkillScheduler] Started: ${skillId}`);
  }

  _stopSkill(skillId) {
    const skill = this._skills[skillId];
    if (!skill) return;
    if (skill.timer) {
      clearInterval(skill.timer);
      skill.timer = null;
    }
  }

  async _triggerSkill(skillId) {
    this._running[skillId] = true;
    this._emitStatus(skillId, 'running');

    try {
      const result = await window.electronAPI.skillTrigger(skillId);
      this._emitStatus(skillId, 'completed', result);

      // Notify proactive engine if skill produced actionable output
      if (result && result.notification && this._proactiveEngine) {
        this._proactiveEngine._processSignal(result.notification.signal, result.notification.data);
      }
    } catch (err) {
      console.warn(`[SkillScheduler] ${skillId} failed:`, err);
      this._emitStatus(skillId, 'error', err.message);
    } finally {
      this._running[skillId] = false;
    }
  }

  async _checkDailyReport() {
    const now = new Date();
    const reportHour = await window.electronAPI.getStore('dailyReportHour') || 18;

    if (now.getHours() === reportHour && now.getMinutes() < 2) {
      // Check if we already generated today
      const today = now.toISOString().split('T')[0];
      const lastReport = await window.electronAPI.getStore(`dailyReport_${today}`);
      if (!lastReport) {
        await this._triggerSkill('dailyReport');
      }
    }
  }

  _emitStatus(skillId, status, data) {
    if (this._onStatusChange) {
      this._onStatusChange({ skillId, status, data });
    }
  }

  // --- Public API ---

  async manualTrigger(skillId) {
    if (this._running[skillId]) return;
    await this._triggerSkill(skillId);
  }

  async setEnabled(skillId, enabled) {
    const skill = this._skills[skillId];
    if (!skill) return;

    skill.enabled = enabled;
    if (enabled) {
      this._startSkill(skillId);
    } else {
      this._stopSkill(skillId);
    }

    // Persist
    const states = await window.electronAPI.getStore('skillsEnabled') || {};
    states[skillId] = enabled;
    await window.electronAPI.setStore('skillsEnabled', states);
  }

  getStatus() {
    const status = {};
    for (const [id, skill] of Object.entries(this._skills)) {
      status[id] = {
        enabled: skill.enabled,
        running: !!this._running[id]
      };
    }
    return status;
  }

  set onStatusChange(fn) { this._onStatusChange = fn; }
}
