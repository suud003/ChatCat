const { app, BrowserWindow, Tray, Menu, ipcMain, globalShortcut, nativeImage, session, dialog, screen, clipboard, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const Store = require('electron-store');

// === File Logging ===
const log = require('electron-log/main');
log.initialize({ preload: true });
log.transports.file.maxSize = 5 * 1024 * 1024; // 5MB 轮转
log.transports.file.format = '[{y}-{m}-{d} {h}:{i}:{s}] [{level}] {text}';
Object.assign(console, log.functions);  // 重定向全局 console
log.errorHandler.startCatching();       // 捕获未处理异常/rejection
const { KeyboardRecorder } = require('./src/recorder/keyboard-recorder');
const { TextConverter } = require('./src/skills/text-converter');
const { DailyReport } = require('./src/skills/daily-report');
const { TodoExtractor } = require('./src/skills/todo-extractor');
const { SkillRegistry } = require('./src/skills/skill-registry');
const { SkillEngine } = require('./src/skills/skill-engine');
const { EmbeddedServer } = require('./src/multiplayer/embedded-server');

const { QuickPanelManager } = require('./src/quick-panel/quick-panel-main');
const { AIClientMain } = require('./src/shared/ai-client-main');
const { SkillImporter } = require('./src/skills/skill-importer');
const { McpConfigImporter } = require('./src/skills/mcp-config-importer');
const { SkillsManager } = require('./src/skills/skills-manager');

// AI Runtime (Phase 1: unified definition layer + Phase 2: execution layer + Phase 3: trigger bus)
const aiRuntimeDefs = require('./src/ai-runtime');
const { AIRuntime, AITrigger } = aiRuntimeDefs;
const { TriggerBus } = require('./src/ai-runtime/trigger-bus');
const { ScheduledTriggerRegistry } = require('./src/ai-runtime/scheduled-trigger-registry');

// V2 Pillar C Imports
const { PrivacyConsentManager } = require('./src/consent/privacy-consent');
const { ContentSegmenter } = require('./src/cleaner/content-segmenter');

const store = new Store({
  defaults: {
    apiBaseUrl: 'https://api.openai.com/v1',
    apiKey: '',
    modelName: 'gpt-3.5-turbo',
    opacity: 1.0,
    character: 'hachiware',
    characterColor: 'bongo-classic',
    characterInstrument: 'bongo-classic',
    windowPosition: null,
    chatHistory: [],
    recorderOutputDir: '',
    recorderEnabled: false,
    // Affection system
    affinity: 0,
    level: 1,
    streakDays: 0,
    lastLoginDate: null,
    unlockedItems: [],
    dailyStats: {},
    // Todo list
    todos: [],
    // Pomodoro stats
    pomodoroStats: { date: null, count: 0 },
    // V1.1: New store keys
    catPersonality: 'lively',
    aiMemories: [],
    surpriseEventsToday: { date: null, count: 0 },
    proactiveGreetDate: null,
    clipboardHistory: [],
    // V1.2: Proactive Engine + Skill System
    userProfile: {
      occupation: '',
      workSchedule: { startHour: 9, endHour: 18 },
      interactionPreference: 'medium',
      importantDates: [],
      workType: '',
      onboardingDay: 0,
      onboardingCompleted: false
    },
    behaviorModel: {
      avgTypingSpeed: 0,
      dailyActivePattern: new Array(24).fill(0),
      pushResponseRate: 0,
      lastInteractionTime: ''
    },
    proactiveConfig: {
      enabled: true,
      maxDailyInteractions: 8,
      quietHours: { start: 23, end: 7 },
      enabledSceneTypes: ['info', 'care', 'efficiency', 'chat']
    },
    proactiveHistory: [],
    feedItems: [],
    skillsEnabled: { textConverter: true, dailyReport: true, todoExtractor: true },
    dailyReportHour: 18,
    dailyReportOutputDir: '',
    // V2 Pillar B: Vision model for screenshot OCR
    visionModel: '',
    todoRemindInterval: 30,
    // V1.3: Pet Base System
    petBaseOwned: [],
    petBaseShopRefresh: {},
    // V1.4: Multiplayer
    mpMode: 'lan',          // 'lan' | 'external'
    mpServerPort: 9527,
    mpExternalUrl: '',
    mpUsername: '',
    mpToken: '',
    // V3: Gacha system
    gachaOwned: [],
    gachaPity: 0,
    gachaSssrPity: 0,
    gachaTotalPulls: 0,
    gachaHistory: [],
    gachaEquipped: [],
    // A1: Active window tracking
    activeWindowSnapshot: null,
    // A4: Offline adventure
    lastActiveTime: 0,
    offlineAdventureDate: '',
    // C4: MCP servers
    mcpServers: {},
  }
});

let mainWindow = null;
let tray = null;
let isQuitting = false;
let keyboardRecorder = null;
let textConverter = null;
let dailyReport = null;
let todoExtractor = null;
let embeddedServer = null;
let skillRegistry = null;
let skillEngine = null;
let quickPanelManager = null;
let skillImporter = null;
let mcpImporter = null;
let skillsManager = null;

function createWindow() {
  // Use the primary display for initial window placement.
  // Multi-monitor support: renderer tracks cat's screen position and asks main
  // process to move the window when the cat crosses screen boundaries.
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  // 平台标识
  const isWin = process.platform === 'win32';
  const isMac = process.platform === 'darwin';

  mainWindow = new BrowserWindow({
    width: width,
    height: height,
    x: primaryDisplay.workArea.x,
    y: primaryDisplay.workArea.y,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    hasShadow: false,
    thickFrame: false,
    title: '',
    roundedCorners: false,
    autoHideMenuBar: true,
    backgroundMaterial: 'none',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  // 强制完全透明背景 + 移除菜单栏
  mainWindow.setBackgroundColor('#00000000');
  mainWindow.setMenuBarVisibility(false);
  if (isWin) mainWindow.removeMenu();

  // Click-through on transparent areas, forward mouse events so hover still works
  mainWindow.setIgnoreMouseEvents(true, { forward: true });

  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));

  // 透明背景防护（跨平台）
  // 原理：transparent + frame:false 窗口在焦点/穿透切换时，系统可能短暂重绘非客户区
  //   Windows: DWM 重绘灰色边框；macOS: 渲染顶部标题栏残影
  // 解决：每次状态切换后立即重设 backgroundColor 刷新窗口透明状态
  {
    const ensureTransparent = () => {
      if (!mainWindow || mainWindow.isDestroyed()) return;
      mainWindow.setBackgroundColor('#00000000');
    };
    mainWindow.on('blur', ensureTransparent);
    mainWindow.on('focus', ensureTransparent);
    // 窗口移动/大小变化后也确保透明
    mainWindow.on('moved', ensureTransparent);
    mainWindow.on('resize', ensureTransparent);
  }

  // 窗口就绪后显示
  mainWindow.once('ready-to-show', () => {
    if (isWin) {
      mainWindow.setAlwaysOnTop(true, 'screen-saver');
    }
    if (isMac) {
      mainWindow.showInactive();
    } else {
      mainWindow.show();
    }
    // show 之后确认透明背景（系统在 show 时可能重置窗口装饰）
    mainWindow.setBackgroundColor('#00000000');
    if (isWin) {
      setTimeout(() => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.setAlwaysOnTop(true, 'screen-saver');
          mainWindow.setBackgroundColor('#00000000');
        }
      }, 100);
    }
  });

  mainWindow.setOpacity(store.get('opacity'));

  mainWindow.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });

  // Open devtools in dev mode
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }
}

