/**
 * Proactive Engine - Main orchestrator for proactive interactions
 *
 * Integrates SignalCollector + TimingJudge + NotificationMgr.
 * Registers scene handlers and routes signals to matching scenes.
 * Replaces the legacy ProactiveChat class.
 */

import { SignalCollector } from './signal-collector.js';
import { TimingJudge } from './timing-judge.js';
import { NotificationMgr } from './notification-mgr.js';

// Scene imports
import { dailyReportScene } from './scenes/daily-report.js';
import { todoDetectScene } from './scenes/todo-detect.js';
import { meetingReminderScene } from './scenes/meeting-reminder.js';
import { restReminderScene } from './scenes/rest-reminder.js';
import { lateNightCareScene } from './scenes/late-night-care.js';
import { dailyGreetingScene } from './scenes/daily-greeting.js';
import { pomodoroSuggestScene } from './scenes/pomodoro-suggest.js';
import { todoDeadlineScene } from './scenes/todo-deadline.js';
import { achievementChatScene } from './scenes/achievement-chat.js';
import { onboardingScene } from './scenes/onboarding.js';

// V1.5: New scene imports — P0
import { typingMoodDetectScene, typingSteadyScene } from './scenes/typing-mood-detect.js';
import { workPhaseDetectScene, workWrapUpScene, workOvertimeScene } from './scenes/work-phase-detect.js';
import { milestoneStreakScene, milestonePrestigeScene, milestoneTypingCountScene, milestoneNoteScene } from './scenes/milestone-celebrate.js';

// V1.5: New scene imports — P1
import { clipboardUrlScene, clipboardCodeScene, clipboardLongTextScene, clipboardRepeatScene } from './scenes/clipboard-aware.js';
import { calendarWeekendScene, calendarMondayScene, calendarFridayScene, calendarHolidayScene, calendarSeasonScene, calendarBirthdayScene } from './scenes/calendar-aware.js';
import { idleChatScene } from './scenes/idle-chat.js';

// V1.5: New scene imports — P2
import { catSelfReportFocusedScene, catSelfReportReturnScene, catSelfReportLateNightScene, catSelfReportMorningScene } from './scenes/cat-self-report.js';
import { relationshipDeepenScene } from './scenes/relationship-deepen.js';

const ALL_SCENES = [
  dailyReportScene,
  todoDetectScene,
  meetingReminderScene,
  restReminderScene,
  lateNightCareScene,
  dailyGreetingScene,
  pomodoroSuggestScene,
  todoDeadlineScene,
  achievementChatScene,
  onboardingScene,
  // V1.5: P0 scenes
  typingMoodDetectScene,
  typingSteadyScene,
  workPhaseDetectScene,
  workWrapUpScene,
  workOvertimeScene,
  milestoneStreakScene,
  milestonePrestigeScene,
  milestoneTypingCountScene,
  milestoneNoteScene,
  // V1.5: P1 scenes
  clipboardUrlScene,
  clipboardCodeScene,
  clipboardLongTextScene,
  clipboardRepeatScene,
  calendarWeekendScene,
  calendarMondayScene,
  calendarFridayScene,
  calendarHolidayScene,
  calendarSeasonScene,
  calendarBirthdayScene,
  idleChatScene,
  // V1.5: P2 scenes
  catSelfReportFocusedScene,
  catSelfReportReturnScene,
  catSelfReportLateNightScene,
  catSelfReportMorningScene,
  relationshipDeepenScene
];

export class ProactiveEngine {
  constructor() {
    this.signalCollector = new SignalCollector();
    this.timingJudge = new TimingJudge();
    this.notificationMgr = new NotificationMgr();

    this._scenes = [];       // registered scene configs
    this._cooldowns = {};    // sceneId -> last trigger timestamp
    this._enabled = true;
    this._enabledTypes = ['info', 'care', 'efficiency', 'chat'];
    this._personality = 'lively';
    this._affectionSystem = null;
    this._pomodoroTimer = null;
    this._todoList = null;
    this._aiService = null;
  }

  /**
   * Initialize the engine with external references.
   */
  async init({ affectionSystem, showBubbleFn, pomodoroTimer, todoList, aiService }) {
    this._affectionSystem = affectionSystem;
    this._pomodoroTimer = pomodoroTimer;
    this._todoList = todoList;
    this._aiService = aiService;

    // Load config
    const config = await window.electronAPI.getStore('proactiveConfig');
    if (config) {
      this._enabled = config.enabled !== false;
      this.notificationMgr.setMaxDaily(config.maxDailyInteractions || 8);
      if (config.quietHours) {
        this.timingJudge.setQuietHours(config.quietHours.start, config.quietHours.end);
      }
      if (config.enabledSceneTypes) {
        this._enabledTypes = config.enabledSceneTypes;
      }
    }

    // Adjust timing judge min interval based on todo remind interval
    const todoInterval = await window.electronAPI.getStore('todoRemindInterval') || 30;
    const minInterval = Math.min(todoInterval * 60 * 1000, 5 * 60 * 1000);
    this.timingJudge.setMinPushInterval(minInterval);

    // Load personality
    this._personality = await window.electronAPI.getStore('catPersonality') || 'lively';

    // Initialize subsystems
    this.signalCollector.init(affectionSystem);
    this.timingJudge.init(this.signalCollector);
    await this.notificationMgr.init(showBubbleFn);

    // Wire TimingJudge flush to NotificationMgr
    this.timingJudge.onFlush = (notification) => {
      this.notificationMgr.push(notification);
    };

    // Subscribe to all signals
    this._subscribeSignals();

    // Register built-in scenes
    this.registerScenes(ALL_SCENES);

    // Handle legacy greeting
    await this._handleDailyGreeting();
  }

