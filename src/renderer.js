/**
 * Renderer entry point - initializes all modules
 * V1.2: Skill System + Proactive Interaction Engine + User Profiler
 */

import { SpriteCharacter, SKINS } from './pet/pixel-character.js';
import { SpriteSheetCharacter } from './pet/spritesheet-character.js';
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

// V1.3 imports — Pet Base & Utils
import { PetBaseSystem } from './pet/pet-base-system.js';
import { PetBaseUI } from './pet/pet-base-ui.js';
import { getPrestigeMaterial } from './pet/pet-base-items.js';
import { formatNumber } from './utils/format.js';

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
  openclaw: {
    url: '', model: '',
    models: [],
    needsUrl: true
  }
};

// Active character reference
let activeCharacter = null;

// Affection system reference (used by pet status UI)
let affectionSystem = null;

/**
 * Show a floating cat bubble above the pet.
 * Supports both simple text and structured L2/L3 notifications.
 */
function showCatBubble(text, duration = 5000) {
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
    }, 500);
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
      showCatBubble(config.message, 5000);
      setTimeout(() => {
        if (dot) dot.classList.remove('hidden');
      }, 5500);
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
          btn.className = 'bubble-action-btn';
          btn.textContent = act.label;
          btn.addEventListener('click', () => {
            bubble.classList.add('fade-out');
            setTimeout(() => {
              bubble.classList.add('hidden');
              bubble.classList.remove('fade-out', 'bubble-l3');
              bubble.innerHTML = '';
            }, 400);
            if (config.onAction) config.onAction(act.action);
          });
          actionsEl.appendChild(btn);
        }
        bubble.appendChild(actionsEl);
      }

      // Auto-dismiss after 30s
      if (bubble._hideTimer) clearTimeout(bubble._hideTimer);
      bubble._hideTimer = setTimeout(() => {
        bubble.classList.add('fade-out');
        setTimeout(() => {
          bubble.classList.add('hidden');
          bubble.classList.remove('fade-out', 'bubble-l3');
          bubble.innerHTML = '';
        }, 400);
      }, 30000);
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

