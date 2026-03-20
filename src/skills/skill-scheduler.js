/**
 * Skill Scheduler — Renderer-side skill status & manual trigger interface.
 *
 * Phase 3: Scheduling has moved to Main-side ScheduledTriggerRegistry.
 * This class now serves as:
 *   1. Status listener for skill execution events via TriggerBus
 *   2. Manual trigger interface (routes through TriggerBus IPC)
 *   3. Enabled/disabled state management (persisted to store)
 *
 * Runs in renderer process, communicates with main process via IPC.
 */

export class SkillScheduler {
  constructor() {
    this._skills = {};          // skillId -> { enabled }
    this._running = {};         // skillId -> boolean
    this._onStatusChange = null;
    this._proactiveEngine = null;
    this._triggerBus = null;    // Phase 3: TriggerBusRenderer
  }

  /**
   * Phase 3: Set TriggerBusRenderer for manual skill triggers.
   * @param {import('../ai-runtime/trigger-bus-renderer.js').TriggerBusRenderer} triggerBus
   */
  setTriggerBus(triggerBus) {
    this._triggerBus = triggerBus;
  }

  async init(proactiveEngine) {
    this._proactiveEngine = proactiveEngine;

    // Load enabled states
    const enabled = await window.electronAPI.getStore('skillsEnabled') || {
      textConverter: true,
      dailyReport: true,
      todoExtractor: true
    };

    // Register skill state (scheduling is handled by Main ScheduledTriggerRegistry)
    this._skills = {
      textConverter: { enabled: enabled.textConverter !== false },
      dailyReport: { enabled: enabled.dailyReport !== false },
      todoExtractor: { enabled: enabled.todoExtractor !== false }
    };

    console.log('[SkillScheduler] Phase 3: Scheduling delegated to Main ScheduledTriggerRegistry');
  }

  destroy() {
    // No timers to clean up — scheduling is in Main process
  }

  // --- Public API ---

  /**
   * Manual trigger: submit a skill through TriggerBus.
   * Falls back to legacy IPC if TriggerBus is not available.
   */
  async manualTrigger(skillId) {
    if (this._running[skillId]) return;

    this._running[skillId] = true;
    this._emitStatus(skillId, 'running');

    try {
      if (this._triggerBus) {
        // Phase 3: Route through TriggerBus
        const sceneMap = {
          textConverter: 'skill.text-converter',
          dailyReport: 'skill.daily-report',
          todoExtractor: 'skill.todo-management',
        };
        const skillNameMap = {
          textConverter: 'text-converter',
          dailyReport: 'daily-report',
          todoExtractor: 'todo-management',
        };

        const sceneId = sceneMap[skillId] || `skill.${skillId}`;
        const realSkillId = skillNameMap[skillId] || skillId;

        const trigger = {
          type: 'skill',
          sceneId,
          payload: {
            skillId: realSkillId,
            userContext: {},
            userMessage: realSkillId === 'todo-management' ? '/todo' : undefined,
          },
        };

        const result = await this._triggerBus.submitAndWait(trigger, { priority: 'NORMAL' });

        if (result.status === 'completed') {
          this._emitStatus(skillId, 'completed', { success: true, output: result.result });

          if (this._proactiveEngine) {
            this._proactiveEngine._processSignal('time-trigger', {
              hour: new Date().getHours(),
              type: `${realSkillId}-ready`
            });
          }
        } else {
          this._emitStatus(skillId, 'error', result.error || 'Unknown error');
        }
      } else {
        // No TriggerBus available — cannot execute
        this._emitStatus(skillId, 'error', 'TriggerBus not available');
      }
    } catch (err) {
      console.warn(`[SkillScheduler] ${skillId} failed:`, err);
      this._emitStatus(skillId, 'error', err.message);
    } finally {
      this._running[skillId] = false;
    }
  }

  async setEnabled(skillId, enabled) {
    const skill = this._skills[skillId];
    if (!skill) return;

    skill.enabled = enabled;

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

  _emitStatus(skillId, status, data) {
    if (this._onStatusChange) {
      this._onStatusChange({ skillId, status, data });
    }
  }

  set onStatusChange(fn) { this._onStatusChange = fn; }
}
