/**
 * Renderer entry point - initializes all modules
 * V1.2: Skill System + Proactive Interaction Engine + User Profiler
 * V3: Phase 2 AI Runtime integration
 */

import { SpriteCharacter, SKINS } from './pet/pixel-character.js';
import { SpriteSheetCharacter } from './pet/spritesheet-character.js';
import { PomodoroOverlayAnimation } from './pet/pomodoro-overlay-animation.js';
import { CHARACTER_PRESETS, CATEGORIES, INSTRUMENT_NAMES } from './pet/live2d-character.js';
import { AffectionSystem, getLevelThreshold } from './pet/affection-system.js';
import { InputTracker } from './input/tracker.js';
import { AIService } from './chat/ai-service.js';
import { ChatUI } from './chat/chat-ui.js';
import { SystemInfoWidget } from './widgets/system-info.js';
import { TypeRecorder } from './recorder/type-recorder.js';
import { PomodoroTimer } from './widgets/pomodoro.js';
import { TodoList } from './widgets/todo-list.js';

// V1.1 imports
import { MemoryManager } from './chat/memory-manager.js';
import { SurpriseEventSystem } from './pet/surprise-events.js';
import { TodoParser } from './chat/todo-parser.js';
import { ClipboardWidget } from './widgets/clipboard.js';

// V1.2 imports
import { ProactiveEngine } from './proactive/proactive-engine.js';
import { SkillScheduler } from './skills/skill-scheduler.js';
import { UserProfiler } from './proactive/user-profiler.js';

// V1.5 imports — Skill Agent System
import { SkillRouter } from './skills/skill-router.js';

// Phase 3: TriggerBus Renderer
import { TriggerBusRenderer } from './ai-runtime/trigger-bus-renderer.js';

// V1.3 imports — Pet Base & Utils
import { PetBaseSystem } from './pet/pet-base-system.js';
import { PetBaseUI } from './pet/pet-base-ui.js';
import { getPrestigeMaterial } from './pet/pet-base-items.js';

// V3 imports — Gacha System
import { GachaSystem } from './pet/gacha-system.js';
import { GachaUI } from './pet/gacha-ui.js';
import { GachaAccessoryUI } from './pet/gacha-accessory-ui.js';
import { formatNumber } from './utils/format.js';
import { capturePanelAnchor, applyPanelAnchorTransition } from './ui/panel-tab-transition.js';
import { QuickPanelInlineUI } from './quick-panel/quick-panel-inline-ui.js';

// V1.4 imports — Multiplayer
import { MultiplayerClient } from './multiplayer/mp-client.js';
import { MiniCatRenderer } from './multiplayer/mini-cat-renderer.js';
import { ConnectionUI } from './multiplayer/connection-ui.js';
import { LeaderboardUI } from './multiplayer/leaderboard-ui.js';

// Preset API configurations
const API_PRESETS = {
  openai: {
    url: 'https://api.openai.com/v1', model: 'gpt-4.1',
    models: ['gpt-4.1', 'gpt-4.1-mini', 'gpt-4.1-nano', 'gpt-4o', 'gpt-4o-mini', 'o3', 'o3-mini', 'o4-mini', 'o1', 'gpt-4-turbo', 'gpt-3.5-turbo']
  },
  claude: {
    url: 'https://api.anthropic.com/v1', model: 'claude-sonnet-4-6',
    models: ['claude-opus-4-6', 'claude-sonnet-4-6', 'claude-haiku-4-5', 'claude-sonnet-4-5', 'claude-opus-4-5', 'claude-sonnet-4-0', 'claude-opus-4-0', 'claude-3-haiku-20240307']
  },
  deepseek: {
    url: 'https://api.deepseek.com/v1', model: 'deepseek-chat',
    models: ['deepseek-chat', 'deepseek-reasoner']
  },
  openrouter: {
    url: 'https://openrouter.ai/api/v1', model: 'openai/gpt-4.1',
    models: [
      'openai/gpt-4.1', 'openai/gpt-4.1-mini', 'openai/gpt-4o', 'openai/o3', 'openai/o4-mini',
      'anthropic/claude-opus-4-6', 'anthropic/claude-sonnet-4-6', 'anthropic/claude-haiku-4-5',
      'google/gemini-2.5-pro', 'google/gemini-2.5-flash', 'google/gemini-2.0-flash',
      'deepseek/deepseek-chat', 'deepseek/deepseek-reasoner',
      'meta-llama/llama-4-maverick', 'meta-llama/llama-4-scout'
    ]
  },
  gemini: {
    url: 'https://generativelanguage.googleapis.com/v1beta/openai', model: 'gemini-2.5-flash',
    models: ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-3.1-pro-preview', 'gemini-3-flash-preview']
  },
  ollama: {
    url: 'http://127.0.0.1:11434/v1', model: 'llama3.2:3b',
    models: []
  },
  openclaw: {
    url: '', model: '',
    models: [],
    needsUrl: true
  }
};

// Active character reference
let activeCharacter = null;
let quickPanelUI = null;

// Affection system reference (used by pet status UI)
let affectionSystem = null;

// NotificationMgr reference (used by switchCharacter to update character)
let _notificationMgr = null;

/**
 * Show a floating cat bubble above the pet.
 * Supports both simple text and structured L2/L3 notifications.
 */
function showCatBubble(text, duration = 10000) {
  const bubble = document.getElementById('cat-bubble');
  if (!bubble) return;

  // Reset state
  bubble.classList.remove('hidden', 'fade-out', 'bubble-l3', 'bubble-shrink');
  bubble.innerHTML = '';

  bubble.textContent = text;

  // Clear any existing timer
  if (bubble._hideTimer) clearTimeout(bubble._hideTimer);
  if (bubble._removeTimer) clearTimeout(bubble._removeTimer);

  bubble._hideTimer = setTimeout(() => {
    bubble.classList.add('fade-out');
    bubble._removeTimer = setTimeout(() => {
      bubble.classList.add('hidden');
      bubble.classList.remove('fade-out');
    }, 2000);
  }, duration);
}

/**
 * Show a structured notification with level support.
 * @param {object} config - { level, message, actions, sceneId }
 */
function showNotification(config) {
  const bubble = document.getElementById('cat-bubble');
  const dot = document.getElementById('proactive-dot');
  if (!bubble) return;

  // Helper: hide bubble with 2s fade-out
  const hideBubbleWithFade = () => {
    bubble.classList.add('fade-out');
    if (bubble._removeTimer) clearTimeout(bubble._removeTimer);
    bubble._removeTimer = setTimeout(() => {
      bubble.classList.add('hidden');
      bubble.classList.remove('fade-out', 'bubble-l3');
      bubble.innerHTML = '';
    }, 2000);
  };

  switch (config.level) {
    case 'L0':
      // Silent — no UI
      break;

    case 'L1':
      // Micro badge only
      if (dot) dot.classList.remove('hidden');
      break;

    case 'L2':
      // Bubble that auto-shrinks to dot
      showCatBubble(config.message, 10000);
      setTimeout(() => {
        if (dot) dot.classList.remove('hidden');
      }, 12000); // 10s display + 2s fade
      break;

    case 'L3':
      // Large bubble with action buttons
      bubble.classList.remove('hidden', 'fade-out', 'bubble-shrink');
      bubble.classList.add('bubble-l3');
      bubble.innerHTML = '';

      const msgEl = document.createElement('div');
      msgEl.className = 'bubble-message';
      msgEl.textContent = config.message;
      bubble.appendChild(msgEl);

      if (config.actions && config.actions.length > 0) {
        const actionsEl = document.createElement('div');
        actionsEl.className = 'bubble-actions';
        for (const act of config.actions) {
          const btn = document.createElement('button');
          btn.className = act.action === 'dismiss' ? 'bubble-action-btn bubble-dismiss-btn' : 'bubble-action-btn';
          btn.textContent = act.label;
          btn.addEventListener('click', () => {
            if (bubble._hideTimer) clearTimeout(bubble._hideTimer);
            hideBubbleWithFade();
            if (config.onAction) config.onAction(act.action);
          });
          actionsEl.appendChild(btn);
        }
        bubble.appendChild(actionsEl);
      }

      // Auto-dismiss: 10s display + 2s fade
      if (bubble._hideTimer) clearTimeout(bubble._hideTimer);
      if (bubble._removeTimer) clearTimeout(bubble._removeTimer);
      bubble._hideTimer = setTimeout(() => {
        hideBubbleWithFade();
      }, 10000);
      break;

    default:
      showCatBubble(config.message);
  }
}

// Click on proactive dot to clear it
document.getElementById('proactive-dot')?.addEventListener('click', () => {
  document.getElementById('proactive-dot')?.classList.add('hidden');
});

/**
 * Factory: create the right character type based on skin config.
 */
async function createCharacter(canvas, charId) {
  const skin = SKINS[charId];
  if (skin && skin.spriteSheet) {
    try {
      const ch = new SpriteSheetCharacter(canvas);
      await ch.load(skin.spriteSheet);
      return ch;
    } catch (e) {
      console.warn(`SpriteSheetCharacter load failed for "${charId}", falling back:`, e);
    }
  }
  const ch = new SpriteCharacter(canvas);
  await ch.load();
  if (charId) ch.loadSkin(charId);
  return ch;
}

// Global reference so IPC listeners can trigger UI updates
let typeRecorder = null;