async function init() {
  const canvas = document.getElementById('pet-canvas');

  // Restore saved skin
  const savedCharId = await window.electronAPI.getStore('character');
  const charId = savedCharId || 'bongo-classic';

  // Create character via factory
  activeCharacter = await createCharacter(canvas, charId);
  activeCharacter.start();

  // Affection / nurturing system
  const affection = new AffectionSystem();
  await affection.init();
  affectionSystem = affection;

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
  const aiService = new AIService();
  await aiService.loadConfig();

  // V1.1: Memory Manager
  const memoryManager = new MemoryManager();
  memoryManager.setAIService(aiService);
  await memoryManager.init();

  // V1.1: Load personality and set context
  const savedPersonality = await window.electronAPI.getStore('catPersonality') || 'lively';
  aiService.setContext(savedPersonality, affection, memoryManager);

  // Chat UI (with integrated settings)
  const chatUI = new ChatUI(aiService, characterProxy, API_PRESETS);
  chatUI.positionFn = positionAbovePet;
  await chatUI.loadHistory();

  // V1.1: Sentiment callback — trigger cat expression
  chatUI.onSentiment = (sentiment) => {
    if (sentiment === 'happy') {
      activeCharacter.triggerHappy?.();
    }
    // Future: could map other sentiments to different animations
  };

  // Hook chat send to affection
  const chatSendBtn = document.getElementById('chat-send');
  const chatInput = document.getElementById('chat-input');
  chatSendBtn?.addEventListener('click', () => { affection.onChat(); });
  chatInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && chatInput.value.trim()) affection.onChat();
  });

  // System info widget (no longer standalone, lives in Tools panel tab)
  const widget = new SystemInfoWidget();

  // Type recorder (no longer standalone, lives in Tools panel tab)
  const typeRecorder = new TypeRecorder();

  // Pomodoro timer (lives in Tools panel tab)
  const pomodoro = new PomodoroTimer(affection);

  // Todo list (lives in Tools panel tab)
  const todoList = new TodoList(affection);

  // V1.1: Connect todo reminders to cat bubble
  todoList.onReminder = (todo) => {
    showCatBubble(`⏰ 提醒: ${todo.text}`, 6000);
  };

  // V1.1: Todo Parser
  const todoParser = new TodoParser(aiService, todoList, showCatBubble);
  chatUI.setTodoParser(todoParser);

  // V1.5: Skill Router — intercepts chat commands/keywords before AI
  const skillRouter = new SkillRouter();
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

  // Wire proactive reply actions to open chat panel
  proactiveEngine.notificationMgr.onOpenChat = () => {
    chatUI.show();
  };

  // Wire bubble inline reply → open chat panel + display messages + continue conversation
  proactiveEngine.notificationMgr.onBubbleReply = async (userText, catMessage) => {
    chatUI.show();
    // Display the cat's original proactive message and user's reply in chat
    chatUI.addMessage(catMessage, 'assistant');
    chatUI.addMessage(userText, 'user');
    // Stream AI response based on user's reply
    const msgEl = chatUI.addMessage('', 'assistant');
    try {
      let fullResp = '';
      for await (const chunk of aiService.sendMessageStream(userText)) {
        msgEl.textContent += chunk;
        fullResp += chunk;
        chatUI.scrollToBottom();
      }
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
    const todoTab = header.querySelector('.panel-tab[data-tab="todo"]');
    if (todoTab) todoTab.classList.add('active');
    const todoContent = document.getElementById('tab-todo');
    if (todoContent) todoContent.classList.add('active');
  };

  // Wire settings save to reload proactive config
  chatUI.onSettingsSaved = () => {
    proactiveEngine.updateConfig();
  };

  // V1.2: Skill Scheduler
  const skillScheduler = new SkillScheduler();
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

  // Wire pomodoro completion to both character and proactive engine
  pomodoro.onComplete = () => {
    activeCharacter.triggerHappy?.();
    proactiveEngine.onPomodoroComplete();
  };

  // V1.1: Clipboard Widget
  const clipboardWidget = new ClipboardWidget(aiService, showCatBubble);

  // Setup UI
  setupToolbar(chatUI);
  setupTabbedPanel('tools-container', 'tools-bubble-header', 'tools-close', 'tools-maximize');
  setupTabbedPanel('fun-container', 'fun-bubble-header', 'fun-close', 'fun-maximize');
  setupToolbarHover();
  setupDrag();
  setupClickThrough();
  setupCharacterSelect(canvas);

  // V1.3: Pet Base System (shop & owned in fun panel tabs)
  const petBase = new PetBaseSystem();
  await petBase.init(affection);
  const petBaseUI = new PetBaseUI(petBase, affection);
  petBaseUI.render();

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

  console.log('ChatCat Desktop Pet V1.4 initialized!');
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
  }

  // Tab switching (suppress if it was a drag/reorder)
  header.querySelectorAll('.panel-tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      if (e.target.closest('.chat-ctrl-btn')) return;
      if (tabDidDrag) { tabDidDrag = false; return; }
      const tabId = tab.dataset.tab;
      header.querySelectorAll('.panel-tab').forEach(t => t.classList.remove('active'));
      const body = container.querySelector(`#${containerId.replace('-container', '-body')}`);
      body.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
      tab.classList.add('active');
      const content = document.getElementById(`tab-${tabId}`);
      if (content) content.classList.add('active');
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

    document.addEventListener('mouseup', () => { isDragging = false; });
  }
}

function setupToolbar(chatUI) {
  const toolbar = document.getElementById('toolbar');
  toolbar.addEventListener('click', async (e) => {
    const btn = e.target.closest('.toolbar-btn');
    if (!btn) return;

    e.stopPropagation();
    const action = btn.dataset.action;

    switch (action) {
      case 'chat':
        chatUI.toggle();
        break;
      case 'tools': {
        const panel = document.getElementById('tools-container');
        const wasHidden = panel.classList.contains('hidden');
        panel.classList.toggle('hidden');
        if (wasHidden) positionAbovePet(panel);
        break;
      }
      case 'fun': {
        const panel = document.getElementById('fun-container');
        const wasHidden = panel.classList.contains('hidden');
        panel.classList.toggle('hidden');
        if (wasHidden) positionAbovePet(panel);
        break;
      }
    }
  });
}

