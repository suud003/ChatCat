const { BrowserWindow, globalShortcut, screen, clipboard, nativeImage, ipcMain } = require('electron');
const path = require('path');
const { TextProcessor } = require('./text-processor');
const { ScreenshotOCR } = require('./screenshot-ocr');

class QuickPanelManager {
  /**
   * @param {BrowserWindow} mainWindow
   * @param {import('electron-store')} store
   * @param {import('../shared/ai-client-main').AIClientMain} aiClient
   */
  constructor(mainWindow, store, aiClient) {
    this._mainWindow = mainWindow;  // 主猫咪窗口引用
    this._store = store;
    this._aiClient = aiClient;
    this._panelWindow = null;
    this._isVisible = false;
    this._textProcessor = new TextProcessor(store);
    this._screenshotOCR = new ScreenshotOCR(store, aiClient);
    this._lastSyncAt = 0;
  }

  init() {
    this._registerShortcuts();
    this._setupIPC();
  }

  _createPanel() {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;
    
    this._panelWindow = new BrowserWindow({
      width: 420,
      height: 520,
      x: Math.round(width / 2 - 210),   // 屏幕居中
      y: Math.round(height * 0.3),       // 上方1/3位置
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      show: false,
      webPreferences: {
        preload: path.join(__dirname, 'quick-panel-preload.js'),
        contextIsolation: true,
        nodeIntegration: false
      }
    });
    
    this._panelWindow.loadFile(path.join(__dirname, 'quick-panel.html'));
    
    // 失焦自动隐藏 (可选，用户可在设置中关闭)
    this._panelWindow.on('blur', () => {
      if (this._store.get('quickPanelAutoHide', true)) {
        this.hide();
      }
    });
    
    this._panelWindow.on('closed', () => {
      this._panelWindow = null;
      this._isVisible = false;
    });
  }

  _clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  async _positionPanelAboveCat() {
    if (!this._panelWindow || this._panelWindow.isDestroyed()) return;
    if (!this._mainWindow || this._mainWindow.isDestroyed()) return;

    const panelBounds = this._panelWindow.getBounds();
    const defaultDisplay = screen.getDisplayMatching(this._mainWindow.getBounds());
    const defaultArea = defaultDisplay.workArea;

    // Fallback: center-ish position in current display work area.
    const fallback = {
      x: Math.round(defaultArea.x + (defaultArea.width - panelBounds.width) / 2),
      y: Math.round(defaultArea.y + defaultArea.height * 0.3),
    };

    try {
      const petRect = await this._mainWindow.webContents.executeJavaScript(
        `(() => {
          const el = document.getElementById('pet-container');
          if (!el) return null;
          const r = el.getBoundingClientRect();
          return {
            left: r.left,
            top: r.top,
            right: r.left + r.width,
            width: r.width,
            height: r.height
          };
        })()`,
        true
      );

      if (!petRect || !Number.isFinite(petRect.left) || !Number.isFinite(petRect.top)) {
        this._panelWindow.setPosition(fallback.x, fallback.y);
        return;
      }

      const mainBounds = this._mainWindow.getBounds();
      const catCenterX = Math.round(mainBounds.x + petRect.left + petRect.width / 2);
      const catTopY = Math.round(mainBounds.y + petRect.top);
      const catRightX = Math.round(mainBounds.x + petRect.right);

      const targetDisplay = screen.getDisplayNearestPoint({ x: catCenterX, y: catTopY });
      const workArea = targetDisplay.workArea;
      // Keep consistent with other panel feeling: panel sits above pet, and
      // the panel's bottom-right side points toward the pet.
      const desiredX = Math.round(catRightX - panelBounds.width + 24);
      const desiredY = Math.round(catTopY - panelBounds.height - 18);

      const minX = workArea.x + 10;
      const maxX = workArea.x + workArea.width - panelBounds.width - 10;
      const minY = workArea.y + 10;
      const maxY = workArea.y + workArea.height - panelBounds.height - 10;

      let safeX = this._clamp(desiredX, minX, maxX);
      let safeY = this._clamp(desiredY, minY, maxY);

      // If there isn't enough space above cat, move panel to side so it won't block pet dragging.
      if (desiredY < minY) {
        safeY = minY;
        const gap = 18;
        const catLeftScreen = Math.round(mainBounds.x + petRect.left);
        const catRightScreen = Math.round(mainBounds.x + petRect.right);
        const rightX = catRightScreen + gap;
        const leftX = catLeftScreen - panelBounds.width - gap;

        if (rightX <= maxX) {
          safeX = rightX;
        } else if (leftX >= minX) {
          safeX = leftX;
        }
      }

      this._panelWindow.setPosition(safeX, safeY);
    } catch (err) {
      console.warn('[QuickPanel] Failed to position above cat:', err.message);
      this._panelWindow.setPosition(fallback.x, fallback.y);
    }
  }