async function init() {
  const canvas = document.getElementById('pet-canvas');

  // Restore saved skin
  const savedCharId = await window.electronAPI.getStore('character');
  const charId = savedCharId || 'bongo-classic';

  // Create character via factory
  activeCharacter = await createCharacter(canvas, charId);
  activeCharacter.start();
  window.__debugForceCatDrowsy = () => {
    console.log('[Renderer] __debugForceCatDrowsy');
    activeCharacter?.triggerIntent?.('sleepy');
  };
  window.__debugCatCharacterType = () => {
    const type = activeCharacter?.constructor?.name || 'UnknownCharacter';
    console.log('[Renderer] activeCharacter =', type);
    return type;
  };
  window.__debugCatCharacterInfo = () => {
    const info = {
      type: activeCharacter?.constructor?.name || 'UnknownCharacter',
      skinId: activeCharacter?.skinId || null,
      currentSkin: activeCharacter?.currentSkin || null,
      overlayState: activeCharacter?._overlayState || null,
      overlaySuppressMs: activeCharacter?._overlaySuppressActivityUntil
        ? Math.max(0, Math.round(activeCharacter._overlaySuppressActivityUntil - performance.now()))
        : 0,
    };
    console.log('[Renderer] activeCharacter info =', info);
    return info;
  };

  // Affection / nurturing system
  const affection = new AffectionSystem();
  await affection.init();
  affectionSystem = affection;

  // V2.1: Persist mood changes to store (for Main-side providers)
  affection.on('moodchange', () => {
    window.electronAPI.setStore('catMood', affection.mood);
  });
  // Initialize mood in store on startup
  window.electronAPI.setStore('catMood', affection.mood);

  // Input tracker proxy — hooks into affection system
  // Note: _mpClient ref is set later after MultiplayerClient is created
  let _mpClient = null;
  const characterProxy = {
    triggerTyping: () => {
      activeCharacter.triggerTyping();
      affection.onTyping();
      _mpClient?.sendAction('typing');
    },
    triggerClick: () => {
      activeCharacter.triggerClick();
      affection.onClick();
      _mpClient?.sendAction('click');
    },
    triggerHappy: () => {
      activeCharacter.triggerHappy?.();
    },
  };
  const inputTracker = new InputTracker(characterProxy);

  // AI service
  // AI service (Phase 4: TriggerBus-only, no direct AI HTTP)
  const aiService = new AIService();
  await aiService.loadConfig();

  // Phase 3: TriggerBus (Renderer-side, communicates with Main TriggerBus via IPC)
  const triggerBusRenderer = new TriggerBusRenderer();
  triggerBusRenderer.init();
  aiService.setTriggerBus(triggerBusRenderer);

  // V1.1: Memory Manager (Phase 4: uses TriggerBus via Main process)
  const memoryManager = new MemoryManager();
  memoryManager.setTriggerBus(triggerBusRenderer);
  await memoryManager.init();
  aiService.setMemoryManager(memoryManager);

  // V1.1: Load personality (saved for Renderer-side usage; chat prompt now built by Main PromptRegistry)
  const savedPersonality = await window.electronAPI.getStore('catPersonality') || 'lively';

  // Chat UI (simplified inline chat)
  const chatUI = new ChatUI(aiService, characterProxy, API_PRESETS);
  await chatUI.loadHistory();

  // V1.1: Sentiment callback — trigger cat expression
  chatUI.onSentiment = (sentiment) => {
    if (sentiment === 'happy') {
      activeCharacter.triggerHappy?.();
    }
    // Future: could map other sentiments to different animations
  };

  // Hook chat send to affection
  const chatSendBtn = document.getElementById('inline-chat-send');
  const chatInput = document.getElementById('inline-chat-input');
  chatSendBtn?.addEventListener('click', () => { affection.onChat(); });
  chatInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && chatInput.value.trim()) affection.onChat();
  });

  // System info widget (no longer standalone, lives in Tools panel tab)
  const widget = new SystemInfoWidget();

  // Type recorder (no longer standalone, lives in Tools panel tab)
  typeRecorder = new TypeRecorder();

  const pomodoroOverlayAnimation = new PomodoroOverlayAnimation();
  pomodoroOverlayAnimation.preload().catch((err) => {
    console.warn('[PomodoroOverlayAnimation] preload failed:', err.message);
  });

  // Pomodoro timer (lives in Tools panel tab)
  const pomodoro = new PomodoroTimer(affection);

  // Todo list (lives in Tools panel tab)
  const todoList = new TodoList(affection);

  // V1.1: Connect todo reminders to cat bubble
  todoList.onReminder = (todo) => {
    showCatBubble(`⏰ 提醒: ${todo.text}`, 6000);
  };

  // V1.1: Todo Parser (Phase 4: AI extraction via Main IPC)
  const todoParser = new TodoParser(todoList, showCatBubble);
  chatUI.setTodoParser(todoParser);

  // V1.5: Skill Router — intercepts chat commands/keywords before AI
  const skillRouter = new SkillRouter();
  skillRouter.setTriggerBus(triggerBusRenderer);
  await skillRouter.init();
  chatUI.setSkillRouter(skillRouter);

  // Listen for todo updates from main process (e.g. after /todo skill)
  window.electronAPI.onTodosUpdated(() => {
    todoList.reload();
  });

  // V1.1: Surprise Event System
  const surpriseEvents = new SurpriseEventSystem(affection, showCatBubble);
  await surpriseEvents.init();

  // V1.2: Proactive Engine (replaces ProactiveChat)
  const proactiveEngine = new ProactiveEngine();
  await proactiveEngine.init({
    affectionSystem: affection,
    showBubbleFn: showCatBubble,
    pomodoroTimer: pomodoro,
    todoList: todoList,
    aiService: aiService
  });
  proactiveEngine.setPersonality(savedPersonality);
  proactiveEngine.setTriggerBus(triggerBusRenderer);
  proactiveEngine.notificationMgr.setTriggerBus(triggerBusRenderer);
  proactiveEngine.notificationMgr.setCharacter(activeCharacter);
  _notificationMgr = proactiveEngine.notificationMgr;

  // ========== A4: 离线冒险检测 ==========
  try {
    const { OfflineAdventure } = await import('./pet/offline-adventure.js');
    const offlineAdventure = new OfflineAdventure(affection);
    const offlineReward = await offlineAdventure.check();

    if (offlineReward) {
      // Delay 3 seconds for UI to fully load
      setTimeout(async () => {
        let msg;
        try {
          // Try AI-generated narrative
          const result = await triggerBusRenderer.submitAndWait({
            type: 'proactive', sceneId: 'offline.adventure',
            payload: { ...offlineReward }
          }, { priority: 'HIGH', timeout: 8000 });
          msg = result?.text || null;
        } catch (e) {
          console.warn('[OfflineAdventure] AI narrative failed, using template:', e.message);
        }

        // Fallback template
        if (!msg) {
          msg = `\u{1F5FA}\uFE0F 冒险归来！我在「${offlineReward.location}」探索了 ${offlineReward.offlineHours} 小时～\n` +
            offlineReward.events.map(e => `• ${e}`).join('\n') +
            `\n\n\u{1F4B0} 获得 ${offlineReward.coins.toLocaleString()} 猫猫币！`;
        }
        showCatBubble(msg, 12000);
        chatUI.addMessage(msg, 'assistant');
      }, 3000);
    }
  } catch (err) {
    console.warn('[OfflineAdventure] Check failed:', err.message);
  }

  // ========== V2 Pillar A: 行为节奏智能 ==========

  // ─── A1: 操作感知 — 主动触发应用切换信号 ───
  const { categorizeApp } = await import('./proactive/scenes/app-context-aware.js');
  let _prevAppName = null;
  let _prevAppCategory = null;
  let _appSwitchTimestamps = []; // for frequent-switch detection

  // Per-category tracking: when the user was last actively in each category
  // Key = category string, Value = { lastSeenTime, awayApps[], visited }
  // visited=false means first time entering this category → always trigger
  const _categoryTracker = {};
  for (const cat of ['coding', 'browser', 'communication', 'design', 'terminal', 'other']) {
    _categoryTracker[cat] = { lastSeenTime: 0, awayApps: [], visited: false };
  }

  // Poll active window every 3 seconds, emit app-switch signal when changed
  setInterval(async () => {
    try {
      const winData = await window.electronAPI.getActiveWindow();
      if (!winData || !winData.current) return;

      const currentApp = winData.current.app;
      if (!currentApp || currentApp === _prevAppName) return;

      const currentCategory = categorizeApp(currentApp);
      const prevCategory = _prevAppCategory;
      const prevApp = _prevAppName;
      const now = Date.now();

      // --- Per-category away-time tracking ---
      // When leaving a category, stamp it with current time
      if (prevCategory && prevCategory !== currentCategory) {
        if (!_categoryTracker[prevCategory]) {
          _categoryTracker[prevCategory] = { lastSeenTime: now, awayApps: [] };
        } else {
          _categoryTracker[prevCategory].lastSeenTime = now;
          _categoryTracker[prevCategory].awayApps = [];
        }
      }

      // Track which apps user visited while away from each category
      for (const cat of Object.keys(_categoryTracker)) {
        if (cat !== currentCategory && _categoryTracker[cat].lastSeenTime > 0) {
          const apps = _categoryTracker[cat].awayApps;
          if (!apps.includes(currentApp)) apps.push(currentApp);
        }
      }

      // Calculate how many minutes the user was away from the CURRENT category
      let categoryAwayMinutes = 0;
      let isFirstVisit = false;
      let awayApps = [];
      const tracker = _categoryTracker[currentCategory];
      if (tracker) {
        if (!tracker.visited) {
          // First time entering this category this session → always trigger
          isFirstVisit = true;
          tracker.visited = true;
        } else if (tracker.lastSeenTime > 0) {
          categoryAwayMinutes = Math.floor((now - tracker.lastSeenTime) / 60000);
          awayApps = [...(tracker.awayApps || [])];
        }
        // Reset: user is now back in this category
        tracker.lastSeenTime = 0;
        tracker.awayApps = [];
      }

      // Track switch frequency (last 5 minutes)
      _appSwitchTimestamps.push(now);
      const fiveMinAgo = now - 5 * 60 * 1000;
      _appSwitchTimestamps = _appSwitchTimestamps.filter(t => t > fiveMinAgo);

      _prevAppName = currentApp;
      _prevAppCategory = currentCategory;

      // Emit app-switch signal to ProactiveEngine
      console.log(`[A1] App switch: ${prevApp}(${prevCategory}) → ${currentApp}(${currentCategory}), away=${categoryAwayMinutes}min, first=${isFirstVisit}, switches=${_appSwitchTimestamps.length}`);
      proactiveEngine.processExternalSignal('app-switch', {
        appName: currentApp,
        appCategory: currentCategory,
        prevApp,
        prevCategory,
        switchCount: _appSwitchTimestamps.length,
        categoryAwayMinutes,
        isFirstVisit,
        awayApps,
        title: winData.current.title,
      });
    } catch (err) {
      // Silently ignore polling errors
    }
  }, 3000);

  // A1: 鼠标信号化
  const { MouseSignalCollector } = await import('./proactive/mouse-signal-collector.js');
  const mouseSignalCollector = new MouseSignalCollector();
  mouseSignalCollector.init();
  
  // A3: 组合信号引擎
  const { CompositeSignalEngine } = await import('./proactive/composite-signal-engine.js');
  const compositeEngine = new CompositeSignalEngine(proactiveEngine.signalCollector, mouseSignalCollector);
  await compositeEngine.init();
  
  // A2: 节奏分析器
  const { RhythmAnalyzer } = await import('./proactive/rhythm-analyzer.js');
  const rhythmAnalyzer = new RhythmAnalyzer(proactiveEngine.signalCollector, mouseSignalCollector);
  rhythmAnalyzer.init();

  // A4: 节奏仪表盘
  const { RhythmDashboard } = await import('./widgets/rhythm-dashboard.js');
  const rhythmDashboardContainer = document.getElementById('tab-tools-rhythm');
  if (rhythmDashboardContainer) {
    const rhythmDashboard = new RhythmDashboard(rhythmDashboardContainer, rhythmAnalyzer, compositeEngine);
    rhythmDashboard.init();
  }
  
  // 注入到 ProactiveEngine
  proactiveEngine.setRhythmModules(rhythmAnalyzer, compositeEngine);
  
  rhythmAnalyzer.on('rhythm-state-change', async (data) => {
    proactiveEngine.processExternalSignal('rhythm-state-change', data);
    
    // Save on state change (with real-time signals for Main-side providers)
    const today = new Date().toISOString().split('T')[0];
    const engineData = compositeEngine.getTodayFullData();
    const summary = rhythmAnalyzer.getDailySummary();
    const signals = rhythmAnalyzer.getCurrentSignals?.() || {};
    await window.electronAPI.setStore(`rhythmData_${today}`, {
      ...engineData,
      ...summary,
      currentState: rhythmAnalyzer.currentState || 'idle',
      avgCPM: signals.avgCPM || 0,
      deleteRate: signals.deleteRate || 0,
      mouseActive: !!signals.mouseActive,
      todayTypingCount: compositeEngine.todayTypingCount || 0,
      date: today
    });
  });
  rhythmAnalyzer.on('flow-ended', (data) => {
    proactiveEngine.processExternalSignal('flow-ended', data);
  });
  compositeEngine.on('activity-tick', (data) => {
    proactiveEngine.processExternalSignal('activity-tick', data);
  });
  
  // Save more frequently (every 1 min) with real-time signals for Main-side providers
  setInterval(async () => {
    const today = new Date().toISOString().split('T')[0];
    const data = compositeEngine.getTodayFullData();
    const summary = rhythmAnalyzer.getDailySummary();
    const signals = rhythmAnalyzer.getCurrentSignals?.() || {};
    await window.electronAPI.setStore(`rhythmData_${today}`, {
      ...data,
      ...summary,
      currentState: rhythmAnalyzer.currentState || 'idle',
      avgCPM: signals.avgCPM || 0,
      deleteRate: signals.deleteRate || 0,
      mouseActive: !!signals.mouseActive,
      todayTypingCount: compositeEngine.todayTypingCount || 0,
      date: today
    });
  }, 60 * 1000);

  // Hook for safe save on quit (with real-time signals for Main-side providers)
  window.electronAPI.onBeforeQuit(async () => {
    const today = new Date().toISOString().split('T')[0];
    const data = compositeEngine.getTodayFullData();
    const summary = rhythmAnalyzer.getDailySummary();
    const signals = rhythmAnalyzer.getCurrentSignals?.() || {};
    await window.electronAPI.setStore(`rhythmData_${today}`, {
      ...data,
      ...summary,
      currentState: rhythmAnalyzer.currentState || 'idle',
      avgCPM: signals.avgCPM || 0,
      deleteRate: signals.deleteRate || 0,
      mouseActive: !!signals.mouseActive,
      todayTypingCount: compositeEngine.todayTypingCount || 0,
      date: today
    });
  });

  // Wire proactive reply actions to show inline chat
  proactiveEngine.notificationMgr.onOpenChat = () => {
    const inlineChat = document.getElementById('inline-chat');
    inlineChat?.classList.add('force-visible');
    document.getElementById('inline-chat-input')?.focus();
  };

  // Wire bubble inline reply → show inline chat + display messages + continue conversation
  proactiveEngine.notificationMgr.onBubbleReply = async (userText, catMessage) => {
    const inlineChat = document.getElementById('inline-chat');
    inlineChat?.classList.add('force-visible');
    // Display the cat's original proactive message and user's reply in history
    chatUI.addMessage(catMessage, 'assistant');
    chatUI.addMessage(userText, 'user');
    // Stream AI response
    const msgEl = chatUI.addMessage('', 'assistant');
    try {
      let fullResp = '';
      for await (const chunk of aiService.sendMessageStream(userText)) {
        msgEl.textContent += chunk;
        fullResp += chunk;
        chatUI.scrollToBottom();
      }
      // Show latest reply in cat bubble
      if (fullResp) showCatBubble(fullResp.slice(0, 100) + (fullResp.length > 100 ? '...' : ''), 10000);
    } catch (err) {
      msgEl.classList.add('error');
      msgEl.textContent = `错误：${err.message}`;
    }
  };

  // Wire todo panel open from bubble link
  proactiveEngine.notificationMgr.onOpenTodoPanel = () => {
    const panel = document.getElementById('tools-container');
    panel.classList.remove('hidden');
    positionAbovePet(panel);
    // Switch to todo tab
    const header = document.getElementById('tools-bubble-header');
    const body = document.getElementById('tools-body');
    header.querySelectorAll('.panel-tab').forEach(t => t.classList.remove('active'));
    body.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
    const todoTab = header.querySelector('.panel-tab[data-tab="tools-todo"]');
    if (todoTab) todoTab.classList.add('active');
    const todoContent = document.getElementById('tab-tools-todo');
    if (todoContent) todoContent.classList.add('active');
  };

  // Wire settings save to reload proactive config
  chatUI.onSettingsSaved = () => {
    proactiveEngine.updateConfig();
  };

  // Settings panel: load settings and setup events
  setupSettingsPanel(aiService, API_PRESETS, chatUI);

  // V1.2: Skill Scheduler (Phase 3: scheduling delegated to Main ScheduledTriggerRegistry)
  const skillScheduler = new SkillScheduler();
  skillScheduler.setTriggerBus(triggerBusRenderer);
  await skillScheduler.init(proactiveEngine);

  // Skill status listener — show cat thinking animation
  skillScheduler.onStatusChange = (info) => {
    if (info.status === 'running') {
      activeCharacter.triggerHappy?.(); // visual cue
    }
  };

  // V1.2: User Profiler + Onboarding
  const userProfiler = new UserProfiler();
  await userProfiler.init(proactiveEngine, chatUI);

  pomodoro.onStart = ({ phase }) => {
    console.warn('[Renderer] pomodoro.onStart', { phase });
    if (phase === 'work') {
      pomodoroOverlayAnimation.show({ restart: true }).catch((err) => {
        console.warn('[PomodoroOverlayAnimation] show failed:', err.message);
      });
      proactiveEngine.onPomodoroStart();
      return;
    }
    pomodoroOverlayAnimation.hide();
  };

  pomodoro.onStop = () => {
    console.warn('[Renderer] pomodoro.onStop');
    pomodoroOverlayAnimation.hide();
    proactiveEngine.onPomodoroStop();
  };

  // Wire pomodoro completion to both character and proactive engine
  pomodoro.onComplete = () => {
    console.warn('[Renderer] pomodoro.onComplete');
    pomodoroOverlayAnimation.hide();
    activeCharacter.triggerHappy?.();
    proactiveEngine.onPomodoroComplete();
  };

  // V1.1: Clipboard Widget
  const clipboardWidget = new ClipboardWidget(aiService, showCatBubble);

  const toolsPanel = document.getElementById('tools-container');
  const funPanel = document.getElementById('fun-container');
  const settingsPanel = document.getElementById('settings-container');
  quickPanelUI = new QuickPanelInlineUI({
    positionFn: null,
    beforeShow: async () => {
      // Quick panel now lives in tools, so just ensure tools panel is open
    }
  });
  quickPanelUI.init();

  // Setup UI
  setupToolbar(chatUI, quickPanelUI);
  setupTabbedPanel('settings-container', 'settings-bubble-header', 'settings-close', 'settings-maximize');
  setupTabbedPanel('animation-manager-container', 'animation-manager-header', 'animation-manager-close', 'animation-manager-maximize');
  setupTabbedPanel('tools-container', 'tools-bubble-header', 'tools-close', 'tools-maximize');
  setupTabbedPanel('fun-container', 'fun-bubble-header', 'fun-close', 'fun-maximize');
  setupToolbarHover();
  setupDrag();
  setupClickThrough();
  setupDragReceive();
  setupCharacterSelect(canvas);
  setupConsentToggle();
  setupContentReviewTab();

  // V1.3: Pet Base System (shop & owned in fun panel tabs)
  const petBase = new PetBaseSystem();
  await petBase.init(affection);
  const petBaseUI = new PetBaseUI(petBase, affection);
  petBaseUI.render();

  // V3: Gacha System (capsule machine in fun panel)
  const gachaSystem = new GachaSystem();
  await gachaSystem.init(affection);
  const gachaUI = new GachaUI(gachaSystem, affection);
  gachaUI.render();

  // V3: Gacha Accessory UI (equip/exchange in fun panel)
  const gachaAccessoryUI = new GachaAccessoryUI(gachaSystem, affection);
  gachaAccessoryUI.render();
  gachaAccessoryUI.renderDecorations();

  // Pet Status UI — must come after petBase so prestige can use attemptPrestige
  setupPetStatusUI(affection, petBase);

  // V1.4: Multiplayer system
  const mpClient = new MultiplayerClient();
  _mpClient = mpClient; // wire up the proxy reference for characterProxy
  const miniCatRenderer = new MiniCatRenderer();

  // Wire multiplayer client callbacks for mini-cat rendering
  // (set before ConnectionUI so it can chain them)
  mpClient.onUserJoined = (data) => {
    miniCatRenderer.addUser(data.userId, data.username, data.state);
  };
  mpClient.onUserLeft = (data) => {
    miniCatRenderer.removeUser(data.userId);
  };
  mpClient.onUserState = (data) => {
    miniCatRenderer.updateUser(data.userId, data);
  };
  mpClient.onUsersSnapshot = (users) => {
    miniCatRenderer.setSnapshot(users);
  };
  mpClient.onDisconnected = () => {
    miniCatRenderer.clear();
  };

  // Wire action sync — remote user typing/click → mini-cat animation
  mpClient.onUserAction = (data) => {
    miniCatRenderer.triggerAction(data.userId, data.actionType);
  };

  // Wire room events for mini-cat rendering
  // (set before ConnectionUI so it can chain them)
  mpClient.onRoomMemberJoined = (data) => {
    miniCatRenderer.addUser(data.userId, data.username, data.state);
  };
  mpClient.onRoomMemberLeft = (data) => {
    miniCatRenderer.removeUser(data.userId);
  };
  mpClient.onRoomJoined = (data) => {
    miniCatRenderer.setSnapshot(data.members);
  };
  mpClient.onRoomLeft = () => {
    miniCatRenderer.clear();
  };
  mpClient.onRoomDestroyed = () => {
    miniCatRenderer.clear();
  };

  // ConnectionUI and LeaderboardUI chain onto existing callbacks internally
  const connectionUI = new ConnectionUI(mpClient);
  const leaderboardUI = new LeaderboardUI(mpClient);

  // Wire cat size selector
  connectionUI.onCatSizeChange = (size) => {
    miniCatRenderer.setSize(size);
  };

  // Wire affection events to push state updates
  const getMultiplayerState = () => ({
    level: affection.level,
    affinity: affection.affinity,
    rebirthCount: affection.rebirthCount,
    mood: affection.mood,
    isInFlow: affection.isInFlow,
    skinId: activeCharacter?.skinId || activeCharacter?.currentSkin || 'bongo-classic',
    totalCPS: 0
  });

  // Immediate push on important events
  affection.on('levelup', () => mpClient.sendStateUpdate(getMultiplayerState(), true));
  affection.on('prestige', () => mpClient.sendStateUpdate(getMultiplayerState(), true));
  // Throttled push on normal changes
  affection.on('affinitychange', () => mpClient.sendStateUpdate(getMultiplayerState()));
  affection.on('moodchange', () => mpClient.sendStateUpdate(getMultiplayerState()));
  affection.on('flow', () => mpClient.sendStateUpdate(getMultiplayerState(), true));

  // Periodic sync
  mpClient.startPeriodicSync(getMultiplayerState);

  // Clean up multiplayer on app close to prevent JS errors
  window.addEventListener('beforeunload', () => {
    mpClient.destroy();
  });
  window.electronAPI.onBeforeQuit(() => {
    mpClient.destroy();
  });

  // Initialize connection UI from saved settings
  connectionUI.initFromSaved();

  // Listen for pet position reset (from tray menu)
  window.electronAPI.onResetPetPosition?.(() => {
    const petContainer = document.getElementById('pet-container');
    petContainer.style.left = '';
    petContainer.style.top = '';
    petContainer.style.bottom = '';
    // Let CSS defaults take over (bottom: 100px; left: calc(50% - 150px))
  });

  // V2: Clipboard image detection
  window.electronAPI.onClipboardImageDetected((data) => {
    showNotification({
      level: 'L3',
      message: `📸 检测到截图 (${data.width}×${data.height})，要识别内容吗？`,
      actions: [
        { label: '🔍 识别', action: 'ocr' },
        { label: '忽略', action: 'ignore' }
      ],
      onAction: async (action) => {
        if (action === 'ocr') {
          showCatBubble('🐱 正在打开识图...', 2000);
          try {
            await window.electronAPI.recognizeClipboardImage();
          } catch (err) {
            showCatBubble(`😿 识别失败: ${err.message}`, 5000);
          }
        }
      }
    });
  });

  // V2: Quick Panel 快捷键注册状态监听
  window.electronAPI.onQpShortcutStatus?.((status) => {
    const msgs = [];
    if (!status.toggle) msgs.push('⌘⇧Space (Quick Panel)');
    if (!status.screenshot) msgs.push('⌘⇧S (截图OCR)');
    if (msgs.length > 0) {
      showCatBubble(`🐱 快捷键 ${msgs.join('、')} 注册失败，可能被系统占用。可点击工具栏 ⚡ 按钮使用~`, 8000);
    }
  });

  console.log('ChatCat Desktop Pet V1.4 initialized!');
}

