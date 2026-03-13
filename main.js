const { app, BrowserWindow, Tray, Menu, ipcMain, globalShortcut, nativeImage, session, dialog, screen } = require('electron');
const path = require('path');
const Store = require('electron-store');
const { KeyboardRecorder } = require('./src/recorder/keyboard-recorder');

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
    recorderEnabled: false
  }
});

let mainWindow = null;
let tray = null;
let isQuitting = false;
let keyboardRecorder = null;

function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  mainWindow = new BrowserWindow({
    width: width,
    height: height,
    x: 0,
    y: 0,
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
        mainWindow.center();
        const bounds = mainWindow.getBounds();
        store.set('windowPosition', { x: bounds.x, y: bounds.y });
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setToolTip('ChatCat Desktop Pet');
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

// Recorder IPC handlers
ipcMain.handle('recorder-toggle', () => {
  if (!keyboardRecorder) return { recording: false, outputDir: '' };
  if (keyboardRecorder.recording) {
    keyboardRecorder.stop();
    store.set('recorderEnabled', false);
  } else {
    keyboardRecorder.start();
    store.set('recorderEnabled', true);
  }
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

// Setup global shortcuts
function setupShortcuts() {
  globalShortcut.register('CommandOrControl+Shift+C', () => {
    mainWindow.show();
    mainWindow.webContents.send('toggle-chat');
  });
}

// Input hook setup
let inputHook = null;
function setupInputHook() {
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

    uIOhook.on('mousemove', (e) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('global-mousemove', { x: e.x, y: e.y });
      }
    });

    uIOhook.start();
    console.log('Input hook started successfully');
  } catch (err) {
    console.warn('Failed to start input hook:', err.message);
    console.warn('Keyboard/mouse tracking will be limited to app window');
  }
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
  createTray();
  setupShortcuts();
  setupInputHook();

  // Initialize keyboard recorder
  keyboardRecorder = new KeyboardRecorder(mainWindow, store);
  if (store.get('recorderEnabled') && keyboardRecorder.outputDir) {
    keyboardRecorder.start();
  }
});

app.on('before-quit', () => {
  isQuitting = true;
  if (keyboardRecorder) {
    try { keyboardRecorder.stop(); } catch {}
  }
  if (inputHook) {
    try { inputHook.stop(); } catch {}
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