/**
 * Position a panel above the pet container, centered horizontally
 */
function positionAbovePet(panel) {
  if (panel.classList.contains('maximized')) return;
  if (panel.style.left && panel.style.top) return;

  const petContainer = document.getElementById('pet-container');
  const petRect = petContainer.getBoundingClientRect();
  const panelWidth = panel.offsetWidth || 280;

  const left = petRect.left + (petRect.width / 2) - (panelWidth / 2);
  const top = petRect.top - panel.offsetHeight - 20;

  panel.style.left = Math.max(10, left) + 'px';
  panel.style.top = Math.max(10, top) + 'px';
  panel.style.bottom = 'auto';
  panel.style.right = 'auto';
  panel.style.transform = 'none';
}

function setupToolbarHover() {
  const petContainer = document.getElementById('pet-container');
  const toolbar = document.getElementById('toolbar');
  let hideTimeout = null;

  function showToolbar() {
    clearTimeout(hideTimeout);
    toolbar.classList.add('visible');
  }

  function hideToolbar() {
    clearTimeout(hideTimeout);
    hideTimeout = setTimeout(() => {
      toolbar.classList.remove('visible');
    }, 400);
  }

  petContainer.addEventListener('mouseenter', showToolbar);
  petContainer.addEventListener('mouseleave', hideToolbar);
  toolbar.addEventListener('mouseenter', showToolbar);
  toolbar.addEventListener('mouseleave', hideToolbar);
}

function setupDrag() {
  const petContainer = document.getElementById('pet-container');
  const panelIds = ['chat-container', 'tools-container', 'fun-container'];
  let isDragging = false;
  let lastX, lastY;

  petContainer.addEventListener('mousedown', (e) => {
    if (e.target.closest('#toolbar') || e.target.closest('.toolbar-btn')) return;
    if (e.button === 0) {
      isDragging = true;
      lastX = e.screenX;
      lastY = e.screenY;
      // Snapshot current position into style.left/top for parseFloat tracking
      const rect = petContainer.getBoundingClientRect();
      petContainer.style.left = rect.left + 'px';
      petContainer.style.top = rect.top + 'px';
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
  const selectors = '#pet-container, #chat-container, #tools-container, #fun-container, .mini-cat';
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
    const skin = SKINS[preset.id];
    if (skin && skin.spriteSheet) {
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
    } else {
      if (activeCharacter instanceof SpriteSheetCharacter) {
        activeCharacter.destroy();
        activeCharacter = new SpriteCharacter(canvas);
        await activeCharacter.load();
        activeCharacter.loadSkin(preset.id);
        activeCharacter.start();
      } else {
        activeCharacter.loadSkin(preset.id);
      }
    }
    await window.electronAPI.setStore('character', preset.id);
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
    if (overlayCoins) overlayCoins.textContent = `🐱 ${formatNumber(affection.affinity)}`;
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
    const moods = { happy: '😊 开心', normal: '😐 正常', bored: '😴 无聊' };
    const moodTexts = { happy: '开心', normal: '正常', bored: '无聊' };
    const moodImages = { happy: 'illustrations/pet-happy.png', normal: 'illustrations/pet-neutral.png', bored: 'illustrations/pet-bored.png' };
    const moodColors = { happy: 'linear-gradient(135deg, #ff9a9e, #fad0c4)', normal: 'linear-gradient(135deg, #a8c0ff, #b8d0ff)', bored: 'linear-gradient(135deg, #bbb, #ddd)' };
    if (moodEl) {
      moodEl.textContent = moods[affection.mood] || '😐 正常';
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
      prestigeBtn.textContent = `✨ 转生 (${formatNumber(cost)}🐱 + ${matName})`;
      // Enable if coins sufficient (material check happens on click)
      prestigeBtn.disabled = !affection.canPrestige;
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