/**
 * V2 Pillar B: Drag & Drop Support
 */
function setupDragReceive() {
  const petContainer = document.getElementById('pet-container');
  if (!petContainer) return;

  petContainer.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    petContainer.classList.add('drag-hover');
  });

  petContainer.addEventListener('dragleave', () => {
    petContainer.classList.remove('drag-hover');
  });

  petContainer.addEventListener('drop', async (e) => {
    e.preventDefault();
    petContainer.classList.remove('drag-hover');

    let content = '';
    if (e.dataTransfer.getData('text/plain')) {
      content = e.dataTransfer.getData('text/plain');
    } else if (e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('text/') || /\.(txt|md|js|py|html|css|json|ts)$/i.test(file.name)) {
        content = await file.text();
      } else {
        showCatBubble('🐱 暂时只能处理文本文件哦～');
        return;
      }
    }

    if (content.trim()) {
      showDragActionMenu(content);
    }
  });
}

function showDragActionMenu(content) {
  const menu = document.createElement('div');
  menu.className = 'drag-action-menu';
  menu.innerHTML = `
    <div class="dam-title">🐱 要我怎么处理？</div>
    <button class="dam-btn" data-action="polish">✏️ 润色</button>
    <button class="dam-btn" data-action="summarize">📋 总结</button>
    <button class="dam-btn" data-action="explain">🔍 解释</button>
    <button class="dam-btn dam-cancel">取消</button>
  `;

  document.body.appendChild(menu);
  
  // Position menu near the pet
  const petRect = document.getElementById('pet-container').getBoundingClientRect();
  menu.style.left = (petRect.left + petRect.width + 10) + 'px';
  menu.style.top = petRect.top + 'px';

  menu.querySelectorAll('.dam-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const action = btn.dataset.action;
      menu.remove();
      if (!action) return;

      showCatBubble('🐱 处理中...请稍等');
      try {
        const result = await window.electronAPI.qpProcessText(action, content);
        if (result) {
          displayResult(result, action);
        } else {
          showCatBubble('🐱 没有得到处理结果，请检查API设置');
        }
      } catch (err) {
        console.error('[DragAction] qpProcessText failed:', err);
        showCatBubble(`🐱 处理失败: ${err.message || '请检查API设置'}`);
      }
    });
  });

  setTimeout(() => { if (menu.parentNode) menu.remove(); }, 10000);
}

function displayResult(result, mode) {
  if (!result) return;
  const title = { polish: '✏️ 润色结果', summarize: '📋 总结', explain: '🔍 解释' }[mode] || '处理结果';

  if (result.length < 80) {
    // Short result: show in bubble with copy button
    showNotification({
      level: 'L3',
      message: `${title}\n${result}`,
      actions: [
        { label: '📋 复制', action: 'copy' },
        { label: '忽略', action: 'dismiss' }
      ],
      onAction: (action) => {
        if (action === 'copy') {
          navigator.clipboard.writeText(result);
          showCatBubble('✅ 已复制到剪贴板');
        }
      }
    });
  } else if (result.length < 500) {
    // Medium result: show in L3 bubble with copy
    showNotification({
      level: 'L3',
      message: `${title}\n${result}`,
      actions: [
        { label: '📋 复制', action: 'copy' },
        { label: '忽略', action: 'dismiss' }
      ],
      onAction: (action) => {
        if (action === 'copy') {
          navigator.clipboard.writeText(result);
          showCatBubble('✅ 已复制到剪贴板');
        }
      }
    });
  } else {
    // Long result: open in QuickPanel
    navigator.clipboard.writeText(result);
    showCatBubble('✅ 结果已复制到剪贴板');
    quickPanelUI?.showDirectResult({ mode, result }).catch(() => {});
  }
}

/**
 * Setup a generic tabbed panel with close/maximize/drag behavior.
 */
function setupTabbedPanel(containerId, headerId, closeId, maximizeId) {
  const container = document.getElementById(containerId);
  const header = document.getElementById(headerId);
  const closeBtn = document.getElementById(closeId);
  const maximizeBtn = document.getElementById(maximizeId);

  let isMaximized = false;
  let savedPosition = null;

  // Tab bar: drag-to-scroll (no reorder)
  const tabsBar = header.querySelector('.panel-tabs');
  let tabDidDrag = false;

  if (tabsBar) {
    let isDragging = false;
    let startX = 0;
    let scrollStart = 0;
    const DRAG_THRESHOLD = 4;
    const canScrollTabs = () => tabsBar.scrollWidth > tabsBar.clientWidth + 1;
    const centerTabInView = (tabEl, smooth = true) => {
      if (!tabEl || !canScrollTabs()) return;
      const targetLeft = tabEl.offsetLeft + tabEl.offsetWidth / 2 - tabsBar.clientWidth / 2;
      const maxLeft = Math.max(0, tabsBar.scrollWidth - tabsBar.clientWidth);
      const nextLeft = Math.min(Math.max(0, targetLeft), maxLeft);
      tabsBar.scrollTo({ left: nextLeft, behavior: smooth ? 'smooth' : 'auto' });
    };

    tabsBar.addEventListener('mousedown', (e) => {
      if (e.target.closest('.chat-ctrl-btn')) return;
      isDragging = true;
      tabDidDrag = false;
      startX = e.clientX;
      scrollStart = tabsBar.scrollLeft;
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > DRAG_THRESHOLD) {
        tabDidDrag = true;
      }
      tabsBar.scrollLeft = scrollStart - dx;
    });

    document.addEventListener('mouseup', () => {
      isDragging = false;
    });

    // Mouse wheel support for horizontal tab scrolling when tabs overflow.
    tabsBar.addEventListener('wheel', (e) => {
      if (!canScrollTabs()) return;
      const delta = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      tabsBar.scrollLeft += delta;
      e.preventDefault();
    }, { passive: false });

    // Initial align: if there is an active tab, center it without animation.
    const activeTab = tabsBar.querySelector('.panel-tab.active');
    if (activeTab) {
      centerTabInView(activeTab, false);
    }

    // Expose helper on element for reuse in click handler below.
    tabsBar._centerTabInView = centerTabInView;
  }

  // Tab switching (suppress if it was a drag/reorder)
  header.querySelectorAll('.panel-tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      if (e.target.closest('.chat-ctrl-btn')) return;
      if (tabDidDrag) { tabDidDrag = false; return; }
      const beforeRect = capturePanelAnchor(container, {
        isVisible: !container.classList.contains('hidden'),
        isMaximized: isMaximized || container.classList.contains('maximized'),
      });
      const tabId = tab.dataset.tab;
      header.querySelectorAll('.panel-tab').forEach(t => t.classList.remove('active'));
      const body = container.querySelector(`#${containerId.replace('-container', '-body')}`);
      body.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
      tab.classList.add('active');
      const content = document.getElementById(`tab-${tabId}`);
      if (content) content.classList.add('active');
      header.querySelector('.panel-tabs')?._centerTabInView?.(tab, true);
      applyPanelAnchorTransition(container, beforeRect);
    });
  });

  // Close
  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    container.classList.add('hidden');
    if (isMaximized) {
      isMaximized = false;
      container.classList.remove('maximized');
      maximizeBtn.textContent = '□';
      if (savedPosition) {
        Object.assign(container.style, savedPosition);
        savedPosition = null;
      }
    }
  });

  // Maximize
  maximizeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    isMaximized = !isMaximized;
    if (isMaximized) {
      savedPosition = {
        left: container.style.left,
        top: container.style.top,
        bottom: container.style.bottom,
        right: container.style.right,
        transform: container.style.transform
      };
      container.classList.add('maximized');
      maximizeBtn.textContent = '❐';
    } else {
      container.classList.remove('maximized');
      maximizeBtn.textContent = '□';
      if (savedPosition) {
        Object.assign(container.style, savedPosition);
        savedPosition = null;
      }
    }
  });

  // Drag
  {
    let isDragging = false;
    let startX, startY, origLeft, origTop;

    header.addEventListener('mousedown', (e) => {
      if (e.target.closest('.chat-ctrl-btn') || e.target.closest('.panel-tab')) return;
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      const rect = container.getBoundingClientRect();
      origLeft = rect.left;
      origTop = rect.top;
      container.style.left = origLeft + 'px';
      container.style.top = origTop + 'px';
      container.style.bottom = 'auto';
      container.style.right = 'auto';
      container.style.transform = 'none';
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      container.style.left = (origLeft + (e.clientX - startX)) + 'px';
      container.style.top = (origTop + (e.clientY - startY)) + 'px';
    });

    document.addEventListener('mouseup', () => {
      const wasDragging = isDragging;
      isDragging = false;
      if (wasDragging) {
        _captureSharedPanelOffset(container);
      }
    });
  }
}