  _registerShortcuts() {
    // Quick Panel 开关
    const toggleRegistered = globalShortcut.register('CommandOrControl+Shift+Space', () => {
      this.toggle();
    });

    if (!toggleRegistered) {
      console.warn('[QuickPanel] ⚠️ 快捷键 Cmd+Shift+Space 注册失败，可能被系统或其他应用占用');
    } else {
      console.log('[QuickPanel] ✅ 快捷键 Cmd+Shift+Space 注册成功');
    }

    const screenshotRegistered = globalShortcut.register('CommandOrControl+Shift+S', () => {
      this._startScreenshot();
    });

    if (!screenshotRegistered) {
      console.warn('[QuickPanel] ⚠️ 快捷键 Cmd+Shift+S 注册失败，可能被系统或其他应用占用');
    } else {
      console.log('[QuickPanel] ✅ 快捷键 Cmd+Shift+S 注册成功');
    }

    // 记录注册状态，供主窗口查询
    this._shortcutStatus = {
      toggle: toggleRegistered,
      screenshot: screenshotRegistered
    };

    // 如果有快捷键注册失败，通知主窗口
    if (!toggleRegistered || !screenshotRegistered) {
      setTimeout(() => {
        if (this._mainWindow && !this._mainWindow.isDestroyed()) {
          this._mainWindow.webContents.send('qp-shortcut-status', this._shortcutStatus);
        }
      }, 2000);
    }
  }

