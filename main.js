const { app, BrowserWindow, Tray, Menu, ipcMain, globalShortcut, nativeImage, session, dialog, screen, clipboard } = require('electron');
const path = require('path');
const Store = require('electron-store');
const { KeyboardRecorder } = require('./src/recorder/keyboard-recorder');
const { TextConverter } = require('./src/skills/text-converter');
const { DailyReport } = require('./src/skills/daily-report');
const { TodoExtractor } = require('./src/skills/todo-extractor');
const { SkillRegistry } = require('./src/skills/skill-registry');
const { SkillEngine } = require('./src/skills/skill-engine');
const { EmbeddedServer } = require('./src/multiplayer/embedded-server');

const { QuickPanelManager } = require('./src/quick-panel/quick-panel-main');
const { AIClientMain } = require('./src/shared/ai-client-main');

// V2 Pillar C Imports
const { PrivacyConsentManager } = require('./src/consent/privacy-consent');
const { ContentSegmenter } = require('./src/cleaner/content-segmenter');

const store = new Store({
  defaults: {
    apiBaseUrl: 'https://api.openai.com/v1',
    apiKey: '',
    modelName: 'gpt-3.5-turbo',
    opacity: 1.0,
    character: 'bongo-classic',
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
    mpToken: ''
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

function createWindow() {
  // Use the primary display for initial window placement.
  // Multi-monitor support: renderer tracks cat's screen position and asks main
  // process to move the window when the cat crosses screen boundaries.
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

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
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  // Click-through on transparent areas, forward mouse events so hover still works
  mainWindow.setIgnoreMouseEvents(true, { forward: true });

  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));

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
ipcMain.handle('set-store', (_, key, value) => store.set(key, value));
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
});

// Multi-monitor: move window to the display containing the given screen point
ipcMain.on('move-to-display', (_, { screenX, screenY }) => {
  moveWindowToDisplay(screenX, screenY);
  quickPanelManager?.syncToPetPosition();
});

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

// Skill IPC handlers
ipcMain.handle('skill-trigger', async (_, skillId) => {
  try {
    switch (skillId) {
      case 'textConverter':
        if (textConverter) return await textConverter.execute();
        return { success: false, reason: 'not-initialized' };
      case 'dailyReport':
        if (dailyReport) return await dailyReport.execute();
        return { success: false, reason: 'not-initialized' };
      case 'todoExtractor':
        if (todoExtractor) return await todoExtractor.execute();
        return { success: false, reason: 'not-initialized' };
      default:
        return { success: false, reason: 'unknown-skill' };
    }
  } catch (err) {
    return { success: false, reason: 'error', error: err.message };
  }
});

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

app.whenReady().then(() => {
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

  // V2: Quick Panel
  quickPanelManager = new QuickPanelManager(mainWindow, store, aiClient);
  quickPanelManager.init();

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
    skillEngine = new SkillEngine(store, skillRegistry, keyboardRecorder, aiClient);
    console.log('[Main] Skill system initialized');
  }).catch(err => {
    console.warn('[Main] Skill system init failed:', err.message);
  });

  // Start clipboard monitoring
  startClipboardPolling();
});

app.on('before-quit', () => {
  isQuitting = true;
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