/**
 * Move the main window to the display that contains the given screen-coordinates.
 * The renderer calls this via IPC when the cat is dragged near a screen edge.
 */
function moveWindowToDisplay(screenX, screenY) {
  if (!mainWindow || mainWindow.isDestroyed()) return;

  const target = screen.getDisplayNearestPoint({ x: screenX, y: screenY });
  const current = screen.getDisplayMatching(mainWindow.getBounds());

  // Only move if the target display is different from the current one
  if (target.id === current.id) return;

  const { x, y, width, height } = target.workArea;
  mainWindow.setBounds({ x, y, width, height });
  console.log(`[Main] Moved window to display ${target.id}: (${x},${y}) ${width}x${height}`);

  // Notify renderer about the display switch so it can adjust pet position
  mainWindow.webContents.send('display-changed', {
    displayId: target.id,
    bounds: { x, y, width, height },
    prevBounds: current.workArea
  });
}

function createTray() {
  // Create a simple tray icon
  const iconPath = path.join(__dirname, 'assets', 'icon.png');
  let trayIcon;
  try {
    trayIcon = nativeImage.createFromPath(iconPath);
    if (trayIcon.isEmpty()) throw new Error('empty');
  } catch {
    // Fallback: create a simple 16x16 icon
    trayIcon = nativeImage.createEmpty();
  }

  tray = new Tray(trayIcon.isEmpty() ? createDefaultIcon() : trayIcon);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show/Hide',
      click: () => {
        if (mainWindow.isVisible()) {
          mainWindow.hide();
        } else {
          mainWindow.show();
        }
      }
    },
    {
      label: 'Chat (Ctrl+Shift+C)',
      click: () => {
        mainWindow.show();
        mainWindow.webContents.send('toggle-chat');
      }
    },
    { type: 'separator' },
    {
      label: 'Settings',
      click: () => {
        mainWindow.show();
        mainWindow.webContents.send('open-settings');
      }
    },
    {
      label: '管理技能/MCP',
      click: () => {
        if (skillsManager) skillsManager.show();
      }
    },
    {
      label: '打开日志文件夹',
      click: () => {
        const logPath = log.transports.file.getFile().path;
        shell.showItemInFolder(logPath);
      }
    },
    {
      label: 'Reset Position',
      click: () => {
        // Move window back to primary display
        const primary = screen.getPrimaryDisplay();
        const { x, y, width, height } = primary.workArea;
        mainWindow.setBounds({ x, y, width, height });
        // Notify renderer to reset pet to default position
        mainWindow.webContents.send('reset-pet-position');
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: async () => {
        // Check if server is running, warn user
        if (embeddedServer && embeddedServer.isRunning) {
          const { response } = await dialog.showMessageBox(mainWindow, {
            type: 'question',
            buttons: ['取消', '退出'],
            defaultId: 0,
            cancelId: 0,
            title: '确认退出',
            message: '当前正在运行联机服务器，退出将断开所有连接。确定要退出吗？'
          });
          if (response === 0) return; // cancelled
        }
        // Notify renderer to clean up before quit
        mainWindow.webContents.send('app-before-quit');
        // Brief delay to let renderer destroy WebSocket cleanly
        setTimeout(() => {
          isQuitting = true;
          app.quit();
        }, 150);
      }
    }
  ]);

  tray.setToolTip('ChatCat Desktop Pet V1.2');
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
    }
  });
}

function createDefaultIcon() {
  // Create a simple 32x32 cat face icon programmatically
  const size = 32;
  const canvas = Buffer.alloc(size * size * 4);

  // Simple circle with cat ears (very basic)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const cx = x - size / 2;
      const cy = y - size / 2;
      const dist = Math.sqrt(cx * cx + cy * cy);

      // Cat ear triangles
      const isLeftEar = x >= 6 && x <= 12 && y >= 2 && y <= 10 && (x - 6) >= (10 - y) * 0.6;
      const isRightEar = x >= 20 && x <= 26 && y >= 2 && y <= 10 && (26 - x) >= (10 - y) * 0.6;
      const isHead = dist < 13 && y > 6;

      if (isLeftEar || isRightEar || isHead) {
        canvas[idx] = 255;     // R
        canvas[idx + 1] = 180; // G
        canvas[idx + 2] = 100; // B
        canvas[idx + 3] = 255; // A
      } else {
        canvas[idx + 3] = 0; // transparent
      }
    }
  }

  return nativeImage.createFromBuffer(canvas, { width: size, height: size });
}