function setupToolbar(chatUI, quickPanel) {
  const toolbar = document.getElementById('toolbar');
  const toolsPanel = document.getElementById('tools-container');
  const funPanel = document.getElementById('fun-container');
  const settingsPanel = document.getElementById('settings-container');
  const toolsCloseBtn = document.getElementById('tools-close');
  const funCloseBtn = document.getElementById('fun-close');
  const settingsCloseBtn = document.getElementById('settings-close');

  const closeToolsPanel = () => {
    if (!toolsPanel || toolsPanel.classList.contains('hidden')) return;
    toolsCloseBtn?.click();
  };

  const closeFunPanel = () => {
    if (!funPanel || funPanel.classList.contains('hidden')) return;
    funCloseBtn?.click();
  };

  const closeSettingsPanel = () => {
    if (!settingsPanel || settingsPanel.classList.contains('hidden')) return;
    settingsCloseBtn?.click();
  };

  const closeOtherPanels = async (except) => {
    const panelMap = {
      tools: toolsPanel,
      fun: funPanel,
      settings: settingsPanel
    };
    for (const [key, panel] of Object.entries(panelMap)) {
      if (key === except) continue;
      if (panel && !panel.classList.contains('hidden')) {
        _captureSharedPanelOffset(panel);
        break;
      }
    }

    if (except !== 'tools') {
      closeToolsPanel();
    }
    if (except !== 'fun') {
      closeFunPanel();
    }
    if (except !== 'settings') {
      closeSettingsPanel();
    }
  };

  toolbar.addEventListener('click', async (e) => {
    const btn = e.target.closest('.toolbar-btn');
    if (!btn) return;

    e.stopPropagation();
    const action = btn.dataset.action;

    switch (action) {
      case 'tools': {
        const shouldShow = toolsPanel.classList.contains('hidden');
        if (!shouldShow) {
          closeToolsPanel();
          break;
        }
        await closeOtherPanels('tools');
        toolsPanel.classList.remove('hidden');
        positionAbovePet(toolsPanel);
        break;
      }
      case 'fun': {
        const shouldShow = funPanel.classList.contains('hidden');
        if (!shouldShow) {
          closeFunPanel();
          break;
        }
        await closeOtherPanels('fun');
        funPanel.classList.remove('hidden');
        positionAbovePet(funPanel);
        break;
      }
      case 'settings': {
        const shouldShow = settingsPanel.classList.contains('hidden');
        if (!shouldShow) {
          closeSettingsPanel();
          break;
        }
        await closeOtherPanels('settings');
        settingsPanel.classList.remove('hidden');
        positionAbovePet(settingsPanel);
        break;
      }
    }
  });
}

/**
 * Position a panel above the pet container, centered horizontally
 */
/**
 * Setup the independent Settings panel — loads/saves all settings.
 * Moved from ChatUI to be a standalone panel.
 */