  destroy() {
    this.signalCollector.destroy();
    this.timingJudge.destroy();
  }

  // --- Scene Registration ---

  /**
   * Register a scene handler.
   * @param {object} scene - Scene config with id, name, type, level, signal, condition, getMessage, actions, cooldown
   */
  registerScene(scene) {
    this._scenes.push(scene);
  }

  /**
   * Register multiple scenes at once.
   */
  registerScenes(scenes) {
    for (const scene of scenes) {
      this.registerScene(scene);
    }
  }

  // --- Signal Routing ---

  _subscribeSignals() {
    const signals = [
      'typing-pause', 'typing-speed-change', 'long-work', 'time-trigger', 'idle',
      // V1.5: New signals
      'typing-rhythm-change', 'clipboard-content', 'work-phase', 'short-idle', 'periodic'
    ];

    for (const signal of signals) {
      this.signalCollector.on(signal, (data) => {
        if (!this._enabled) return;
        this._processSignal(signal, data);
      });
    }

    // Event-driven signals from affection system
    if (this._affectionSystem) {
      this._affectionSystem.on('levelup', (data) => {
        if (!this._enabled) return;
        this._processSignal('levelup', data);
      });

      this._affectionSystem.on('moodchange', (data) => {
        if (!this._enabled) return;
        this._processSignal('moodchange', data);
      });

      // V1.5: Prestige signal for milestone celebration
      this._affectionSystem.on('prestige', (data) => {
        if (!this._enabled) return;
        this._processSignal('prestige', data);
      });
    }
  }

  async _processSignal(signal, data) {
    // Find matching scenes
    const matchingScenes = [];
    for (const scene of this._scenes) {
      // Check signal match
      if (scene.signal !== signal) continue;

      // Check scene type enabled
      if (!this._enabledTypes.includes(scene.type)) continue;

      // Check cooldown
      if (await this._isInCooldown(scene)) continue;

      // Check condition
      const ctx = this._buildContext(data);
      if (scene.condition && !scene.condition(ctx)) continue;

      matchingScenes.push(scene);
    }

    // Process first matching scene (highest priority by level)
    const sorted = matchingScenes.sort((a, b) => {
      const levels = { L3: 3, L2: 2, L1: 1, L0: 0 };
      return (levels[b.level] || 0) - (levels[a.level] || 0);
    });

    if (sorted.length > 0) {
      this._triggerScene(sorted[0], data);
    }
  }

  _triggerScene(scene, signalData) {
    const ctx = this._buildContext(signalData);
    const message = scene.getMessage(ctx, this._personality);
    if (!message) return;

    const notification = {
      sceneId: scene.id,
      sceneName: scene.name,
      level: scene.level,
      message,
      actions: scene.actions || [],
      timestamp: Date.now()
    };

    // Try to push through timing judge
    const result = this.timingJudge.enqueue(notification);
    if (result.immediate) {
      this.notificationMgr.push(notification);
    }

    // Record cooldown
    this._cooldowns[scene.id] = Date.now();
  }

  _buildContext(signalData) {
    return {
      ...signalData,
      personality: this._personality,
      level: this._affectionSystem ? this._affectionSystem.level : 1,
      mood: this._affectionSystem ? this._affectionSystem.mood : 'normal',
      continuousWorkMinutes: this.signalCollector.continuousWorkMinutes,
      typingSpeed: this.signalCollector.typingSpeed,
      hour: new Date().getHours(),
      todoList: this._todoList,
      affection: this._affectionSystem
    };
  }

  async _isInCooldown(scene) {
    const lastTrigger = this._cooldowns[scene.id];
    if (!lastTrigger) return false;
    const cooldown = scene.getCooldown ? await scene.getCooldown() : (scene.cooldown || 0);
    return (Date.now() - lastTrigger) < cooldown;
  }

  // --- Legacy Greeting (from ProactiveChat) ---

  async _handleDailyGreeting() {
    // This is now handled by the daily-greeting scene.
    // If no scene registered yet, use a fallback.
    const greetDate = await window.electronAPI.getStore('proactiveGreetDate');
    const today = new Date().toISOString().split('T')[0];

    if (greetDate !== today) {
      await window.electronAPI.setStore('proactiveGreetDate', today);
      // Signal for daily greeting scene
      setTimeout(() => {
        this._processSignal('time-trigger', { hour: new Date().getHours(), type: 'first-active' });
      }, 2000);
    }
  }

  // --- External Events ---

  /** Called when pomodoro timer starts */
  onPomodoroStart() {
    this.timingJudge.setPomodoroActive(true);
  }

  /** Called when pomodoro timer completes */
  onPomodoroComplete() {
    this.timingJudge.setPomodoroActive(false);
    this.signalCollector.resetWorkTimer();
    this._processSignal('pomodoro-complete', {});
  }

  /** Called when pomodoro is reset/stopped */
  onPomodoroStop() {
    this.timingJudge.setPomodoroActive(false);
  }

  /** Update personality setting */
  setPersonality(p) {
    this._personality = p;
  }

  /** Update enabled state */
  async updateConfig() {
    const config = await window.electronAPI.getStore('proactiveConfig');
    if (config) {
      this._enabled = config.enabled !== false;
      this.notificationMgr.setMaxDaily(config.maxDailyInteractions || 8);
      if (config.quietHours) {
        this.timingJudge.setQuietHours(config.quietHours.start, config.quietHours.end);
      }
      if (config.enabledSceneTypes) {
        this._enabledTypes = config.enabledSceneTypes;
      }
    }

    // Update timing judge min interval
    const todoInterval = await window.electronAPI.getStore('todoRemindInterval') || 30;
    const minInterval = Math.min(todoInterval * 60 * 1000, 5 * 60 * 1000);
    this.timingJudge.setMinPushInterval(minInterval);
  }
}