  _setupIPC() {
    // Quick Panel 切换 (来自工具栏按钮)
    ipcMain.on('qp-toggle', () => {
      this.toggle();
    });

    ipcMain.handle('qp-show', async () => {
      await this.show();
      return { visible: this.isVisible() };
    });

    ipcMain.handle('qp-hide', () => {
      this.hide();
      return { visible: this.isVisible() };
    });

    ipcMain.handle('qp-is-visible', () => {
      return { visible: this.isVisible() };
    });

    // 查询快捷键注册状态
    ipcMain.handle('qp-get-shortcut-status', () => {
      return this._shortcutStatus || { toggle: false, screenshot: false };
    });

    // 文本处理请求
    ipcMain.handle('qp-process-text', async (event, mode, text) => {
      const promptObj = this._textProcessor.buildPrompt(mode, text);
      
      try {
        const result = await this._aiClient.stream({
          messages: [
            { role: 'system', content: promptObj.system },
            { role: 'user', content: promptObj.user }
          ],
          temperature: 0.4,
          maxTokens: 800,
          onChunk: (chunk) => {
            if (this._panelWindow && !this._panelWindow.isDestroyed()) {
              this._panelWindow.webContents.send('qp-stream-chunk', chunk);
            }
          },
        });
        
        this._saveToHistory(mode, promptObj.user, result);
        
        if (this._panelWindow && !this._panelWindow.isDestroyed()) {
          this._panelWindow.webContents.send('qp-stream-end', result);
        }
        
        return result;
      } catch (err) {
        console.error('[QuickPanel] AI 请求失败:', err.message);
        if (this._panelWindow && !this._panelWindow.isDestroyed()) {
          this._panelWindow.webContents.send('qp-stream-error', err.message);
        }
        throw err;
      }
    });
    
    // 问答请求
    ipcMain.handle('qp-ask', async (event, question, history) => {
      const messages = [
        { role: 'system', content: '你是 ChatCat 🐱，一只聪明的AI猫咪助手。简洁准确地回答用户的问题。' },
        ...history
      ];
      
      try {
        const result = await this._aiClient.stream({
          messages,
          temperature: 0.4,
          maxTokens: 800,
          onChunk: (chunk) => {
            if (this._panelWindow && !this._panelWindow.isDestroyed()) {
              this._panelWindow.webContents.send('qp-stream-chunk', chunk);
            }
          },
        });
        
        this._saveToHistory('ask', messages[messages.length - 1].content, result);
        
        if (this._panelWindow && !this._panelWindow.isDestroyed()) {
          this._panelWindow.webContents.send('qp-stream-end', result);
        }
        
        return result;
      } catch (err) {
        console.error('[QuickPanel] AI 请求失败:', err.message);
        if (this._panelWindow && !this._panelWindow.isDestroyed()) {
          this._panelWindow.webContents.send('qp-stream-error', err.message);
        }
        throw err;
      }
    });
    
    // 复制
    ipcMain.on('qp-copy', (event, text) => {
      clipboard.writeText(text);
    });
    
    // 关闭
    ipcMain.on('qp-close', () => {
      this.hide();
    });

    ipcMain.on('qp-screenshot', () => {
      this._startScreenshot();
    });

    ipcMain.on('qp-feedback', (event, data) => {
      const feedbackList = this._store.get('qpFeedback', []);
      feedbackList.push(data);
      this._store.set('qpFeedback', feedbackList);
    });

    // 从剪贴板读取图片并自动识别（由猫咪气泡触发）
    ipcMain.handle('qp-recognize-clipboard-image', async () => {
      try {
        const image = clipboard.readImage();
        if (image.isEmpty()) {
          throw new Error('剪贴板中没有图片');
        }
        
        const base64 = image.toDataURL().replace(/^data:image\/\w+;base64,/, '');
        
        // 打开 Quick Panel
        this.show();
        
        // 等面板加载完再发送图片
        await new Promise(resolve => setTimeout(resolve, 300));
        
        if (this._panelWindow && !this._panelWindow.isDestroyed()) {
          // 先让 Quick Panel 显示图片预览和加载状态
          this._panelWindow.webContents.send('qp-auto-recognize-image', {
            base64,
            dataUrl: image.toDataURL()
          });
        }
        
        // 执行识别
        if (this._panelWindow && !this._panelWindow.isDestroyed()) {
          this._panelWindow.webContents.send('qp-display-direct-result', {
            mode: 'screenshot',
            result: '⏳ 正在识别图片内容，请稍候...'
          });
        }
        
        const config = {
          visionModel: this._store.get('visionModel'),
          modelName: this._store.get('modelName'),
        };
        
        const result = await this._screenshotOCR.processImage(base64, config);
        
        this._saveToHistory('ocr', '[剪贴板图片]', result);
        
        if (this._panelWindow && !this._panelWindow.isDestroyed()) {
          this._panelWindow.webContents.send('qp-display-direct-result', {
            mode: 'screenshot',
            result: result
          });
        }
        
        return result;
      } catch (err) {
        console.error('[QuickPanel] 剪贴板图片识别失败:', err.message);
        if (this._panelWindow && !this._panelWindow.isDestroyed()) {
          this._panelWindow.webContents.send('qp-display-direct-result', {
            mode: 'screenshot',
            result: `❌ 图片识别失败:\n${err.message}`
          });
        }
        throw err;
      }
    });

    // 粘贴图片识别
    ipcMain.handle('qp-recognize-image', async (event, base64) => {
      try {
        if (this._panelWindow && !this._panelWindow.isDestroyed()) {
          this._panelWindow.webContents.send('qp-display-direct-result', {
            mode: 'screenshot',
            result: '⏳ 正在识别图片内容，请稍候...'
          });
        }
        
        const config = {
          visionModel: this._store.get('visionModel'),
          modelName: this._store.get('modelName'),
        };
        
        const result = await this._screenshotOCR.processImage(base64, config);
        
        this._saveToHistory('ocr', '[粘贴图片]', result);
        
        if (this._panelWindow && !this._panelWindow.isDestroyed()) {
          this._panelWindow.webContents.send('qp-display-direct-result', {
            mode: 'screenshot',
            result: result
          });
        }
        
        return result;
      } catch (err) {
        console.error('[QuickPanel] 粘贴图片识别失败:', err.message);
        if (this._panelWindow && !this._panelWindow.isDestroyed()) {
          this._panelWindow.webContents.send('qp-display-direct-result', {
            mode: 'screenshot',
            result: `❌ 图片识别失败:\n${err.message}`
          });
        }
        throw err;
      }
    });
    
    // 处理历史
    ipcMain.handle('qp-get-history', async () => {
      return this._store.get('qpHistory', []);
    });

    // 监听显示结果请求 (从 renderer.js 触发)
    ipcMain.on('qp-show-result', (event, data) => {
      this.show();
      setTimeout(() => {
        if (this._panelWindow && !this._panelWindow.isDestroyed()) {
          this._panelWindow.webContents.send('qp-display-direct-result', data);
        }
      }, 500);
    });
  }