function setupSettingsPanel(aiService, apiPresets, chatUI) {
  const ENABLE_DEV_DEBUG_TOOLS = true;
  const presetSelect = document.getElementById('setting-preset');
  const modelSelect = document.getElementById('setting-model');
  const modelCustomInput = document.getElementById('setting-model-custom');
  const enableThinkingInput = document.getElementById('setting-enable-thinking');
  const apiUrlInput = document.getElementById('setting-api-url');
  const urlGroup = document.getElementById('url-group');
  const apiKeyInput = document.getElementById('setting-api-key');
  const opacityInput = document.getElementById('setting-opacity');
  const opacityValue = document.getElementById('opacity-value');
  const visionModelInput = document.getElementById('setting-vision-model');
  const personalitySelect = document.getElementById('setting-personality');
  const openAnimationManagerBtn = document.getElementById('open-animation-manager-btn');
  const animationManagerEntryHint = document.getElementById('animation-manager-entry-hint');
  const animationManagerContainer = document.getElementById('animation-manager-container');
  const debugOpenDevtoolsBtn = document.getElementById('debug-open-devtools-btn');
  const debugCharacterTypeBtn = document.getElementById('debug-character-type-btn');
  const debugForceDrowsyBtn = document.getElementById('debug-force-drowsy-btn');
  const debugCharacterStatus = document.getElementById('debug-character-status');
  const debugToolsSection = document.getElementById('debug-tools-section');
  const animationEditorRuntime = document.getElementById('animation-editor-runtime');
  const animationEditorCurrentState = document.getElementById('animation-editor-current-state');
  const animationEditorAssetSelect = document.getElementById('animation-editor-asset-select');
  const animationEditorOpenSheetBtn = document.getElementById('animation-editor-open-sheet-btn');
  const animationEditorOpenConfigBtn = document.getElementById('animation-editor-open-config-btn');
  const animationEditorReloadBtn = document.getElementById('animation-editor-reload-btn');
  const animationEditorOpenSourceBtn = document.getElementById('animation-editor-open-source-btn');
  const animationEditorOpenFramesBtn = document.getElementById('animation-editor-open-frames-btn');
  const animationEditorOpenReferenceBtn = document.getElementById('animation-editor-open-reference-btn');
  const animationEditorExportReferenceBtn = document.getElementById('animation-editor-export-reference-btn');
  const animationEditorExportFramesBtn = document.getElementById('animation-editor-export-frames-btn');
  const animationEditorImportFramesBtn = document.getElementById('animation-editor-import-frames-btn');
  const animationEditorExportBlackBg = document.getElementById('animation-editor-export-black-bg');
  const animationEditorBakeBtn = document.getElementById('animation-editor-bake-btn');
  const animationEditorWorkflowHint = document.getElementById('animation-editor-workflow-hint');
  const animationEditorPreview = document.getElementById('animation-editor-preview');
  const animationEditorStateSelect = document.getElementById('animation-editor-state-select');
  const animationEditorStateMeta = document.getElementById('animation-editor-state-meta');
  const animationEditorStateList = document.getElementById('animation-editor-state-list');
  const animationEditorConfig = document.getElementById('animation-editor-config');
  const animationEditorSaveConfigBtn = document.getElementById('animation-editor-save-config-btn');
  const animationEditorStatus = document.getElementById('animation-editor-status');
  const animationEditorCtx = animationEditorPreview?.getContext('2d');
  const animationEditor = {
    runtimeInfo: null,
    manifest: null,
    selectedAssetId: '',
    selectedStateName: '',
    selectedSheetUrl: '',
    previewImage: null,
    previewFrame: 0,
    previewFrameTime: 0,
    previewLastTs: 0,
    previewRafId: 0,
    lastConfigAssetId: '',
  };

  const fileUrlToPath = (value) => {
    if (!value) return '';
    if (!/^file:/i.test(value)) return value;
    const url = new URL(value);
    let pathname = decodeURIComponent(url.pathname);
    if (/^\/[A-Za-z]:/.test(pathname)) pathname = pathname.slice(1);
    return pathname;
  };

  const isAnimationManagerOpen = () => !!animationManagerContainer && !animationManagerContainer.classList.contains('hidden');

  const positionAnimationManagerPanel = () => {
    if (!animationManagerContainer) return;
    const settingsContainer = document.getElementById('settings-container');
    if (settingsContainer && !settingsContainer.classList.contains('hidden')) {
      const rect = settingsContainer.getBoundingClientRect();
      const maxLeft = Math.max(10, window.innerWidth - animationManagerContainer.offsetWidth - 10);
      const maxTop = Math.max(10, window.innerHeight - animationManagerContainer.offsetHeight - 10);
      animationManagerContainer.style.left = `${Math.min(maxLeft, rect.left + 24)}px`;
      animationManagerContainer.style.top = `${Math.min(maxTop, Math.max(10, rect.top + 20))}px`;
      animationManagerContainer.style.bottom = 'auto';
      animationManagerContainer.style.right = 'auto';
      animationManagerContainer.style.transform = 'none';
      return;
    }
    positionAbovePet(animationManagerContainer);
  };

  const renderAnimationStateSummary = () => {
    if (!animationEditorCurrentState) return;
    const info = activeCharacter?.getDebugAnimationState?.() || window.__debugCatCharacterInfo?.() || {};
    animationEditorCurrentState.textContent = [
      `renderer: ${info.renderer || info.type || 'unknown'}`,
      `skinId: ${info.skinId || '-'}`,
      `currentSkin: ${info.currentSkin || '-'}`,
      `overlayState: ${info.overlayState || '-'}`,
      `state: ${info.state || '-'}`,
      `frame: ${info.frame ?? info.overlayFrame ?? '-'}`,
      `idleTimeMs: ${info.idleTimeMs ?? '-'}`,
      `nextDrowsyAtMs: ${info.nextDrowsyAtMs ?? '-'}`,
      `leftPawDown: ${info.leftPawDown ?? '-'}`,
      `rightPawDown: ${info.rightPawDown ?? '-'}`,
      `mouthOpen: ${info.mouthOpen ?? '-'}`,
      `clickExpr: ${info.clickExpr || '-'}`,
    ].join('\n');
  };

  const getSelectedAnimationAsset = () => {
    return animationEditor.manifest?.assets?.find((asset) => asset.id === animationEditor.selectedAssetId) || null;
  };

  const getSelectedAnimationState = () => {
    const asset = getSelectedAnimationAsset();
    if (!asset || asset.kind !== 'sheet' || !animationEditor.selectedStateName) return null;
    const state = asset.states?.[animationEditor.selectedStateName];
    if (!state) return null;
    return {
      asset,
      stateName: animationEditor.selectedStateName,
      state,
      workflowId: asset.workflow?.id || '',
      framePattern: asset.workflow?.framePattern || 'frame_001.png ~ frame_999.png',
    };
  };

  const getSelectedAnimationWorkflow = () => {
    const selected = getSelectedAnimationState();
    if (!selected?.workflowId) return null;
    return {
      id: selected.workflowId,
      stateName: selected.stateName,
      framePattern: selected.framePattern,
    };
  };

  const setAnimationWorkflowControlsEnabled = (enabled) => {
    [
      animationEditorOpenSourceBtn,
      animationEditorOpenFramesBtn,
      animationEditorOpenReferenceBtn,
      animationEditorExportReferenceBtn,
      animationEditorExportFramesBtn,
      animationEditorImportFramesBtn,
      animationEditorBakeBtn,
    ].forEach((btn) => {
      if (btn) btn.disabled = !enabled;
    });
  };

  const prepareAnimationWorkflow = async () => {
    const workflow = getSelectedAnimationWorkflow();
    if (!workflow?.id) return null;
    const result = await window.electronAPI.animationPrepareWorkflow?.(workflow.id, workflow.stateName);
    if (!result?.success) {
      throw new Error(result?.error || '初始化动画工作流失败');
    }
    return { ...workflow, ...(result.workflow || {}) };
  };

  const renderAnimationWorkflowSummary = () => {
    if (!animationEditorWorkflowHint) return;
    const workflow = getSelectedAnimationWorkflow();
    if (!workflow?.id) {
      animationEditorWorkflowHint.textContent = '当前动画未接入按状态工作流。';
      setAnimationWorkflowControlsEnabled(false);
      return;
    }
    animationEditorWorkflowHint.textContent = `当前动画：${workflow.stateName}。源图目录按状态隔离，逐帧命名 ${workflow.framePattern || 'frame_001.png ~ frame_999.png'}。建议流程：导出参考底图 -> 导入或编辑逐帧图 -> 烘焙当前动画。`;
    setAnimationWorkflowControlsEnabled(true);
  };

  const updateAnimationStateList = (asset) => {
    if (!animationEditorStateList) return;
    if (!asset) {
      animationEditorStateList.textContent = '暂无动画资源';
      return;
    }
    if (asset.kind !== 'sheet') {
      const lines = [
        asset.label,
        asset.description || '',
        '',
        ...((asset.files || []).map((file) => `- ${file.name}`)),
      ];
      animationEditorStateList.textContent = lines.filter(Boolean).join('\n');
      if (animationEditorStateMeta) animationEditorStateMeta.textContent = '当前资源不支持状态预览';
      return;
    }
    const selected = getSelectedAnimationState();
    if (animationEditorStateMeta) {
      if (!selected) {
        animationEditorStateMeta.textContent = '请选择一个动画状态';
      } else {
        animationEditorStateMeta.textContent = [
          `state: ${selected.stateName}`,
          `row: ${selected.state.row ?? 0}`,
          `columns: ${selected.state.columns ?? selected.asset.meta?.columns ?? '-'}`,
          `frames: ${selected.state.frames ?? '-'}`,
          `frameDuration: ${selected.state.frameDuration ?? '-'}ms`,
          `loop: ${selected.state.loop ? 'yes' : 'no'}`,
          `next: ${selected.state.next || '-'}`,
        ].join('\n');
      }
    }
    const stateLines = Object.entries(asset.states || {}).map(([name, state]) => {
      const marker = name === animationEditor.selectedStateName ? '>' : '-';
      return `${marker} ${name}: row=${state.row}, columns=${state.columns ?? asset.meta?.columns ?? '-'}, frames=${state.frames}, duration=${state.frameDuration}ms, loop=${state.loop ? 'yes' : 'no'}${state.next ? `, next=${state.next}` : ''}`;
    });
    animationEditorStateList.textContent = [
      `当前动画包: ${asset.label}`,
      asset.description || '',
      '',
      '可用动画状态:',
      ...stateLines,
    ].filter(Boolean).join('\n');
  };

  const updateAnimationConfigEditor = (asset, force = false) => {
    if (!animationEditorConfig || !asset || asset.kind !== 'sheet') return;
    if (!force && animationEditor.lastConfigAssetId === asset.id) return;
    animationEditorConfig.value = JSON.stringify(asset.meta || { states: asset.states || {} }, null, 2);
    animationEditor.lastConfigAssetId = asset.id;
  };

  const updateAnimationStateSelect = (asset) => {
    if (!animationEditorStateSelect) return;
    animationEditorStateSelect.innerHTML = '';
    const stateNames = asset?.kind === 'sheet' ? Object.keys(asset.states || {}) : [];
    if (stateNames.length === 0) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = '无可预览状态';
      animationEditorStateSelect.appendChild(opt);
      animationEditor.selectedStateName = '';
      return;
    }
    for (const stateName of stateNames) {
      const opt = document.createElement('option');
      opt.value = stateName;
      opt.textContent = stateName;
      animationEditorStateSelect.appendChild(opt);
    }
    if (!stateNames.includes(animationEditor.selectedStateName)) {
      animationEditor.selectedStateName = stateNames[0];
    }
    animationEditorStateSelect.value = animationEditor.selectedStateName;
  };

  const loadAnimationPreviewImage = async (asset) => {
    if (!asset || asset.kind !== 'sheet' || !asset.sheetUrl) {
      animationEditor.previewImage = null;
      animationEditor.selectedSheetUrl = '';
      return;
    }
    if (animationEditor.selectedSheetUrl === asset.sheetUrl && animationEditor.previewImage) return;
    animationEditor.previewImage = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('preview image load failed'));
      img.src = asset.sheetUrl;
    }).catch(() => null);
    animationEditor.selectedSheetUrl = asset.sheetUrl;
    animationEditor.previewFrame = 0;
    animationEditor.previewFrameTime = 0;
    animationEditor.previewLastTs = 0;
  };

  const drawAnimationPreview = (ts = 0) => {
    if (animationEditor.previewRafId) cancelAnimationFrame(animationEditor.previewRafId);
    animationEditor.previewRafId = requestAnimationFrame(drawAnimationPreview);
    if (!animationEditorCtx || !animationEditorPreview) return;
    const asset = getSelectedAnimationAsset();
    animationEditorCtx.clearRect(0, 0, animationEditorPreview.width, animationEditorPreview.height);
    if (!asset || asset.kind !== 'sheet' || !animationEditor.previewImage || !animationEditor.selectedStateName) return;
    const state = asset.states?.[animationEditor.selectedStateName];
    const meta = asset.meta;
    if (!state || !meta) return;
    const dt = animationEditor.previewLastTs ? (ts - animationEditor.previewLastTs) : 16;
    animationEditor.previewLastTs = ts;
    animationEditor.previewFrameTime += dt;
    if (animationEditor.previewFrameTime >= state.frameDuration) {
      animationEditor.previewFrameTime -= state.frameDuration;
      animationEditor.previewFrame += 1;
      if (animationEditor.previewFrame >= state.frames) animationEditor.previewFrame = 0;
    }
    const fw = Number(meta.frameWidth || animationEditorPreview.width);
    const fh = Number(meta.frameHeight || animationEditorPreview.height);
    const cols = Math.max(1, Number(state.columns || meta.columns || 1));
    const col = animationEditor.previewFrame % cols;
    const sx = col * fw;
    const sy = (Number(state.row || 0) + Math.floor(animationEditor.previewFrame / cols)) * fh;
    animationEditorCtx.drawImage(animationEditor.previewImage, sx, sy, fw, fh, 0, 0, animationEditorPreview.width, animationEditorPreview.height);
  };

  const refreshAnimationEditor = async (forceConfig = false) => {
    if (!debugToolsSection || !isAnimationManagerOpen()) return;
    renderAnimationStateSummary();
    const manifest = activeCharacter?.getDebugAssetManifest?.() || { assets: [] };
    animationEditor.manifest = manifest;
    if (animationEditorAssetSelect) {
      animationEditorAssetSelect.innerHTML = '';
      for (const asset of manifest.assets || []) {
        const opt = document.createElement('option');
        opt.value = asset.id;
        opt.textContent = `${asset.label}${asset.kind === 'sheet' ? ' · sheet' : ' · layers'}`;
        animationEditorAssetSelect.appendChild(opt);
      }
    }
    const assetIds = (manifest.assets || []).map((asset) => asset.id);
    if (!assetIds.includes(animationEditor.selectedAssetId)) {
      animationEditor.selectedAssetId = assetIds[0] || '';
    }
    if (animationEditorAssetSelect && animationEditor.selectedAssetId) {
      animationEditorAssetSelect.value = animationEditor.selectedAssetId;
    }
    const asset = getSelectedAnimationAsset();
    updateAnimationStateSelect(asset);
    updateAnimationStateList(asset);
    renderAnimationWorkflowSummary();
    updateAnimationConfigEditor(asset, forceConfig);
    await loadAnimationPreviewImage(asset);
    if (animationEditorStatus) {
      animationEditorStatus.textContent = asset
        ? `已加载: ${asset.label}${animationEditor.selectedStateName ? ` / ${animationEditor.selectedStateName}` : ''}`
        : '未找到动画资源';
    }
  };

  async function populateModels(presetKey, savedModel, savedUrl) {
    const preset = apiPresets[presetKey];
    const needsUrl = !preset || (preset && preset.needsUrl);
    urlGroup.style.display = needsUrl ? '' : 'none';
    if (needsUrl && savedUrl) {
      apiUrlInput.value = savedUrl;
    } else if (!needsUrl) {
      apiUrlInput.value = preset ? preset.url : '';
    }

    if (presetKey === 'ollama') {
      const baseUrl = (needsUrl ? apiUrlInput.value : (preset?.url || '')).trim();
      modelSelect.style.display = '';
      modelCustomInput.style.display = 'none';
      modelSelect.innerHTML = '';
      const loadingOpt = document.createElement('option');
      loadingOpt.value = '';
      loadingOpt.textContent = '正在读取本地 Ollama 模型...';
      modelSelect.appendChild(loadingOpt);

      const models = await _fetchOllamaModels(baseUrl);
      if (models.length > 0) {
        modelSelect.innerHTML = '';
        for (const m of models) {
          const opt = document.createElement('option');
          opt.value = m;
          opt.textContent = m;
          modelSelect.appendChild(opt);
        }
        if (savedModel && models.includes(savedModel)) {
          modelSelect.value = savedModel;
        } else {
          modelSelect.value = models[0];
        }
      } else {
        modelSelect.style.display = 'none';
        modelCustomInput.style.display = '';
        modelCustomInput.placeholder = '未检测到本地模型，可手动输入（如 llama3.2:3b）';
        modelCustomInput.value = savedModel || preset?.model || '';
      }
      return;
    }

    if (preset && preset.models && preset.models.length > 0) {
      modelSelect.style.display = '';
      modelCustomInput.style.display = 'none';
      modelSelect.innerHTML = '';
      for (const m of preset.models) {
        const opt = document.createElement('option');
        opt.value = m;
        opt.textContent = m;
        modelSelect.appendChild(opt);
      }
      if (savedModel && preset.models.includes(savedModel)) {
        modelSelect.value = savedModel;
      } else {
        modelSelect.value = preset.model;
      }
    } else {
      modelSelect.style.display = 'none';
      modelCustomInput.style.display = '';
      modelCustomInput.value = savedModel || preset?.model || '';
    }
  }

  async function _fetchOllamaModels(baseUrl) {
    const cleaned = (baseUrl || '').trim().replace(/\/+$/, '');
    if (!cleaned) return [];
    const tagsUrl = cleaned.endsWith('/v1') ? `${cleaned.slice(0, -3)}/api/tags` : `${cleaned}/api/tags`;
    try {
      const response = await fetch(tagsUrl, { method: 'GET' });
      if (!response.ok) return [];
      const data = await response.json();
      const models = Array.isArray(data.models) ? data.models : [];
      return models.map(item => item?.name).filter(n => typeof n === 'string' && n.trim()).map(n => n.trim());
    } catch {
      return [];
    }
  }

  function _renderMemoryList() {
    const listEl = document.getElementById('memory-list');
    if (!listEl) return;
    const mm = aiService._memoryManager;
    if (!mm) {
      listEl.innerHTML = '<div class="memory-empty"><img src="illustrations/empty-memory.png" class="ill-empty" alt=""><div>暂无记忆</div></div>';
      return;
    }
    const memories = mm.getAll();
    if (memories.length === 0) {
      listEl.innerHTML = '<div class="memory-empty"><img src="illustrations/empty-memory.png" class="ill-empty" alt=""><div>暂无记忆</div></div>';
      return;
    }
    listEl.innerHTML = '';
    for (const mem of memories) {
      const item = document.createElement('div');
      item.className = 'memory-item';
      const catBadge = document.createElement('span');
      catBadge.className = 'memory-category';
      catBadge.textContent = mem.category;
      const factEl = document.createElement('span');
      factEl.className = 'memory-fact';
      factEl.textContent = mem.fact;
      const delBtn = document.createElement('button');
      delBtn.className = 'memory-delete';
      delBtn.textContent = '×';
      delBtn.addEventListener('click', () => {
        mm.deleteMemory(mem.id);
        _renderMemoryList();
      });
      item.appendChild(catBadge);
      item.appendChild(factEl);
      item.appendChild(delBtn);
      listEl.appendChild(item);
    }
  }

  async function loadSettings() {
    apiKeyInput.value = await window.electronAPI.getStore('apiKey') || '';
    const opacity = await window.electronAPI.getStore('opacity') || 1;
    opacityInput.value = opacity;
    opacityValue.textContent = Math.round(opacity * 100) + '%';

    const savedPreset = await window.electronAPI.getStore('apiPreset') || 'custom';
    presetSelect.value = savedPreset;

    const savedModel = await window.electronAPI.getStore('modelName') || '';
    const savedUrl = await window.electronAPI.getStore('apiBaseUrl') || '';
    await populateModels(savedPreset, savedModel, savedUrl);
    if (enableThinkingInput) {
      enableThinkingInput.checked = await window.electronAPI.getStore('enableThinking') === true;
    }
    if (visionModelInput) {
      visionModelInput.value = await window.electronAPI.getStore('visionModel') || '';
    }
    if (personalitySelect) {
      personalitySelect.value = await window.electronAPI.getStore('catPersonality') || 'lively';
    }

    _renderMemoryList();

    const skillsEnabled = await window.electronAPI.getStore('skillsEnabled') || {};
    const elMap = {
      'skill-text-converter': skillsEnabled.textConverter !== false,
      'skill-daily-report': skillsEnabled.dailyReport !== false,
      'skill-todo-extractor': skillsEnabled.todoExtractor !== false,
    };
    for (const [id, val] of Object.entries(elMap)) {
      const el = document.getElementById(id);
      if (el) el.checked = val;
    }
    const skillReportHour = document.getElementById('skill-report-hour');
    if (skillReportHour) skillReportHour.value = await window.electronAPI.getStore('dailyReportHour') || 18;
    const todoIntervalInput = document.getElementById('todo-remind-interval');
    if (todoIntervalInput) todoIntervalInput.value = await window.electronAPI.getStore('todoRemindInterval') || 30;

    const reportDirInput = document.getElementById('daily-report-dir');
    if (reportDirInput) reportDirInput.value = await window.electronAPI.getStore('dailyReportOutputDir') || '';

    const proactiveConfig = await window.electronAPI.getStore('proactiveConfig') || {};
    const proactiveEnabled = document.getElementById('proactive-enabled');
    const proactiveMaxDaily = document.getElementById('proactive-max-daily');
    const proactiveFreqValue = document.getElementById('proactive-freq-value');
    const quietStart = document.getElementById('quiet-start');
    const quietEnd = document.getElementById('quiet-end');

    if (proactiveEnabled) proactiveEnabled.checked = proactiveConfig.enabled !== false;
    if (proactiveMaxDaily) {
      proactiveMaxDaily.value = proactiveConfig.maxDailyInteractions || 8;
      if (proactiveFreqValue) proactiveFreqValue.textContent = proactiveMaxDaily.value;
    }
    if (quietStart) quietStart.value = proactiveConfig.quietHours?.start ?? 23;
    if (quietEnd) quietEnd.value = proactiveConfig.quietHours?.end ?? 7;

    const enabledTypes = proactiveConfig.enabledSceneTypes || ['info', 'care', 'efficiency', 'chat'];
    for (const t of ['info', 'care', 'efficiency', 'chat']) {
      const el = document.getElementById(`scene-${t}`);
      if (el) el.checked = enabledTypes.includes(t);
    }
  }

  // Event listeners
  presetSelect?.addEventListener('change', async () => {
    await populateModels(presetSelect.value, null, '');
  });

  apiUrlInput?.addEventListener('change', async () => {
    if (presetSelect.value === 'ollama') {
      await populateModels(presetSelect.value,
        modelSelect.style.display !== 'none' ? modelSelect.value : modelCustomInput.value.trim(),
        apiUrlInput.value.trim()
      );
    }
  });

  opacityInput?.addEventListener('input', () => {
    opacityValue.textContent = Math.round(parseFloat(opacityInput.value) * 100) + '%';
  });

  const proactiveSlider = document.getElementById('proactive-max-daily');
  const proactiveFreqDisplay = document.getElementById('proactive-freq-value');
  if (proactiveSlider && proactiveFreqDisplay) {
    proactiveSlider.addEventListener('input', () => {
      proactiveFreqDisplay.textContent = proactiveSlider.value;
    });
  }

  // Save button
  document.getElementById('settings-save')?.addEventListener('click', async () => {
    const presetKey = presetSelect.value;
    const preset = apiPresets[presetKey];

    let selectedModel;
    let apiUrl;

    if (preset && !preset.needsUrl) {
      apiUrl = preset.url;
      selectedModel = modelSelect.style.display !== 'none' ? modelSelect.value : modelCustomInput.value.trim();
    } else {
      apiUrl = apiUrlInput.value.trim();
      selectedModel = modelCustomInput.value.trim();
    }

    await window.electronAPI.setStore('apiBaseUrl', apiUrl);
    await window.electronAPI.setStore('modelName', selectedModel);
    await window.electronAPI.setStore('enableThinking', enableThinkingInput?.checked === true);
    await window.electronAPI.setStore('apiKey', apiKeyInput.value);
    await window.electronAPI.setStore('opacity', parseFloat(opacityInput.value));
    await window.electronAPI.setStore('apiPreset', presetKey);

    if (visionModelInput) {
      await window.electronAPI.setStore('visionModel', visionModelInput.value.trim());
    }
    if (personalitySelect) {
      await window.electronAPI.setStore('catPersonality', personalitySelect.value);
    }

    await aiService.loadConfig();

    const skillsEnabled = {
      textConverter: document.getElementById('skill-text-converter')?.checked !== false,
      dailyReport: document.getElementById('skill-daily-report')?.checked !== false,
      todoExtractor: document.getElementById('skill-todo-extractor')?.checked !== false
    };
    await window.electronAPI.setStore('skillsEnabled', skillsEnabled);

    const reportHour = parseInt(document.getElementById('skill-report-hour')?.value) || 18;
    await window.electronAPI.setStore('dailyReportHour', reportHour);

    const todoInterval = parseInt(document.getElementById('todo-remind-interval')?.value) || 30;
    await window.electronAPI.setStore('todoRemindInterval', todoInterval);

    const proactiveConfig = {
      enabled: document.getElementById('proactive-enabled')?.checked !== false,
      maxDailyInteractions: parseInt(document.getElementById('proactive-max-daily')?.value) || 8,
      quietHours: {
        start: parseInt(document.getElementById('quiet-start')?.value) || 23,
        end: parseInt(document.getElementById('quiet-end')?.value) || 7
      },
      enabledSceneTypes: [
        ...(document.getElementById('scene-info')?.checked ? ['info'] : []),
        ...(document.getElementById('scene-care')?.checked ? ['care'] : []),
        ...(document.getElementById('scene-efficiency')?.checked ? ['efficiency'] : []),
        ...(document.getElementById('scene-chat')?.checked ? ['chat'] : [])
      ]
    };
    await window.electronAPI.setStore('proactiveConfig', proactiveConfig);

    if (chatUI._onSettingsSaved) chatUI._onSettingsSaved();
  });

  // Memory clear
  document.getElementById('memory-clear-btn')?.addEventListener('click', () => {
    if (aiService._memoryManager) {
      aiService._memoryManager.clearAll();
      _renderMemoryList();
    }
  });

  // Daily report dir picker
  const reportDirBtn = document.getElementById('daily-report-dir-btn');
  const reportDirInput = document.getElementById('daily-report-dir');
  if (reportDirBtn && reportDirInput) {
    const pickDir = async () => {
      const result = await window.electronAPI.dailyReportSetDir();
      if (result.outputDir) reportDirInput.value = result.outputDir;
    };
    reportDirBtn.addEventListener('click', pickDir);
    reportDirInput.addEventListener('click', pickDir);
  }

  // Test Connection
  const testBtn = document.getElementById('test-connection-btn');
  const testStatus = document.getElementById('test-connection-status');
  const testMetrics = document.getElementById('test-connection-metrics');
  const testMessageInput = document.getElementById('test-message-input');
  if (testBtn && testStatus) {
    testBtn.addEventListener('click', async () => {
      const presetKey = presetSelect.value;
      const preset = apiPresets[presetKey];

      let apiUrl = preset ? preset.url : '';
      let selectedModel = modelSelect.style.display !== 'none' ? modelSelect.value : modelCustomInput.value.trim();

      if (presetKey === 'custom' || !preset || preset.needsUrl) {
        apiUrl = apiUrlInput.value.trim();
        selectedModel = modelCustomInput.style.display !== 'none' ? modelCustomInput.value.trim() : modelSelect.value;
      }

      const apiKey = apiKeyInput.value.trim();
      if (presetKey !== 'ollama' && !apiKey) {
        testStatus.textContent = '❌ 请输入 API Key';
        testStatus.style.color = 'var(--text-danger, #ff4d4f)';
        return;
      }
      if (!apiUrl) {
        testStatus.textContent = '❌ 请输入 API 地址';
        testStatus.style.color = 'var(--text-danger, #ff4d4f)';
        return;
      }

      testBtn.disabled = true;
      testBtn.textContent = '测试中...';
      testStatus.textContent = '';
      if (testMetrics) testMetrics.textContent = '';

      try {
        const testMessage = testMessageInput?.value?.trim() || '请回复：连接测试通过';
        const probe = await aiService.testConnection(apiUrl, apiKey, selectedModel, { preset: presetKey, testMessage });
        const latencyMs = Math.max(0, Number(probe?.latencyMs || 0));
        testStatus.textContent = `✅ 连接成功 · ${latencyMs}ms`;
        testStatus.style.color = 'var(--text-success, #52c41a)';
        if (testMetrics) {
          const text = String(probe?.output || '').trim();
          let evalText = '无有效回复';
          if (text && text.length >= 2) {
            if (/error|invalid|forbidden|unauthorized|错误|失败/i.test(text)) evalText = '返回异常内容';
            else {
              const hint = testMessage && text.includes(testMessage.slice(0, 4)) ? '（偏复述）' : '';
              evalText = `回复正常，${text.length}字${hint}`;
            }
          } else if (text.length < 2 && text.length > 0) evalText = '回复过短';
          testMetrics.textContent = `测评: ${evalText}`;
          testMetrics.style.color = '#888';
        }
      } catch (err) {
        testStatus.textContent = `❌ 失败: ${err.message}`;
        testStatus.style.color = 'var(--text-danger, #ff4d4f)';
        if (testMetrics) testMetrics.textContent = '';
      } finally {
        testBtn.disabled = false;
        testBtn.textContent = '测试连接';
      }
    });
  }

  const initDebugTools = async () => {
    if (!debugToolsSection) return;
    if (!ENABLE_DEV_DEBUG_TOOLS) {
      openAnimationManagerBtn?.style.setProperty('display', 'none');
      if (animationManagerEntryHint) animationManagerEntryHint.textContent = '动画管理器当前已关闭。';
      animationManagerContainer?.classList.add('hidden');
      return;
    }
    const runtimeInfo = await window.electronAPI.getRuntimeInfo?.().catch(() => ({
      isPackaged: false,
      isDev: false,
      version: 'unknown',
    }));
    animationEditor.runtimeInfo = runtimeInfo || { isPackaged: false, isDev: false, version: 'unknown' };
    if (animationEditorRuntime) {
      animationEditorRuntime.textContent = `运行时: version=${animationEditor.runtimeInfo.version} | isDev=${animationEditor.runtimeInfo.isDev} | isPackaged=${animationEditor.runtimeInfo.isPackaged}`;
    }
    if (animationEditor.runtimeInfo.isPackaged) {
      openAnimationManagerBtn?.style.setProperty('display', 'none');
      if (animationManagerEntryHint) animationManagerEntryHint.textContent = '打包版本默认隐藏动画管理器。';
      animationManagerContainer?.classList.add('hidden');
      return;
    }
    openAnimationManagerBtn?.style.setProperty('display', 'inline-flex');
    if (animationManagerEntryHint) animationManagerEntryHint.textContent = '点击按钮，在独立弹层中查看预览、状态和配置。';
    debugToolsSection.style.display = '';
    await refreshAnimationEditor(true);
    if (!animationEditor.previewRafId) {
      animationEditor.previewRafId = requestAnimationFrame(drawAnimationPreview);
    }
  };

  openAnimationManagerBtn?.addEventListener('click', async () => {
    if (!ENABLE_DEV_DEBUG_TOOLS || !animationManagerContainer) return;
    animationManagerContainer.classList.remove('hidden');
    positionAnimationManagerPanel();
    await initDebugTools();
  });

  debugOpenDevtoolsBtn?.addEventListener('click', async () => {
    if (!ENABLE_DEV_DEBUG_TOOLS) return;
    try {
      await window.electronAPI.openDevTools?.();
      if (debugCharacterStatus) debugCharacterStatus.textContent = '已请求打开调试控制台';
    } catch (err) {
      if (debugCharacterStatus) debugCharacterStatus.textContent = `打开调试控制台失败: ${err.message}`;
    }
  });

  debugCharacterTypeBtn?.addEventListener('click', () => {
    if (!ENABLE_DEV_DEBUG_TOOLS) return;
    try {
      const info = window.__debugCatCharacterInfo?.() || {
        type: window.__debugCatCharacterType?.() || 'UnknownCharacter',
        skinId: null,
        currentSkin: null,
        overlayState: null,
        overlaySuppressMs: 0,
      };
      if (debugCharacterStatus) {
        debugCharacterStatus.textContent = `当前角色实例: ${info.type} | skinId: ${info.skinId || '-'} | currentSkin: ${info.currentSkin || '-'} | overlay: ${info.overlayState || '-'} | suppress: ${info.overlaySuppressMs}ms`;
      }
      refreshAnimationEditor();
    } catch (err) {
      if (debugCharacterStatus) debugCharacterStatus.textContent = `检查角色实例失败: ${err.message}`;
    }
  });

  debugForceDrowsyBtn?.addEventListener('click', () => {
    if (!ENABLE_DEV_DEBUG_TOOLS) return;
    try {
      window.__debugForceCatDrowsy?.();
      if (debugCharacterStatus) debugCharacterStatus.textContent = '已触发犯困测试，请观察猫咪和控制台日志';
      setTimeout(() => { refreshAnimationEditor(); }, 80);
    } catch (err) {
      if (debugCharacterStatus) debugCharacterStatus.textContent = `触发犯困失败: ${err.message}`;
    }
  });

  animationEditorAssetSelect?.addEventListener('change', async () => {
    if (!ENABLE_DEV_DEBUG_TOOLS) return;
    animationEditor.selectedAssetId = animationEditorAssetSelect.value;
    animationEditor.lastConfigAssetId = '';
    await refreshAnimationEditor(true);
  });

  animationEditorStateSelect?.addEventListener('change', () => {
    if (!ENABLE_DEV_DEBUG_TOOLS) return;
    animationEditor.selectedStateName = animationEditorStateSelect.value;
    animationEditor.previewFrame = 0;
    animationEditor.previewFrameTime = 0;
    animationEditor.previewLastTs = 0;
    updateAnimationStateList(getSelectedAnimationAsset());
    renderAnimationWorkflowSummary();
    if (animationEditorStatus) {
      const asset = getSelectedAnimationAsset();
      animationEditorStatus.textContent = asset
        ? `已切换到: ${asset.label} / ${animationEditor.selectedStateName || '-'}`
        : '未找到动画资源';
    }
  });

  animationEditorOpenSheetBtn?.addEventListener('click', async () => {
    if (!ENABLE_DEV_DEBUG_TOOLS) return;
    const asset = getSelectedAnimationAsset();
    const target = fileUrlToPath(asset?.sheetUrl || asset?.revealPath || '');
    if (!target) return;
    await window.electronAPI.openFilePath?.(target);
  });

  animationEditorOpenConfigBtn?.addEventListener('click', async () => {
    if (!ENABLE_DEV_DEBUG_TOOLS) return;
    const asset = getSelectedAnimationAsset();
    const target = fileUrlToPath(asset?.configUrl || asset?.revealPath || '');
    if (!target) return;
    await window.electronAPI.openFilePath?.(target);
  });

  animationEditorOpenSourceBtn?.addEventListener('click', async () => {
    if (!ENABLE_DEV_DEBUG_TOOLS) return;
    try {
      const workflow = await prepareAnimationWorkflow();
      if (!workflow?.sourceDir) return;
      await window.electronAPI.openPath?.(workflow.sourceDir);
    } catch (err) {
      if (animationEditorStatus) animationEditorStatus.textContent = `打开源目录失败: ${err.message}`;
    }
  });

  animationEditorOpenFramesBtn?.addEventListener('click', async () => {
    if (!ENABLE_DEV_DEBUG_TOOLS) return;
    try {
      const workflow = await prepareAnimationWorkflow();
      if (!workflow?.framesDir) return;
      await window.electronAPI.openPath?.(workflow.framesDir);
    } catch (err) {
      if (animationEditorStatus) animationEditorStatus.textContent = `打开 frames 失败: ${err.message}`;
    }
  });

  animationEditorOpenReferenceBtn?.addEventListener('click', async () => {
    if (!ENABLE_DEV_DEBUG_TOOLS) return;
    try {
      const workflow = await prepareAnimationWorkflow();
      if (!workflow?.referencePath) return;
      const exportResult = await window.electronAPI.animationExportReference?.(workflow.id, workflow.stateName);
      if (exportResult?.success === false) {
        throw new Error(exportResult.error || '导出参考底图失败');
      }
      await window.electronAPI.openPath?.(workflow.referencePath);
    } catch (err) {
      if (animationEditorStatus) animationEditorStatus.textContent = `打开参考底图失败: ${err.message}`;
    }
  });

  animationEditorExportReferenceBtn?.addEventListener('click', async () => {
    if (!ENABLE_DEV_DEBUG_TOOLS) return;
    try {
      const workflow = getSelectedAnimationWorkflow();
      if (!workflow?.id) return;
      const result = await window.electronAPI.animationExportReference?.(workflow.id, workflow.stateName);
      if (!result?.success) throw new Error(result?.error || '导出参考底图失败');
      if (animationEditorStatus) animationEditorStatus.textContent = `参考底图已导出: ${workflow.stateName}/reference/base.png`;
    } catch (err) {
      if (animationEditorStatus) animationEditorStatus.textContent = `导出参考底图失败: ${err.message}`;
    }
  });

  animationEditorExportFramesBtn?.addEventListener('click', async () => {
    if (!ENABLE_DEV_DEBUG_TOOLS) return;
    try {
      const workflow = getSelectedAnimationWorkflow();
      if (!workflow?.id) return;
      const useBlackBackground = animationEditorExportBlackBg?.checked === true;
      const result = await window.electronAPI.animationExportStateFrames?.(workflow.id, workflow.stateName, {
        blackBackground: useBlackBackground,
      });
      if (!result?.success) throw new Error(result?.error || '导出当前动画帧失败');
      if (animationEditorStatus) {
        animationEditorStatus.textContent = useBlackBackground
          ? `已导出 ${result.frames || 0} 帧到 ${workflow.stateName}/frames-black`
          : `已导出 ${result.frames || 0} 帧到 ${workflow.stateName}/frames`;
      }
    } catch (err) {
      if (animationEditorStatus) animationEditorStatus.textContent = `导出当前动画帧失败: ${err.message}`;
    }
  });

  animationEditorImportFramesBtn?.addEventListener('click', async () => {
    if (!ENABLE_DEV_DEBUG_TOOLS) return;
    try {
      const workflow = getSelectedAnimationWorkflow();
      if (!workflow?.id) return;
      const result = await window.electronAPI.animationImportStateFrames?.(workflow.id, workflow.stateName);
      if (result?.cancelled) {
        if (animationEditorStatus) animationEditorStatus.textContent = '已取消导入';
        return;
      }
      if (!result?.success) throw new Error(result?.error || '导入当前动画帧失败');
      if (animationEditorStatus) animationEditorStatus.textContent = `已导入 ${result.count || 0} 帧到 ${workflow.stateName}/frames`;
    } catch (err) {
      if (animationEditorStatus) animationEditorStatus.textContent = `导入当前动画帧失败: ${err.message}`;
    }
  });

  animationEditorBakeBtn?.addEventListener('click', async () => {
    if (!ENABLE_DEV_DEBUG_TOOLS) return;
    try {
      const workflow = getSelectedAnimationWorkflow();
      if (!workflow?.id) return;
      const result = await window.electronAPI.animationBakeSheet?.(workflow.id, workflow.stateName);
      if (!result?.success) throw new Error(result?.error || '烘焙 spritesheet 失败');
      animationEditor.previewImage = null;
      animationEditor.selectedSheetUrl = '';
      animationEditor.lastConfigAssetId = '';
      await activeCharacter?.reloadAssets?.();
      await refreshAnimationEditor(true);
      if (animationEditorStatus) animationEditorStatus.textContent = `烘焙完成: ${workflow.stateName} 共 ${result.frameFiles?.length || 0} 帧`;
    } catch (err) {
      if (animationEditorStatus) animationEditorStatus.textContent = `烘焙失败: ${err.message}`;
    }
  });

  animationEditorReloadBtn?.addEventListener('click', async () => {
    if (!ENABLE_DEV_DEBUG_TOOLS) return;
    try {
      await activeCharacter?.reloadAssets?.();
      await refreshAnimationEditor(true);
      if (animationEditorStatus) animationEditorStatus.textContent = '动画资源已重载';
    } catch (err) {
      if (animationEditorStatus) animationEditorStatus.textContent = `重载失败: ${err.message}`;
    }
  });

  animationEditorSaveConfigBtn?.addEventListener('click', async () => {
    if (!ENABLE_DEV_DEBUG_TOOLS) return;
    const asset = getSelectedAnimationAsset();
    if (!asset?.configUrl || !animationEditorConfig) return;
    try {
      const parsed = JSON.parse(animationEditorConfig.value);
      await window.electronAPI.saveFile?.(fileUrlToPath(asset.configUrl), JSON.stringify(parsed, null, 2));
      await activeCharacter?.reloadAssets?.();
      animationEditor.lastConfigAssetId = '';
      await refreshAnimationEditor(true);
      if (animationEditorStatus) animationEditorStatus.textContent = '配置已保存并重载';
    } catch (err) {
      if (animationEditorStatus) animationEditorStatus.textContent = `保存失败: ${err.message}`;
    }
  });

  // Load settings on panel open
  // Use MutationObserver to detect when settings panel becomes visible
  const settingsContainer = document.getElementById('settings-container');
  if (settingsContainer) {
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.attributeName === 'class' && !settingsContainer.classList.contains('hidden')) {
          loadSettings();
          if (ENABLE_DEV_DEBUG_TOOLS) initDebugTools();
          break;
        }
      }
    });
    observer.observe(settingsContainer, { attributes: true, attributeFilter: ['class'] });
  }

  setInterval(() => {
    if (!ENABLE_DEV_DEBUG_TOOLS) return;
    if (!isAnimationManagerOpen()) return;
    refreshAnimationEditor();
  }, 500);

}