// IPC handlers
ipcMain.handle('get-store', (_, key) => store.get(key));
  // 批量获取 store 值，减少 IPC 往返次数
  ipcMain.handle('get-store-batch', (_, keys) => {
    const result = {};
    for (const key of keys) {
      result[key] = store.get(key);
    }
    return result;
  });
ipcMain.handle('set-store', (_, key, value) => store.set(key, value));

// Phase 3: TriggerBus IPC handlers
ipcMain.handle('trigger-bus-submit', (_, triggerData, options = {}) => {
  const trigger = AITrigger.create(
    triggerData.type,
    triggerData.sceneId,
    triggerData.payload || {}
  );
  // triggerBus is initialized in app.whenReady — safe since renderer can't call until window is loaded
  const result = global._triggerBus.submit(trigger, options);
  return result;
});

ipcMain.handle('trigger-bus-get-result', async (_, correlationId) => {
  return global._triggerBus.getResult(correlationId);
});

ipcMain.handle('trigger-bus-get-status', (_, correlationId) => {
  return global._triggerBus.getStatus(correlationId);
});

// Phase 4: AI configuration check (replaces Renderer-side AIClientRenderer.isConfigured)
ipcMain.handle('ai-is-configured', () => {
  const baseUrl = store.get('apiBaseUrl');
  const apiKey = store.get('apiKey');
  const preset = store.get('apiPreset');

  // Ollama / local models don't need API key
  if (preset === 'ollama' ||
      (baseUrl && (baseUrl.includes('://127.0.0.1:11434') || baseUrl.includes('://localhost:11434')))) {
    return !!baseUrl;
  }
  return !!baseUrl && !!apiKey;
});

// Phase 4: Test API connection (replaces Renderer-side AIClientRenderer.testConnection)
ipcMain.handle('ai-test-connection', async (_, apiUrl, apiKey, modelName, options) => {
  const { AIClientMain } = require('./src/shared/ai-client-main');
  const testClient = new AIClientMain(store);
  return testClient.testConnection(apiUrl, apiKey, modelName, options);
});

// Phase 4: Todo parsing via Main-side AI call
ipcMain.handle('todo-parse-text', async (_, userMsg) => {
  const now = new Date();
  const currentTime = now.toISOString();

  const prompt = `You are a todo extraction assistant. Given a user message, determine if it contains a task/reminder/todo item.

Rules:
- If there IS a todo, respond with JSON: {"hasTodo": true, "text": "task description", "priority": "high|medium|low", "dueAt": "ISO string or null"}
- If there is NO todo, respond with: {"hasTodo": false}
- For due times, interpret relative references (e.g., "tomorrow 3pm", "next Monday")
- Current time reference: ${currentTime}
- Priority: default to "medium", use "high" for urgent language, "low" for casual mentions
- Respond with ONLY the JSON object, no other text`;

  try {
    // aiClient is initialized in app.whenReady — safe since renderer can't call until window is loaded
    const aiClient = new AIClientMain(store);
    const content = await aiClient.complete({
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: userMsg },
      ],
      temperature: 0.2,
      maxTokens: 150,
    });

    if (!content) return { hasTodo: false };

    let jsonStr = content;
    const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1].trim();
    }

    return JSON.parse(jsonStr);
  } catch (e) {
    console.warn('[Main] Todo parse failed:', e.message);
    return { hasTodo: false };
  }
});

// C4: Skill semantic routing — lightweight AI call to match user intent to a skill
ipcMain.handle('skill-semantic-match', async (_, userText, skillCatalog) => {
  try {
    const aiClient = new AIClientMain(store);
    const skillList = skillCatalog.map(s => `${s.name}: ${s.description}`).join('\n');

    const content = await aiClient.complete({
      messages: [
        { role: 'system', content: `Match user intent to a skill. Skills:\n${skillList}\n\nReply with ONLY the skill name if matched, or "none" if no match.` },
        { role: 'user', content: userText },
      ],
      temperature: 0.1,
    });

    return (content || 'none').trim().toLowerCase();
  } catch (e) {
    console.warn('[Main] Skill semantic match failed:', e.message);
    return 'none';
  }
});

ipcMain.handle('get-system-info', () => {
  const os = require('os');
  return {
    cpus: os.cpus(),
    totalMem: os.totalmem(),
    freeMem: os.freemem(),
    uptime: os.uptime(),
    platform: os.platform()
  };
});

// Handle window drag (legacy - now pet moves via CSS within fullscreen window)
ipcMain.on('window-drag', (_, { dx, dy }) => {
  // no-op: window is fullscreen, pet position is managed in renderer
});

// Handle mouse events passthrough toggle
ipcMain.on('set-ignore-mouse', (_, ignore) => {
  mainWindow.setIgnoreMouseEvents(ignore, { forward: true });
  // 穿透切换后立即重设透明背景，防止系统重绘非客户区装饰
  // （Windows: DWM 灰框；macOS: 顶部标题栏残影）
  // 注意：不要在这里调用 setAlwaysOnTop，它会触发 Z-order 变化导致桌面内容闪烁
  mainWindow.setBackgroundColor('#00000000');
});

// Multi-monitor: move window to the display containing the given screen point
ipcMain.on('move-to-display', (_, { screenX, screenY }) => {
  moveWindowToDisplay(screenX, screenY);
  quickPanelManager?.syncToPetPosition();
});

ipcMain.handle('open-devtools', () => {
  if (!mainWindow || mainWindow.isDestroyed()) return { success: false };
  mainWindow.show();
  if (mainWindow.webContents.isDevToolsOpened()) {
    mainWindow.webContents.focus();
    return { success: true, alreadyOpen: true };
  }
  mainWindow.webContents.openDevTools({ mode: 'detach' });
  return { success: true, alreadyOpen: false };
});