  _saveToHistory(mode, input, result) {
    const history = this._store.get('qpHistory', []);
    history.push({
      mode,
      input: typeof input === 'string' ? input.slice(0, 200) : '',
      result: result.slice(0, 500),
      timestamp: Date.now()
    });
    
    if (history.length > 50) {
      history.splice(0, history.length - 50);
    }
    
    this._store.set('qpHistory', history);
  }

  toggle() {
    if (this._isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }
  
  async show() {
    if (!this._panelWindow || this._panelWindow.isDestroyed()) {
      this._createPanel();
    }

    await this._positionPanelAboveCat();
    
    const clipText = clipboard.readText();
    const clipImage = clipboard.readImage();
    
    this._panelWindow.webContents.send('panel-show', {
      clipboardText: clipText || '',
      hasImage: !clipImage.isEmpty(),
    });
    
    this._panelWindow.show();
    this._panelWindow.focus();
    this._isVisible = true;
  }
  
  hide() {
    if (this._panelWindow && !this._panelWindow.isDestroyed()) {
      this._panelWindow.hide();
    }
    this._isVisible = false;
  }

  isVisible() {
    return !!(
      this._isVisible &&
      this._panelWindow &&
      !this._panelWindow.isDestroyed() &&
      this._panelWindow.isVisible()
    );
  }

  syncToPetPosition(force = false) {
    if (!this.isVisible()) return;
    const now = Date.now();
    if (!force && now - this._lastSyncAt < 80) return;
    this._lastSyncAt = now;
    this._positionPanelAboveCat().catch(() => {});
  }

  async _startScreenshot() {
    this.hide();
    try {
      const base64 = await this._screenshotOCR.captureScreen();
      if (base64) {
        this.show();
        
        if (this._panelWindow && !this._panelWindow.isDestroyed()) {
          this._panelWindow.webContents.send('qp-display-direct-result', {
            mode: 'screenshot',
            result: '⏳ 正在识别图片内容，请稍候...'
          });
        }
        
        const config = {
          visionModel: this._store.get('visionModel'),
          modelName: this._store.get('modelName'),
        };
        
        const result = await this._screenshotOCR.processImage(base64, config);
        
        this._saveToHistory('ocr', '[图片截图]', result);
        
        if (this._panelWindow && !this._panelWindow.isDestroyed()) {
          this._panelWindow.webContents.send('qp-display-direct-result', {
            mode: 'screenshot',
            result: result
          });
        }
      }
    } catch (err) {
      console.error('[QuickPanel] 截图识别失败:', err.message);
      if (this._panelWindow && !this._panelWindow.isDestroyed()) {
          this.show();
          this._panelWindow.webContents.send('qp-display-direct-result', {
            mode: 'screenshot',
            result: `❌ 截图或识别失败:\n${err.message}`
          });
      }
    }
  }

  destroy() {
    if (this._panelWindow && !this._panelWindow.isDestroyed()) {
      this._panelWindow.destroy();
    }
    globalShortcut.unregister('CommandOrControl+Shift+Space');
    globalShortcut.unregister('CommandOrControl+Shift+S');
  }
}

module.exports = { QuickPanelManager };