function positionAbovePet(panel) {
  if (panel.classList.contains('maximized')) return;

  const petContainer = document.getElementById('pet-container');
  const petRect = petContainer.getBoundingClientRect();
  const panelWidth = panel.offsetWidth || 280;
  const panelHeight = panel.offsetHeight || 220;
  const { dx, dy } = _getSharedPanelOffset();

  const baseLeft = petRect.left + (petRect.width / 2) - (panelWidth / 2);
  const baseTop = petRect.top - panelHeight - 20;
  const left = baseLeft + dx;
  const top = baseTop + dy;
  const maxLeft = Math.max(10, window.innerWidth - panelWidth - 10);
  const maxTop = Math.max(10, window.innerHeight - panelHeight - 10);

  panel.style.left = Math.min(maxLeft, Math.max(10, left)) + 'px';
  panel.style.top = Math.min(maxTop, Math.max(10, top)) + 'px';
  panel.style.bottom = 'auto';
  panel.style.right = 'auto';
  panel.style.transform = 'none';
}

function _getSharedPanelOffset() {
  const state = (window.__panelAnchorState ||= { dx: 0, dy: 0 });
  const dx = Number(state.dx || 0);
  const dy = Number(state.dy || 0);
  return {
    dx: Number.isFinite(dx) ? dx : 0,
    dy: Number.isFinite(dy) ? dy : 0,
  };
}