ipcMain.handle('get-runtime-info', () => ({
  isPackaged: app.isPackaged,
  isDev: process.argv.includes('--dev'),
  version: app.getVersion(),
}));

// Recorder IPC handlers
// V2: recorder-toggle 已废弃，录制启停完全由隐私授权 (consent) 控制
// 保留 handler 但仅返回状态，不再允许手动 toggle
ipcMain.handle('recorder-toggle', () => {
  if (!keyboardRecorder) return { recording: false, outputDir: '' };
  // 不再手动切换，返回当前状态即可
  return { recording: keyboardRecorder.recording, outputDir: keyboardRecorder.outputDir };
});

ipcMain.handle('recorder-set-dir', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Select Recorder Output Directory'
  });
  if (!result.canceled && result.filePaths.length > 0) {
    const dir = result.filePaths[0];
    if (keyboardRecorder) {
      keyboardRecorder.setOutputDir(dir);
    }
    return { outputDir: dir };
  }
  return { outputDir: keyboardRecorder ? keyboardRecorder.outputDir : '' };
});

ipcMain.handle('recorder-get-status', () => {
  if (!keyboardRecorder) return { recording: false, outputDir: '' };
  return { recording: keyboardRecorder.recording, outputDir: keyboardRecorder.outputDir };
});

ipcMain.handle('recorder-get-today-content', () => {
  if (!keyboardRecorder) return '';
  return keyboardRecorder.getTodayContent(50);
});

// Clipboard polling
let lastClipboardText = '';
let lastClipboardImageHash = '';
let clipboardTimer = null;

function startClipboardPolling() {
  lastClipboardText = clipboard.readText() || '';
  clipboardTimer = setInterval(() => {
    try {
      const text = clipboard.readText();
      if (text && text !== lastClipboardText && text.trim().length > 0) {
        lastClipboardText = text;
        const item = { text, timestamp: Date.now() };
        const history = store.get('clipboardHistory') || [];
        history.unshift(item);
        if (history.length > 50) history.length = 50;
        store.set('clipboardHistory', history);
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('clipboard-update', item);
        }
      }
      
      const image = clipboard.readImage();
      if (!image.isEmpty()) {
        const size = image.getSize();
        // Use a combination of dimensions and a small slice of the bitmap to avoid expensive toDataURL calls
        const bmp = image.toBitmap();
        const sampleBytes = bmp.length > 100 ? bmp.slice(bmp.length / 2, bmp.length / 2 + 100).toString('hex') : bmp.toString('hex');
        const imageHash = `${size.width}x${size.height}_${sampleBytes}`;
        
        if (imageHash !== lastClipboardImageHash) {
          lastClipboardImageHash = imageHash;
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('clipboard-image-detected', {
              width: image.getSize().width,
              height: image.getSize().height,
              timestamp: Date.now()
            });
          }
        }
      }
    } catch {}
  }, 2000);
}

// Clipboard IPC handlers
ipcMain.handle('clipboard-get-history', () => {
  return store.get('clipboardHistory') || [];
});

ipcMain.handle('clipboard-copy', (_, text) => {
  clipboard.writeText(text);
  lastClipboardText = text;
});

ipcMain.handle('clipboard-clear', () => {
  store.set('clipboardHistory', []);
});

ipcMain.handle('clipboard-get-latest', () => {
  try { return clipboard.readText() || ''; }
  catch { return ''; }
});

// Skill IPC handlers
// Phase 3: skill-trigger removed — scheduling delegated to ScheduledTriggerRegistry via TriggerBus

ipcMain.handle('skill-get-status', () => {
  const enabled = store.get('skillsEnabled') || {};
  return {
    textConverter: { enabled: enabled.textConverter !== false },
    dailyReport: { enabled: enabled.dailyReport !== false },
    todoExtractor: { enabled: enabled.todoExtractor !== false }
  };
});

ipcMain.handle('skill-get-converted-text', (_, date) => {
  return store.get(`convertedText_${date}`) || '';
});

ipcMain.handle('skill-get-daily-report', (_, date) => {
  return store.get(`dailyReport_${date}`) || null;
});

// Skill Agent IPC handlers (SKILL.md-based system)
// Phase 3: Prefer TriggerBus for skill execution. This handler kept as fallback.
ipcMain.handle('skill-execute', async (_, skillId, context) => {
  if (!skillEngine) return { success: false, output: 'Skill engine not initialized', outputType: 'text' };
  const result = await skillEngine.execute(skillId, context);
  // Notify renderer to reload todos after todo-management skill
  if (skillId === 'todo-management' && result.success && mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('todos-updated');
  }
  return result;
});

ipcMain.handle('skill-get-all-meta', () => {
  if (!skillRegistry) return [];
  return skillRegistry.getAllMeta();
});

ipcMain.handle('daily-report-set-dir', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: '选择日报存放目录'
  });
  if (!result.canceled && result.filePaths.length > 0) {
    const dir = result.filePaths[0];
    store.set('dailyReportOutputDir', dir);
    return { outputDir: dir };
  }
  return { outputDir: store.get('dailyReportOutputDir') || '' };
});

ipcMain.handle('open-file-path', (_, filePath) => {
  const { shell } = require('electron');
  shell.showItemInFolder(filePath);
});

