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
import { rhythmScenes } from './scenes/rhythm-scenes.js';

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
  relationshipDeepenScene,
  ...rhythmScenes
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
    this._triggerBus = null;  // Phase 3: TriggerBusRenderer for AI-generated messages
  }

  setRhythmModules(rhythmAnalyzer, compositeEngine) {
    this._rhythmAnalyzer = rhythmAnalyzer;
    this._compositeEngine = compositeEngine;
  }

  /**
   * Phase 3: Set TriggerBusRenderer for AI-generated proactive messages.
   * @param {import('../ai-runtime/trigger-bus-renderer.js').TriggerBusRenderer} triggerBus
   */
  setTriggerBus(triggerBus) {
    this._triggerBus = triggerBus;
  }

  processExternalSignal(signalName, data) {
    this._processSignal(signalName, data);
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
      if (scene.condition && !(await scene.condition(ctx))) continue;

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

    // Phase 3: AI-generated messages for scenes with aiGenerate flag
    if (scene.aiGenerate && this._triggerBus) {
      this._triggerAIScene(scene, ctx);
      return;
    }

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

  /**
   * Phase 3: Trigger a scene that requires AI generation via TriggerBus.
   * Submits a proactive trigger with LOW priority and delivers the AI response
   * through the normal notification pipeline.
   */
  async _triggerAIScene(scene, ctx) {
    try {
      // Build context summary for AI prompt
      const contextSummary = {
        sceneName: scene.name,
        sceneType: scene.type,
        personality: this._personality,
        level: ctx.level,
        mood: ctx.mood,
        hour: ctx.hour,
        continuousWorkMinutes: ctx.continuousWorkMinutes,
        typingSpeed: ctx.typingSpeed,
      };

      // Include scene-specific hint if available
      if (scene.aiHint) {
        contextSummary.hint = typeof scene.aiHint === 'function'
          ? scene.aiHint(ctx)
          : scene.aiHint;
      }

      const trigger = {
        type: 'proactive',
        sceneId: 'proactive.scene-message',
        payload: {
          sceneContext: contextSummary,
          personality: this._personality,
          // Include system prompt context for the AI
          systemPrompt: this._buildAIScenePrompt(scene, ctx),
          history: [{
            role: 'user',
            content: this._buildAISceneUserMessage(scene, ctx)
          }]
        },
      };

      const result = await this._triggerBus.submitAndWait(trigger, { priority: 'LOW' });

      if (result.status === 'completed' && result.result) {
        const message = result.result.trim();
        if (!message) return;

        const notification = {
          sceneId: scene.id,
          sceneName: scene.name,
          level: scene.level,
          message,
          actions: scene.actions || [],
          timestamp: Date.now()
        };

        const enqueueResult = this.timingJudge.enqueue(notification);
        if (enqueueResult.immediate) {
          this.notificationMgr.push(notification);
        }
      } else {
        console.warn(`[ProactiveEngine] AI scene ${scene.name} failed: ${result.error || result.status}`);
        // Fallback to template message
        this._triggerSceneFallback(scene, ctx);
      }
    } catch (err) {
      console.warn(`[ProactiveEngine] AI scene ${scene.name} error:`, err.message);
      // Fallback to template message
      this._triggerSceneFallback(scene, ctx);
    }

    // Record cooldown regardless
    this._cooldowns[scene.id] = Date.now();
  }

  /**
   * Fallback: use template message when AI generation fails.
   */
  _triggerSceneFallback(scene, ctx) {
    if (!scene.getMessage) return;
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

    const result = this.timingJudge.enqueue(notification);
    if (result.immediate) {
      this.notificationMgr.push(notification);
    }
  }

  /**
   * Build system prompt for AI-generated proactive scene.
   */
  _buildAIScenePrompt(scene, ctx) {
    const personalityTraits = {
      lively: '活泼开朗、爱用颜文字和 emoji，语气热情',
      cool: '高冷傲娇、简短有力，偶尔流露关心',
      soft: '温柔体贴、说话轻声细语，善解人意',
      scholar: '博学多才、喜欢引经据典，认真但不古板'
    };

    return `你是一只桌面宠物猫咪，性格是「${personalityTraits[this._personality] || personalityTraits.lively}」。
你需要根据场景生成一条简短的主动关怀消息（不超过50字）。
要求：
- 符合猫咪的人格特征
- 简洁自然，不要太长
- 不要使用引号包裹
- 可以适当使用 emoji`;
  }

  /**
   * Build user message for AI-generated proactive scene.
   */
  _buildAISceneUserMessage(scene, ctx) {
    let msg = `场景：${scene.name}（${scene.type}类型）\n`;
    msg += `当前时间：${ctx.hour}点\n`;
    msg += `用户状态：连续工作${ctx.continuousWorkMinutes || 0}分钟`;
    if (ctx.typingSpeed) msg += `，打字速度${Math.round(ctx.typingSpeed)} CPM`;
    msg += `\n好感度等级：Lv.${ctx.level}，心情：${ctx.mood}`;

    if (scene.aiHint) {
      const hint = typeof scene.aiHint === 'function' ? scene.aiHint(ctx) : scene.aiHint;
      if (hint) msg += `\n场景提示：${hint}`;
    }

    msg += '\n请生成一条合适的主动消息：';
    return msg;
  }

  _buildContext(signalData) {
    return {
      data: signalData, // Ensure data is mapped properly
      ...signalData,
      personality: this._personality,
      level: this._affectionSystem ? this._affectionSystem.level : 1,
      mood: this._affectionSystem ? this._affectionSystem.mood : 'normal',
      continuousWorkMinutes: this.signalCollector.continuousWorkMinutes,
      typingSpeed: this.signalCollector.typingSpeed,
      hour: new Date().getHours(),
      todoList: this._todoList,
      affection: this._affectionSystem,
      compositeEngine: this._compositeEngine,
      rhythmAnalyzer: this._rhythmAnalyzer
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