function _captureSharedPanelOffset(panel) {
  if (!panel || panel.classList.contains('hidden') || panel.classList.contains('maximized')) return;
  const petContainer = document.getElementById('pet-container');
  if (!petContainer) return;

  const petRect = petContainer.getBoundingClientRect();
  const panelRect = panel.getBoundingClientRect();
  const baseLeft = petRect.left + (petRect.width / 2) - (panelRect.width / 2);
  const baseTop = petRect.top - panelRect.height - 20;
  const dx = panelRect.left - baseLeft;
  const dy = panelRect.top - baseTop;

  window.__panelAnchorState = {
    dx: Number.isFinite(dx) ? dx : 0,
    dy: Number.isFinite(dy) ? dy : 0,
  };
}

function setupToolbarHover() {
  const petContainer = document.getElementById('pet-container');
  const toolbar = document.getElementById('toolbar');
  const toolbarState = (window.__catToolbarState ||= {
    hoveringPet: false,
    hoveringToolbar: false,
    isDraggingPet: false,
    syncToolbarVisibility: null,
  });
  let hideTimeout = null;

  function showToolbar() {
    clearTimeout(hideTimeout);
    toolbar.classList.add('visible');
  }

  function hideToolbarIfAllowed() {
    clearTimeout(hideTimeout);
    if (toolbarState.hoveringPet || toolbarState.hoveringToolbar || toolbarState.isDraggingPet) {
      toolbar.classList.add('visible');
      return;
    }
    hideTimeout = setTimeout(() => {
      if (toolbarState.hoveringPet || toolbarState.hoveringToolbar || toolbarState.isDraggingPet) return;
      toolbar.classList.remove('visible');
    }, 400);
  }

  toolbarState.syncToolbarVisibility = () => {
    if (toolbarState.hoveringPet || toolbarState.hoveringToolbar || toolbarState.isDraggingPet) {
      showToolbar();
    } else {
      hideToolbarIfAllowed();
    }
  };

  petContainer.addEventListener('mouseenter', () => {
    toolbarState.hoveringPet = true;
    toolbarState.syncToolbarVisibility?.();
  });
  petContainer.addEventListener('mouseleave', () => {
    toolbarState.hoveringPet = false;
    toolbarState.syncToolbarVisibility?.();
  });
  toolbar.addEventListener('mouseenter', () => {
    toolbarState.hoveringToolbar = true;
    toolbarState.syncToolbarVisibility?.();
  });
  toolbar.addEventListener('mouseleave', () => {
    toolbarState.hoveringToolbar = false;
    toolbarState.syncToolbarVisibility?.();
  });
}

function setupDrag() {
  const petContainer = document.getElementById('pet-container');
  const toolbarState = (window.__catToolbarState ||= {
    hoveringPet: false,
    hoveringToolbar: false,
    isDraggingPet: false,
    syncToolbarVisibility: null,
  });
  const panelIds = ['settings-container', 'animation-manager-container', 'tools-container', 'fun-container'];
  let isDragging = false;
  let lastX, lastY;

  petContainer.addEventListener('mousedown', (e) => {
    if (e.target.closest('#toolbar') || e.target.closest('.toolbar-btn')) return;
    if (e.button === 0) {
      isDragging = true;
      toolbarState.isDraggingPet = true;
      toolbarState.syncToolbarVisibility?.();
      lastX = e.screenX;
      lastY = e.screenY;
      // Snapshot current position into style.left/top for parseFloat tracking
      const rect = petContainer.getBoundingClientRect();
      petContainer.style.left = rect.left + 'px';
      petContainer.style.top = rect.top + 'px';
      petContainer.style.bottom = 'auto';
      petContainer.style.cursor = 'grabbing';
    }
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const dx = e.screenX - lastX;
    const dy = e.screenY - lastY;
    lastX = e.screenX;
    lastY = e.screenY;

    petContainer.style.left = (parseFloat(petContainer.style.left) + dx) + 'px';
    petContainer.style.top = (parseFloat(petContainer.style.top) + dy) + 'px';

    for (const id of panelIds) {
      const panel = document.getElementById(id);
      if (panel.classList.contains('hidden') || panel.classList.contains('maximized')) continue;
      panel.style.left = (parseFloat(panel.style.left) + dx) + 'px';
      panel.style.top = (parseFloat(panel.style.top) + dy) + 'px';
      panel.style.bottom = 'auto';
      panel.style.right = 'auto';
      panel.style.transform = 'none';
    }

    // Multi-monitor: tell main process the screen-coordinate of the cat center
    // so it can move the window to the correct display if needed.
    window.electronAPI.moveToDisplay(e.screenX, e.screenY);

  });

  document.addEventListener('mouseup', () => {
    toolbarState.isDraggingPet = false;
    toolbarState.syncToolbarVisibility?.();
    isDragging = false;
    petContainer.style.cursor = 'grab';
  });

  // Listen for display-changed event from main process
  // When the window moves to a new display, re-position the cat relative to the new window
  window.electronAPI.onDisplayChanged?.((data) => {
    const { bounds, prevBounds } = data;
    // The window just moved from prevBounds to bounds.
    // Translate the pet position: pet was at clientX relative to old window origin,
    // now needs to be at an equivalent screen position relative to the new window origin.
    const rect = petContainer.getBoundingClientRect();
    // Pet's screen position was: prevBounds.x + rect.left, prevBounds.y + rect.top
    // New client position should be: (prevScreenX - bounds.x), (prevScreenY - bounds.y)
    const petScreenX = prevBounds.x + rect.left;
    const petScreenY = prevBounds.y + rect.top;
    const newClientX = petScreenX - bounds.x;
    const newClientY = petScreenY - bounds.y;

    petContainer.style.left = newClientX + 'px';
    petContainer.style.top = newClientY + 'px';
    petContainer.style.bottom = 'auto';

    // Also reposition any visible panels
    for (const id of panelIds) {
      const panel = document.getElementById(id);
      if (panel.classList.contains('hidden') || panel.classList.contains('maximized')) continue;
      const panelRect = panel.getBoundingClientRect();
      const panelScreenX = prevBounds.x + panelRect.left;
      const panelScreenY = prevBounds.y + panelRect.top;
      panel.style.left = (panelScreenX - bounds.x) + 'px';
      panel.style.top = (panelScreenY - bounds.y) + 'px';
      panel.style.bottom = 'auto';
      panel.style.right = 'auto';
      panel.style.transform = 'none';
    }

  });
}

function setupClickThrough() {
  const selectors = '#pet-container, #settings-container, #animation-manager-container, #tools-container, #fun-container, .mini-cat, .drag-action-menu';
  let lastIgnoreState = true; // start as ignored (transparent)

  document.addEventListener('mouseenter', (e) => {
    if (e.target.closest && e.target.closest(selectors)) {
      if (lastIgnoreState !== false) {
        lastIgnoreState = false;
        window.electronAPI.setIgnoreMouse(false);
      }
    }
  }, true);

  document.addEventListener('mouseleave', (e) => {
    if (e.target.closest && e.target.closest(selectors)) {
      const to = e.relatedTarget;
      if (!to || !to.closest || !to.closest(selectors)) {
        if (lastIgnoreState !== true) {
          lastIgnoreState = true;
          window.electronAPI.setIgnoreMouse(true);
        }
      }
    }
  }, true);
}