ipcMain.handle('save-file', async (_, filePath, content) => {
  const fs = require('fs');
  try {
    fs.writeFileSync(filePath, content, 'utf-8');
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Multiplayer IPC handlers
ipcMain.handle('mp-start-server', async (_, port) => {
  try {
    if (!embeddedServer) {
      embeddedServer = new EmbeddedServer(app.getPath('userData'));
    }
    if (embeddedServer.isRunning) {
      return { success: true, address: embeddedServer.getAddress() };
    }
    const result = await embeddedServer.start(port || store.get('mpServerPort') || 9527);
    return { success: true, address: result.address };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('mp-stop-server', () => {
  if (embeddedServer && embeddedServer.isRunning) {
    embeddedServer.stop();
  }
  return { success: true };
});

ipcMain.handle('mp-get-server-status', () => {
  return {
    running: embeddedServer ? embeddedServer.isRunning : false,
    address: embeddedServer ? embeddedServer.getAddress() : null,
    onlineCount: embeddedServer ? embeddedServer.onlineCount : 0
  };
});

ipcMain.handle('mp-save-credentials', (_, { username, token }) => {
  store.set('mpUsername', username || '');
  store.set('mpToken', token || '');
  return { success: true };
});

ipcMain.handle('mp-get-credentials', () => {
  return {
    username: store.get('mpUsername') || '',
    token: store.get('mpToken') || ''
  };
});

// Setup global shortcuts
function setupShortcuts() {
  globalShortcut.register('CommandOrControl+Shift+C', () => {
    mainWindow.show();
    mainWindow.webContents.send('toggle-chat');
  });
}

// Input hook setup
let inputHook = null;
let permissionCheckTimer = null;

async function startUioHook() {
  try {
    const { uIOhook, UiohookKey } = require('uiohook-napi');
    inputHook = uIOhook;

    uIOhook.on('keydown', (e) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('global-keydown', { keycode: e.keycode });
      }
      if (keyboardRecorder) {
        keyboardRecorder.processKeydown(e.keycode);
      }
    });

    uIOhook.on('keyup', (e) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('global-keyup', { keycode: e.keycode });
      }
    });

    uIOhook.on('click', (e) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('global-click', { button: e.button, x: e.x, y: e.y });
      }
    });

    let lastMousemoveTime = 0;
    uIOhook.on('mousemove', (e) => {
      const now = Date.now();
      if (now - lastMousemoveTime < 50) return; // 50ms节流 = 最高20fps
      lastMousemoveTime = now;
      
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('global-mousemove', { x: e.x, y: e.y });
      }
    });

    uIOhook.start();
    console.log('Input hook started successfully');
    
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('hook-status-changed', true);
    }
  } catch (err) {
    console.warn('Failed to start input hook:', err.message);
    console.warn('Keyboard/mouse tracking will be limited to app window');
  }
}

async function setupInputHook() {
  // On macOS, check if we should skip input hook to avoid crash when Accessibility permission is missing
  if (process.platform === 'darwin') {
    try {
      const { systemPreferences, shell } = require('electron');
      // Check if accessibility is trusted (macOS 10.9+)
      const isTrusted = systemPreferences.isTrustedAccessibilityClient(false);
      
      if (!isTrusted) {
        console.warn('Accessibility permission not granted. Skipping global input hook.');
        
        // Show dialog to prompt user
        const { response } = await dialog.showMessageBox(mainWindow, {
          type: 'warning',
          buttons: ['暂不开启', '前往设置'],
          defaultId: 1,
          cancelId: 0,
          title: '需要辅助功能权限',
          message: 'ChatCat 需要辅助功能权限',
          detail: '我们需要该权限来追踪键盘和鼠标事件，以实现桌宠的打字动画和工作数据统计功能。\n\n点击"前往设置"，在「隐私与安全性 → 辅助功能」中勾选 ChatCat/Terminal。'
        });
        
        if (response === 1) {
          // Trigger system prompt which also helps register the app in the preferences pane
          systemPreferences.isTrustedAccessibilityClient(true);
          // Open System Preferences to Accessibility pane
          shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility');
          
          // Poll for permission changes every 2 seconds for 1 minute
          let attempts = 0;
          const maxAttempts = 30; // 60 seconds
          
          permissionCheckTimer = setInterval(() => {
            attempts++;
            if (systemPreferences.isTrustedAccessibilityClient(false)) {
              clearInterval(permissionCheckTimer);
              console.log('Accessibility permission granted! Starting hook...');
              startUioHook();
              // Optional: notify user it was successful using OS Notification
              const { Notification } = require('electron');
              if (Notification.isSupported()) {
                new Notification({
                  title: 'ChatCat 权限已获取',
                  body: '猫咪现在可以感知你的工作状态了喵！'
                }).show();
              }
            } else if (attempts >= maxAttempts) {
              clearInterval(permissionCheckTimer);
              console.warn('Timeout waiting for accessibility permission.');
            }
          }, 2000);
        }
        return; // Don't start hook yet
      }
    } catch (err) {
      console.warn('Failed to check accessibility permission:', err.message);
    }
  }

  // If we have permission or not on macOS, start it
  await startUioHook();
}

/**
 * Phase 3: Register all scheduled skills in ScheduledTriggerRegistry.
 *
 * Replaces Renderer-side SkillScheduler timers with Main-side centralized scheduling.
 * All executions route through TriggerBus.
 */