function setupCharacterSelect(canvas) {
  const grid = document.getElementById('character-grid');
  const tabsContainer = document.getElementById('character-tabs');
  const searchInput = document.getElementById('character-search');
  const errorToast = document.getElementById('character-error-toast');

  let currentCategory = 'all';
  let searchQuery = '';

  // Build category tabs
  CATEGORIES.forEach(cat => {
    const tab = document.createElement('button');
    tab.className = 'character-tab' + (cat.id === 'all' ? ' active' : '');
    tab.textContent = cat.name;
    tab.dataset.category = cat.id;
    tab.addEventListener('click', () => {
      currentCategory = cat.id;
      tabsContainer.querySelectorAll('.character-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      renderGrid();
    });
    tabsContainer.appendChild(tab);
  });

  searchInput.addEventListener('input', () => {
    searchQuery = searchInput.value.trim().toLowerCase();
    renderGrid();
  });

  async function renderGrid() {
    grid.innerHTML = '';

    const filtered = CHARACTER_PRESETS.filter(p => {
      const matchCategory = currentCategory === 'all' || p.category === currentCategory;
      const matchSearch = !searchQuery ||
        p.name.toLowerCase().includes(searchQuery) ||
        p.id.toLowerCase().includes(searchQuery) ||
        (p.colorName && p.colorName.includes(searchQuery)) ||
        (p.description && p.description.toLowerCase().includes(searchQuery));
      return matchCategory && matchSearch;
    });

    const currentCharId = await window.electronAPI.getStore('character') || 'bongo-classic';

    for (const preset of filtered) {
      const card = document.createElement('div');
      card.className = 'character-card' + (preset.id === currentCharId ? ' active' : '');
      card.dataset.id = preset.id;

      const c = preset.color || { from: '#74b9ff', to: '#0984e3' };
      const instrumentLabel = preset.instrument
        ? (INSTRUMENT_NAMES[preset.instrument] || preset.instrument)
        : '动画';

      card.innerHTML = `
        <div class="card-thumbnail cat-${preset.category}">
          <img class="card-avatar-img" src="avatars/${preset.id}.png" alt="${preset.name}">
          <span class="avatar-color-swatch" style="display:none;background:linear-gradient(135deg,${c.from},${c.to})"></span>
        </div>
        <div class="card-info">
          <div class="card-color-name">${preset.colorName || ''}</div>
          <div class="card-instrument-name">${instrumentLabel}</div>
        </div>
        <div class="card-tooltip">${preset.description}</div>
      `;
      // Fallback: if avatar image fails to load, show color swatch instead
      const avatarImg = card.querySelector('.card-avatar-img');
      const swatch = card.querySelector('.avatar-color-swatch');
      avatarImg.addEventListener('error', () => {
        avatarImg.style.display = 'none';
        swatch.style.display = '';
      });
      card.addEventListener('click', () => switchCharacter(preset));
      grid.appendChild(card);
    }
  }

  renderGrid();

  async function switchCharacter(preset) {
    activeCharacter.destroy();
    try {
      activeCharacter = await createCharacter(canvas, preset.id);
      activeCharacter.start();
    } catch (e) {
      console.warn('switchCharacter failed, falling back:', e);
      activeCharacter = new SpriteCharacter(canvas);
      await activeCharacter.load();
      activeCharacter.loadSkin(preset.id);
      activeCharacter.start();
    }
    await window.electronAPI.setStore('character', preset.id);
    // Update character reference in notification manager
    if (_notificationMgr) _notificationMgr.setCharacter(activeCharacter);
    // Push skin change to multiplayer immediately (if connected)
    try { _mpClient?.sendStateUpdate({ skinId: preset.id }, true); } catch(e) {}
    renderGrid();
  }
}

/**
 * Setup the Pet Status tab in the Fun panel — live updates from AffectionSystem.
 * V2: Dynamic level list, prestige with material+coins via petBase.attemptPrestige()
 */
function setupPetStatusUI(affection, petBase) {
  const levelEl = document.getElementById('pet-level-value');
  const affinityFill = document.getElementById('pet-affinity-fill');
  const affinityVal = document.getElementById('pet-affinity-value');
  const cpsVal = document.getElementById('pet-cps-value');
  const moodEl = document.getElementById('pet-mood-value');
  const moodTextEl = document.getElementById('pet-mood-text');
  const moodIll = document.getElementById('pet-mood-ill');
  const streakEl = document.getElementById('pet-streak-value');
  const levelNextEl = document.getElementById('pet-level-next');

  // Prestige elements
  const prestigeVal = document.getElementById('pet-prestige-value');
  const prestigeBtn = document.getElementById('prestige-btn');

  // Multiplier elements
  const multPrestige = document.getElementById('mult-prestige');
  const multMood = document.getElementById('mult-mood');
  const multStreak = document.getElementById('mult-streak');
  const multItems = document.getElementById('mult-items');
  const multTotal = document.getElementById('mult-total');

  // Multiplier bar fills
  const multBarPrestige = document.getElementById('mult-bar-prestige');
  const multBarMood = document.getElementById('mult-bar-mood');
  const multBarStreak = document.getElementById('mult-bar-streak');
  const multBarItems = document.getElementById('mult-bar-items');

  // Flow marker
  const flowMarker = document.getElementById('flow-marker');

  // Daily stat elements
  const statTyping = document.getElementById('stat-typing');

  // Overlay bar elements
  const overlayLevel = document.getElementById('overlay-level');
  const overlayFill = document.getElementById('overlay-progress-fill');
  const overlayCoins = document.getElementById('overlay-coins');
  const floatContainer = document.getElementById('overlay-float-container');

  // Float number spawner — shows "+X" rising and fading on every keystroke
  function showFloat(delta) {
    if (!delta || !floatContainer) return;
    const el = document.createElement('span');
    el.className = `float-number ${delta >= 0 ? 'positive' : 'negative'}`;
    el.textContent = delta >= 0 ? `+${delta}` : `${delta}`;
    el.style.left = (Math.random() * 16 - 8) + 'px';
    floatContainer.appendChild(el);
    setTimeout(() => el.remove(), 950);
  }

  // Render dynamic level list around current level
  const levelListEl = document.getElementById('upgrade-level-list');

  function renderLevelList() {
    if (!levelListEl) return;
    const currentLv = affection.level;
    // Show levels: max(1, current-2) to current+5
    const startLv = Math.max(1, currentLv - 2);
    const endLv = currentLv + 5;

    let html = '<div class="upgrade-levels-title">等级所需猫猫币</div><div class="upgrade-levels-grid">';
    for (let lv = startLv; lv <= endLv; lv++) {
      const threshold = getLevelThreshold(lv);
      const reached = currentLv >= lv;
      html += `<span class="upgrade-lv ${reached ? 'reached' : ''}">Lv.${lv}: ${formatNumber(threshold)}</span>`;
    }
    html += '</div>';
    levelListEl.innerHTML = html;
  }

  /** Fast update — called on every affinitychange (per keystroke / passive tick) */
  function updateFastElements() {
    const progress = (affection.levelProgress * 100).toFixed(1) + '%';
    if (affinityFill) affinityFill.style.width = progress;
    if (affinityVal) affinityVal.textContent = formatNumber(affection.affinity);
    if (statTyping) statTyping.textContent = formatNumber(affection._dailyStats?.typing || 0);

    // Next level hint
    if (levelNextEl) {
      const next = getLevelThreshold(affection.level + 1);
      const remaining = Math.max(0, next - affection.affinity);
      levelNextEl.textContent = `还差 ${formatNumber(remaining)}`;
    }

    // Overlay bar
    if (overlayLevel) overlayLevel.textContent = `Lv.${affection.level}`;
    if (overlayFill) overlayFill.style.width = progress;
    if (overlayCoins) overlayCoins.innerHTML = `<img src="icons/stat-coin.png" class="cat-icon icon-sm" alt=""> ${formatNumber(affection.affinity)}`;
  }

  /** Full update — called less frequently for slow-changing values */
  function updateSlowElements() {
    if (levelEl) levelEl.textContent = affection.level;
    if (streakEl) streakEl.textContent = `${affection.streakDays} 天`;
    updateMoodDisplay();
    updatePrestige();
    updateMultipliers();
    updateFlowMarker();
  }

  function updateMoodDisplay() {
    const moods = { happy: '<img src="icons/stat-heart.png" class="cat-icon icon-sm" alt=""> 开心', normal: '<img src="icons/stat-heart.png" class="cat-icon icon-sm" alt=""> 正常', bored: '<img src="icons/rhythm-away.png" class="cat-icon icon-sm" alt=""> 无聊' };
    const moodTexts = { happy: '开心', normal: '正常', bored: '无聊' };
    const moodImages = { happy: 'illustrations/pet-happy.png', normal: 'illustrations/pet-neutral.png', bored: 'illustrations/pet-bored.png' };
    const moodColors = { happy: 'linear-gradient(135deg, #ff9a9e, #fad0c4)', normal: 'linear-gradient(135deg, #a8c0ff, #b8d0ff)', bored: 'linear-gradient(135deg, #bbb, #ddd)' };
    if (moodEl) {
      moodEl.innerHTML = moods[affection.mood] || '<img src="icons/stat-heart.png" class="cat-icon icon-sm" alt=""> 正常';
      moodEl.style.background = moodColors[affection.mood] || moodColors.normal;
    }
    if (moodTextEl) moodTextEl.textContent = moodTexts[affection.mood] || '正常';
    if (moodIll) moodIll.src = moodImages[affection.mood] || moodImages.normal;
  }

  function updatePrestige() {
    if (prestigeVal) prestigeVal.textContent = `第${affection.rebirthCount}世`;
    if (prestigeBtn) {
      const cost = affection.prestigeCoinCost;
      const tier = affection.prestigeTier;
      const mat = getPrestigeMaterial(tier);
      const matName = mat ? `${mat.icon} ${mat.name}` : '转生石';
      prestigeBtn.innerHTML = `<img src="icons/stat-sparkle.png" class="cat-icon icon-sm" alt=""> 转生 (${formatNumber(cost)}<img src="icons/stat-coin.png" class="cat-icon icon-sm" alt=""> + ${matName})`;
      // Enable only if coins sufficient AND material available
      const hasMaterial = mat && petBase && petBase.getOwnedCount(mat.id) > 0;
      prestigeBtn.disabled = !affection.canPrestige || !hasMaterial;
    }
  }

  function updateMultipliers() {
    const bd = affection.multiplierBreakdown;
    if (multPrestige) multPrestige.textContent = `×${bd.prestige.toFixed(1)}`;
    if (multMood) multMood.textContent = `×${bd.mood.toFixed(1)}`;
    if (multStreak) multStreak.textContent = `×${bd.streak.toFixed(2)}`;
    if (multItems) multItems.textContent = `×${bd.items.toFixed(2)}`;
    if (multTotal) multTotal.textContent = `×${affection.totalMultiplier.toFixed(2)}`;

    // Update multiplier bars — map multiplier to bar width (clamped to 100%)
    if (multBarPrestige) multBarPrestige.style.width = `${Math.min(100, (bd.prestige - 1) * 20 + 10)}%`;
    if (multBarMood) multBarMood.style.width = `${Math.min(100, bd.mood * 50)}%`;
    if (multBarStreak) multBarStreak.style.width = `${Math.min(100, (bd.streak - 1) * 50 + 10)}%`;
    if (multBarItems) multBarItems.style.width = `${Math.min(100, (bd.items - 1) * 10 + 10)}%`;
  }

  function updateFlowMarker() {
    if (flowMarker) {
      flowMarker.classList.toggle('hidden', !affection.isInFlow);
    }
  }

  // Prestige button click — use petBase.attemptPrestige()
  if (prestigeBtn) {
    prestigeBtn.addEventListener('click', () => {
      const result = petBase.attemptPrestige();
      if (result.success) {
        showCatBubble(`喵~ 转生成功！永久倍率提升了！道具槽+1 (${affection.itemSlots}格)`, 5000);
        updateFastElements();
        updateSlowElements();
        renderLevelList();
      } else {
        showCatBubble(`转生失败: ${result.reason}`, 4000);
      }
    });
  }

  // Real-time: every keystroke / passive tick
  affection.on('affinitychange', (data) => {
    updateFastElements();
    if (data && data.delta) showFloat(data.delta);
  });

  // Level up: update everything + refresh level list
  affection.on('levelup', () => {
    updateFastElements();
    updateSlowElements();
    renderLevelList();
  });
  affection.on('moodchange', () => { updateMoodDisplay(); updateMultipliers(); });
  affection.on('prestige', () => { updateFastElements(); updateSlowElements(); renderLevelList(); });
  affection.on('flow', () => {
    updateFlowMarker();
    if (affection.isInFlow) {
      showCatBubble('喵~ 你进入心流状态了！猫猫币加倍获取中~', 4000);
    }
  });

  // Initial render
  renderLevelList();
  updateFastElements();
  updateSlowElements();

  // Slow refresh for mood/multiplier/streak (every 30s instead of 5s)
  setInterval(updateSlowElements, 30000);
}

/**
 * V2 Pillar C: Setup Privacy Consent Toggle in Settings
 */
async function setupConsentToggle() {
  const isGranted = await window.electronAPI.consentCheck();
  
  // Create toggle UI using existing setting-group style (consistent with skill toggles)
  const toggle = document.createElement('div');
  toggle.className = 'setting-group';
  toggle.innerHTML = `
    <label>
      <input type="checkbox" id="consent-toggle" ${isGranted ? 'checked' : ''}>
      <img src="icons/tab-recorder.png" class="cat-icon" alt=""> 打字内容智能分析
      <span style="font-size:11px;color:#999;display:block;margin-top:2px;">开启后可生成基于内容的增强日报、待办提取和内容回顾</span>
    </label>
  `;
  
  const toggleInput = toggle.querySelector('#consent-toggle');
  toggleInput.addEventListener('change', async () => {
    if (toggleInput.checked) {
      // Turn on: prompt dialog
      const accepted = await window.electronAPI.consentRequest();
      toggleInput.checked = accepted;
    } else {
      // Turn off: revoke
      await window.electronAPI.consentRevoke();
    }
    
    // Refresh content review tab
    setupContentReviewTab();
  });
  
  // Attach to settings tab, before the save button
  const settingsTab = document.getElementById('tab-settings-main');
  const saveActions = settingsTab?.querySelector('.setting-actions-bottom');
  if (settingsTab && saveActions) {
    const privacySection = document.createElement('div');
    privacySection.innerHTML = '<div class="setting-section-title">隐私与安全</div>';
    privacySection.appendChild(toggle);
    settingsTab.insertBefore(privacySection, saveActions);
  }
}

/**
 * V2 Pillar C: Setup Content Review Tab
 * [暂停] 内容回顾功能暂时关闭展示，保留代码以备后续启用
 */
async function setupContentReviewTab() {
  const container = document.getElementById('recorder-review-section');
  if (!container) return;
  container.innerHTML = '';
  return;

  /* --- 以下代码暂停使用 ---
  const isGranted = await window.electronAPI.consentCheck();
  
  if (!isGranted) {
    container.innerHTML = `
      <div style="text-align:center;padding:16px;">
        <div style="font-size:24px;margin-bottom:8px;"><img src="icons/tab-recorder.png" style="width:32px;height:32px;" alt=""></div>
        <div style="font-size:13px;color:#888;margin-bottom:12px;">高级统计与回顾需要授权记录打字内容</div>
        <button class="review-enable-btn" id="review-enable-btn" style="padding:6px 14px;border-radius:6px;border:none;background:#ff9800;color:white;cursor:pointer;font-size:12px;">了解并开启记录授权</button>
      </div>
    `;
    const enableBtn = container.querySelector('#review-enable-btn');
    if (enableBtn) {
      enableBtn.addEventListener('click', async () => {
        const accepted = await window.electronAPI.consentRequest();
        if (accepted) {
          setupContentReviewTab();
        }
      });
    }
    return;
  }
  
  const today = new Date().toISOString().split('T')[0];
  const segments = await window.electronAPI.getStore(`segments_${today}`) || [];
  
  renderTimeline(container, segments);
  --- 暂停结束 --- */
}

function renderTimeline(container, segments) {
  const typeIcons = { code: '<img src="icons/toolbar-tools.png" class="cat-icon icon-sm" alt="">', text: '<img src="icons/tab-todo.png" class="cat-icon icon-sm" alt="">', chat: '<img src="icons/toolbar-chat.png" class="cat-icon icon-sm" alt="">' };
  const densityLabels = { high: '高密度', medium: '中等', low: '低密度' };
  
  let html = '<div class="review-timeline">';
  
  for (const seg of segments) {
    const icon = typeIcons[seg.type] || '<img src="icons/tab-todo.png" class="cat-icon icon-sm" alt="">';
    html += `
      <div class="review-segment type-${seg.type}">
        <div class="seg-time">${seg.startTime.slice(0,5)} - ${seg.endTime.slice(0,5)}</div>
        <div class="seg-content">
          <span class="seg-icon">${icon}</span>
          <span class="seg-type">${seg.summary}</span>
          <span class="seg-density">${densityLabels[seg.density] || '未知'}</span>
        </div>
        <div class="seg-bar" style="width:${Math.min(100, seg.charCount / 30)}%"></div>
      </div>
    `;
  }
  
  html += '</div>';
  
  const totalChars = segments.reduce((sum, s) => sum + s.charCount, 0);
  const typeStats = {};
  segments.forEach(s => { typeStats[s.type] = (typeStats[s.type] || 0) + 1; });
  
  html = `
    <div class="review-header">
      <div class="review-stat"><img src="icons/tab-sysinfo.png" class="cat-icon icon-sm" alt=""> 今日 ${segments.length} 段 · ${totalChars.toLocaleString()} 字</div>
      <div class="review-stat-types">
        ${typeStats.code ? `<img src="icons/toolbar-tools.png" class="cat-icon icon-sm" alt=""> 编码 ${typeStats.code} 段 ` : ''}
        ${typeStats.text ? `<img src="icons/tab-todo.png" class="cat-icon icon-sm" alt=""> 文字 ${typeStats.text} 段 ` : ''}
        ${typeStats.chat ? `<img src="icons/toolbar-chat.png" class="cat-icon icon-sm" alt=""> 聊天 ${typeStats.chat} 段` : ''}
        <div style="font-size:10px; color:#aaa; margin-top:2px;">(数据基于后台周期性转换，首次可能存在数分钟延迟)</div>
      </div>
      <button id="review-revoke-btn" style="margin-left:auto;padding:4px 8px;border-radius:4px;border:1px solid #ccc;background:#f5f5f5;color:#666;font-size:12px;cursor:pointer;">关闭记录授权</button>
    </div>
  ` + html;
  
  container.innerHTML = html;

  // 绑定撤销授权事件
  const revokeBtn = container.querySelector('#review-revoke-btn');
  if (revokeBtn) {
    revokeBtn.addEventListener('click', async () => {
      if (confirm('关闭后将不再记录打字内容，现有记录会被保留。确认关闭吗？')) {
        await window.electronAPI.consentRevoke();
        setupContentReviewTab();
      }
    });
  }
}

// Listen for global consent status changes
window.electronAPI.onConsentStatusChanged?.((data) => {
  const toggleInput = document.getElementById('consent-toggle');
  if (toggleInput) toggleInput.checked = data.granted;
  setupContentReviewTab();
  
  // V2 Pillar C: 刷新记录器预览
  if (data.granted && typeRecorder) {
    typeRecorder.loadTodayContent();
  }
});

// Start the app
init().catch(err => {
  console.error('Init failed:', err);
  // Show error visibly on screen
  document.body.style.background = 'rgba(255,0,0,0.3)';
  const errDiv = document.createElement('div');
  errDiv.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#fff;padding:20px;border:2px solid red;z-index:9999;font-size:14px;max-width:600px;word-break:break-all;';
  errDiv.textContent = 'INIT ERROR: ' + err.message + '\n' + err.stack;
  document.body.appendChild(errDiv);
});