function _registerScheduledSkills(scheduledRegistry, skillRegistry, skillEngine, store) {
  // Legacy skill: textConverter — every 10 minutes
  scheduledRegistry.register('legacy-text-converter', () => {
    return AITrigger.create('skill', 'skill.text-converter', {
      skillId: 'text-converter',
      userContext: {},
    });
  }, {
    intervalMinutes: 10,
    priority: 'NORMAL',
    enabled: (store.get('skillsEnabled') || {}).textConverter !== false,
  });

  // Legacy skill: todoExtractor — every 60 minutes
  scheduledRegistry.register('legacy-todo-extractor', () => {
    return AITrigger.create('skill', 'skill.todo-management', {
      skillId: 'todo-management',
      userContext: { userMessage: '/todo' },
    });
  }, {
    intervalMinutes: 60,
    priority: 'NORMAL',
    enabled: (store.get('skillsEnabled') || {}).todoExtractor !== false,
  });

  // Legacy skill: dailyReport — cron at configured hour
  const reportHour = store.get('dailyReportHour') || 18;
  scheduledRegistry.register('legacy-daily-report', () => {
    return AITrigger.create('skill', 'skill.daily-report', {
      skillId: 'daily-report',
      userContext: {},
    });
  }, {
    cronHour: reportHour,
    priority: 'NORMAL',
    enabled: (store.get('skillsEnabled') || {}).dailyReport !== false,
  });

  // SKILL.md-based scheduled skills from registry
  const allMeta = skillRegistry.getAllMeta();
  const scheduled = allMeta.filter(m => m.schedule);

  for (const meta of scheduled) {
    const scheduleConfig = {};

    if (meta.schedule.cronHour !== undefined) {
      scheduleConfig.cronHour = meta.schedule.cronHour;
    } else if (meta.schedule.interval) {
      scheduleConfig.intervalMinutes = meta.schedule.interval;
    } else {
      continue; // Skip if no valid schedule
    }

    scheduleConfig.priority = 'NORMAL';
    scheduleConfig.enabled = true;

    scheduledRegistry.register(`registry-${meta.name}`, () => {
      return AITrigger.create('skill', `skill.${meta.name}`, {
        skillId: meta.name,
        userContext: {},
      });
    }, scheduleConfig);
  }

  console.log(`[Main] Registered ${3 + scheduled.length} scheduled skills in ScheduledTriggerRegistry`);
}

// ─── A1: Active Window Tracker ─────────────────────────────────────────
const activeWindowTracker = {
  _current: null,
  _history: [],     // Recent 20 entries: { title, app, timestamp }
  _appUsage: {},    // { appName: totalSeconds }

  async poll() {
    try {
      const info = await this._getPlatformWindow();
      if (info && info.app) {
        if (info.app !== this._current?.app || info.title !== this._current?.title) {
          console.log(`[ActiveWindow] Switch: ${info.app} — ${info.title}`);
          this._current = { ...info, timestamp: Date.now() };
          this._history.unshift(this._current);
          if (this._history.length > 20) this._history.pop();
        }
        // Accumulate app usage time
        this._appUsage[info.app] = (this._appUsage[info.app] || 0) + 10;
      }
    } catch (err) {
      // Silently ignore polling errors
    }
  },

  async _getPlatformWindow() {
    if (process.platform === 'win32') {
      return this._getWindowsWindow();
    }
    if (process.platform === 'darwin') {
      const { exec } = require('child_process');
      return new Promise(resolve => {
        exec(
          `osascript -e 'tell application "System Events" to get {name, title of window 1} of first application process whose frontmost is true'`,
          { timeout: 3000 },
          (err, stdout) => {
            if (err) return resolve(null);
            const parts = stdout.trim().split(', ');
            resolve({ app: parts[0] || 'unknown', title: parts[1] || '' });
          }
        );
      });
    }
    return null; // Linux: future extension
  },

  // Windows: Use a compiled .NET script via PowerShell, cached as a temp .exe
  // Falls back to simple Get-Process if compilation fails
  _compiledExePath: null,
  _compileAttempted: false,

  async _getWindowsWindow() {
    const { execFile, exec } = require('child_process');
    const path = require('path');
    const fs = require('fs');

    // Strategy 1: Use compiled helper (fast, ~50ms)
    // Pass --exclude-pid to skip ChatCat's own alwaysOnTop transparent window
    if (this._compiledExePath && fs.existsSync(this._compiledExePath)) {
      const myPid = String(process.pid);
      return new Promise(resolve => {
        execFile(this._compiledExePath, ['--exclude-pid', myPid], { timeout: 2000, windowsHide: true }, (err, stdout) => {
          if (err) return resolve(null);
          try {
            const data = JSON.parse(stdout.trim());
            resolve({ app: data.N || '', title: data.T || '' });
          } catch { resolve(null); }
        });
      });
    }

    // Strategy 2: Compile helper once (first run only)
    if (!this._compileAttempted) {
      this._compileAttempted = true;
      try {
        await this._compileHelper();
        if (this._compiledExePath) {
          return this._getWindowsWindow(); // retry with compiled exe
        }
      } catch {}
    }

    // Strategy 3: Fallback — simple PowerShell (slower, ~500ms, but always works)
    return new Promise(resolve => {
      exec(
        'powershell -NoProfile -Command "Get-Process | Where-Object {$_.MainWindowHandle -ne 0} | Sort-Object -Property @{Expression={if($_.MainWindowHandle -eq [System.Diagnostics.Process]::GetCurrentProcess().MainWindowHandle){0}else{1}}} | Select-Object -First 1 -Property ProcessName,MainWindowTitle | ConvertTo-Json -Compress"',
        { timeout: 5000, windowsHide: true },
        (err, stdout) => {
          if (err) return resolve(null);
          try {
            const data = JSON.parse(stdout.trim());
            resolve({ app: data.ProcessName || '', title: data.MainWindowTitle || '' });
          } catch { resolve(null); }
        }
      );
    });
  },

  async _compileHelper() {
    const path = require('path');
    const fs = require('fs');
    const { exec } = require('child_process');
    const os = require('os');

    const exePath = path.join(os.tmpdir(), 'chatcat-fgwindow.exe');
    const csPath = path.join(__dirname, 'src', 'helpers', 'fgwindow.cs');

    if (!fs.existsSync(csPath)) {
      console.warn('[ActiveWindow] C# source not found:', csPath);
      return;
    }

    // Compile with csc.exe (available on all Windows with .NET Framework)
    return new Promise((resolve, reject) => {
      // Find csc.exe in .NET Framework directory
      const cscPaths = [
        'C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\csc.exe',
        'C:\\Windows\\Microsoft.NET\\Framework\\v4.0.30319\\csc.exe',
      ];
      let cscPath = null;
      for (const p of cscPaths) {
        if (fs.existsSync(p)) { cscPath = p; break; }
      }
      if (!cscPath) return reject(new Error('csc.exe not found'));

      exec(
        `"${cscPath}" /nologo /out:"${exePath}" "${csPath}"`,
        { timeout: 10000, windowsHide: true },
        (err, stdout, stderr) => {
          if (err) {
            console.warn('[ActiveWindow] C# compile failed:', stderr?.trim());
            return reject(err);
          }
          if (fs.existsSync(exePath)) {
            this._compiledExePath = exePath;
            console.log('[ActiveWindow] Compiled helper:', exePath);
            resolve();
          } else {
            reject(new Error('exe not created'));
          }
        }
      );
    });
  },

  _destroyPersistentPS() {
    // No-op, kept for API compatibility
  },

  getCurrent() { return this._current; },
  getHistory() { return this._history; },
  getUsage() { return this._appUsage; },
};

// IPC: get active window data
ipcMain.handle('get-active-window', () => ({
  current: activeWindowTracker.getCurrent(),
  recent: activeWindowTracker.getHistory(),
  appUsage: activeWindowTracker.getUsage(),
}));

// ─── C4: Skill / MCP Import IPC Handlers ──────────────────────────────

ipcMain.handle('skill-import-file', async (_, filePath) => {
  if (!skillImporter) return { success: false, reason: 'Skill importer not initialized' };
  return skillImporter.importFromFile(filePath);
});

ipcMain.handle('skill-import-content', async (_, name, content) => {
  if (!skillImporter) return { success: false, reason: 'Skill importer not initialized' };
  return skillImporter.importFromContent(name, content);
});

ipcMain.handle('skill-get-imported', () => {
  if (!skillImporter) return [];
  return skillImporter.getImported();
});

ipcMain.handle('skill-remove-imported', async (_, name) => {
  if (!skillImporter) return { success: false, reason: 'Skill importer not initialized' };
  return skillImporter.remove(name);
});

ipcMain.handle('mcp-import-config', async (_, configPath) => {
  if (!mcpImporter) return { success: false, reason: 'MCP importer not initialized' };
  return mcpImporter.importFromClaudeConfig(configPath);
});

ipcMain.handle('mcp-import-json', async (_, jsonContent) => {
  if (!mcpImporter) return { success: false, reason: 'MCP importer not initialized' };
  return mcpImporter.importFromJson(jsonContent);
});

ipcMain.handle('mcp-get-imported', () => {
  if (!mcpImporter) return [];
  return mcpImporter.getImported();
});

ipcMain.handle('mcp-remove', async (_, name) => {
  if (!mcpImporter) return { success: false, reason: 'MCP importer not initialized' };
  return mcpImporter.remove(name);
});

// File dialog for importing skills/MCP configs
ipcMain.handle('dialog-open-file', async (_, options) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: options?.filters || [{ name: 'All Files', extensions: ['*'] }],
    title: options?.title || '选择文件',
  });
  if (!result.canceled && result.filePaths.length > 0) {
    return { filePath: result.filePaths[0] };
  }
  return { filePath: null };
});

// C4: Skills manager window close
ipcMain.on('skills-manager-close', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win && !win.isDestroyed()) win.hide();
});

// Windows: 移除默认应用菜单，防止菜单栏导致的边框
Menu.setApplicationMenu(null);

// Windows: 禁用窗口遮挡检测，避免 DWM 对透明窗口的干预
if (process.platform === 'win32') {
  app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion');
}

app.whenReady().then(() => {
  if (process.platform === 'darwin') {
    // 作为桌宠运行：不占用 Dock 和系统顶部菜单栏，但保留托盘与悬浮窗
    app.setActivationPolicy('accessory');
    app.dock?.hide();
  }

  // Allow CDN scripts for Live2D
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; " +
          "script-src 'self' 'unsafe-eval' https://cdn.jsdelivr.net; " +
          "style-src 'self' 'unsafe-inline'; " +
          "img-src 'self' data: https://cdn.jsdelivr.net blob:; " +
          "connect-src *; " +
          "worker-src blob:;"
        ]
      }
    });
  });

  createWindow();

  // Log renderer console messages to main process stdout
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    const prefix = ['LOG', 'WARN', 'ERROR'][level] || 'LOG';
    console.log(`[Renderer ${prefix}] ${message} (${sourceId}:${line})`);
  });

  // V2: Unified AI Client (main process)
  const aiClient = new AIClientMain(store);

  // Phase 2: Unified AI Runtime (main process execution engine)
  const aiRuntime = new AIRuntime(aiClient, { store });

  // Phase 3: TriggerBus (central AI call coordinator)
  const triggerBus = new TriggerBus(aiRuntime, { maxConcurrent: 3 });
  const scheduledRegistry = new ScheduledTriggerRegistry(triggerBus, { store });
  // Expose to IPC handlers (defined at module scope)
  global._triggerBus = triggerBus;
  global._scheduledRegistry = scheduledRegistry;

  // V2: Quick Panel (now with AIRuntime + Phase 3 TriggerBus)
  quickPanelManager = new QuickPanelManager(mainWindow, store, aiClient, aiRuntime, triggerBus);
  quickPanelManager.init();

  // Phase 3: Wire TriggerBus webContents for IPC push
  triggerBus.setWebContents(mainWindow.webContents);
  triggerBus.start();
  scheduledRegistry.start();

  createTray();
  setupShortcuts();
  setupInputHook();

  // Initialize keyboard recorder
  keyboardRecorder = new KeyboardRecorder(mainWindow, store);
  
  // V2 Pillar C: Setup Privacy Consent Manager & Content Segmenter
  const consentManager = new PrivacyConsentManager(store, mainWindow);
  consentManager.init();
  const contentSegmenter = new ContentSegmenter(store);
  
  // Set initial content mode on recorder based on consent
  const isContentEnabled = store.get('contentConsentGranted', false);
  keyboardRecorder.setContentMode(isContentEnabled);
  
  // 授权状态联动记录器启停
  // 注意: PrivacyConsentManager 通过 webContents.send() 发送事件到渲染进程,
  // 不会触发 ipcMain.on()。所以这里提供一个回调函数直接在主进程内调用。
  const onConsentChanged = (granted) => {
    keyboardRecorder.setContentMode(granted);
    
    if (granted) {
      // Auto-set a default directory if none exists
      if (!keyboardRecorder.outputDir) {
        const defaultDir = path.join(app.getPath('userData'), 'records');
        if (!fs.existsSync(defaultDir)) {
          fs.mkdirSync(defaultDir, { recursive: true });
        }
        keyboardRecorder.setOutputDir(defaultDir);
      }
      keyboardRecorder.start();
      console.log('[Pillar C] Auto-started recording with consent. Dir:', keyboardRecorder.outputDir);
    } else {
      keyboardRecorder.stop();
      console.log('[Pillar C] Auto-stopped recording due to consent revocation.');
    }
  };
  consentManager.onConsentChanged = onConsentChanged;

  if (isContentEnabled) {
    // Auto-set a default directory if none exists
    if (!keyboardRecorder.outputDir) {
      const defaultDir = path.join(app.getPath('userData'), 'records');
      if (!fs.existsSync(defaultDir)) {
        fs.mkdirSync(defaultDir, { recursive: true });
      }
      keyboardRecorder.setOutputDir(defaultDir);
    }
    keyboardRecorder.start();
    console.log('[Pillar C] Auto-started recording on app launch (consent granted).');
  }

  // Initialize skills
  textConverter = new TextConverter(store, keyboardRecorder);
  
  // Listen for TextConverter conversion complete to trigger segmentation
  textConverter.onConversionComplete = (date, convertedText) => {
    if (store.get('contentConsentGranted', false)) {
      try {
        contentSegmenter.segment(convertedText, date);
        console.log(`[Pillar C] Segments updated for ${date}`);
      } catch (err) {
        console.error('[Pillar C] Content Segmentation failed:', err);
      }
    }
  };
  
  dailyReport = new DailyReport(store);
  todoExtractor = new TodoExtractor(store);

  // Initialize SKILL.md-based skill system
  skillRegistry = new SkillRegistry(path.join(__dirname, 'src', 'skills', 'skills'));
  skillRegistry.init().then(() => {
    // C4: Initialize skill importer and MCP importer
    skillImporter = new SkillImporter(path.join(__dirname, 'src', 'skills', 'skills'), skillRegistry);
    mcpImporter = new McpConfigImporter(store, skillImporter);

    // C4: Initialize skills manager window
    skillsManager = new SkillsManager(mainWindow);

    // Phase 2: Inject late-initialized services into AIRuntime
    aiRuntime.setServices({ keyboardRecorder, skillRegistry });
    skillEngine = new SkillEngine(store, skillRegistry, keyboardRecorder, aiClient, aiRuntime);
    // Register skill prompts into AI Runtime PromptRegistry
    aiRuntimeDefs.registerSkillPrompts(skillRegistry);

    // Phase 3: Register scheduled skills in ScheduledTriggerRegistry
    _registerScheduledSkills(scheduledRegistry, skillRegistry, skillEngine, store);

    // Phase 3: Wire TriggerBus post-processing for skill results
    triggerBus.on('trigger:completed', (event) => {
      const trigger = triggerBus._entries.get(event.correlationId)?.trigger;
      if (!trigger || trigger.type !== 'skill') return;

      const skillId = trigger.payload?.skillId;
      const result = event.result;
      if (!skillId || !result) return;

      // Post-processing: text-converter saves result to store
      if (skillId === 'text-converter') {
        const today = new Date().toISOString().split('T')[0];
        store.set(`convertedText_${today}`, result);
        console.log(`[TriggerBus:PostProcess] text-converter: saved ${result.length} chars`);
      }

      // Post-processing: todo-management parses todos
      if (skillId === 'todo-management') {
        skillEngine._parseTodosFromAI(result);
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('todos-updated');
        }
      }

      // Post-processing: daily-report saves to store
      if (skillId === 'daily-report') {
        const today = new Date().toISOString().split('T')[0];
        store.set(`dailyReport_${today}`, { content: result, generatedAt: Date.now() });
        console.log(`[TriggerBus:PostProcess] daily-report: saved for ${today}`);
      }
    });

    console.log('[Main] Skill system initialized');
  }).catch(err => {
    console.warn('[Main] Skill system init failed:', err.message);
  });

  // Start clipboard monitoring
  startClipboardPolling();

  // A1: Start active window polling (every 10 seconds)
  setInterval(() => activeWindowTracker.poll(), 10000);
  activeWindowTracker.poll(); // Immediate first poll

  // A1: Persist active window snapshot to store (every 60 seconds)
  setInterval(() => {
    store.set('activeWindowSnapshot', {
      current: activeWindowTracker.getCurrent(),
      recent: activeWindowTracker.getHistory(),
      appUsage: activeWindowTracker.getUsage(),
    });
  }, 60000);
});

app.on('before-quit', () => {
  isQuitting = true;
  // A4: Save last active timestamp for offline adventure
  store.set('lastActiveTime', Date.now());
  // A1: Cleanup persistent PowerShell process
  activeWindowTracker._destroyPersistentPS();
  // Phase 3: Stop TriggerBus and ScheduledTriggerRegistry
  if (global._triggerBus) {
    try { global._triggerBus.stop(); } catch {}
  }
  if (global._scheduledRegistry) {
    try { global._scheduledRegistry.stop(); } catch {}
  }
  if (clipboardTimer) {
    clearInterval(clipboardTimer);
  }
  if (permissionCheckTimer) {
    clearInterval(permissionCheckTimer);
  }
  if (keyboardRecorder) {
    try { keyboardRecorder.stop(); } catch {}
  }
  if (inputHook) {
    try { inputHook.stop(); } catch {}
  }
  if (embeddedServer && embeddedServer.isRunning) {
    try { embeddedServer.stop(); } catch {}
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
