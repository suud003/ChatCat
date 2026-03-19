const { globalShortcut, clipboard, ipcMain } = require('electron');
const { TextProcessor } = require('./text-processor');
const { ScreenshotOCR } = require('./screenshot-ocr');

class QuickPanelManager {
  /**
   * @param {BrowserWindow} mainWindow
   * @param {import('electron-store')} store
   * @param {import('../shared/ai-client-main').AIClientMain} aiClient
   */
  constructor(mainWindow, store, aiClient) {
    this._mainWindow = mainWindow;
    this._store = store;
    this._aiClient = aiClient;
    this._isVisible = false;
    this._textProcessor = new TextProcessor(store);
    this._screenshotOCR = new ScreenshotOCR(store, aiClient);
  }

  init() {
    this._registerShortcuts();
    this._setupIPC();
  }

  _sendToRenderer(channel, data) {
    if (!this._mainWindow || this._mainWindow.isDestroyed()) return;
    this._mainWindow.webContents.send(channel, data);
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
    ipcMain.on('qp-toggle', async () => {
      await this.toggle();
    });

    ipcMain.handle('qp-show', async () => {
      this.show();
      return { visible: this.isVisible() };
    });

    ipcMain.handle('qp-hide', () => {
      this.hide();
      return { visible: this.isVisible() };
    });

    ipcMain.handle('qp-is-visible', () => {
      return { visible: this.isVisible() };
    });

    ipcMain.handle('qp-set-visible', (_, visible) => {
      this._isVisible = !!visible;
      return { visible: this._isVisible };
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
            this._sendToRenderer('qp-stream-chunk', chunk);
          },
        });
        
        this._saveToHistory(mode, promptObj.user, result);
        this._sendToRenderer('qp-stream-end', result);
        
        return result;
      } catch (err) {
        console.error('[QuickPanel] AI 请求失败:', err.message);
        this._sendToRenderer('qp-stream-error', err.message);
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
            this._sendToRenderer('qp-stream-chunk', chunk);
          },
        });
        
        this._saveToHistory('ask', messages[messages.length - 1].content, result);
        this._sendToRenderer('qp-stream-end', result);
        
        return result;
      } catch (err) {
        console.error('[QuickPanel] AI 请求失败:', err.message);
        this._sendToRenderer('qp-stream-error', err.message);
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
        
        this.show();
        this._sendToRenderer('qp-auto-recognize-image', {
          base64,
          dataUrl: image.toDataURL()
        });
        this._sendToRenderer('qp-display-direct-result', {
          mode: 'screenshot',
          result: '⏳ 正在识别图片内容，请稍候...'
        });
        
        const config = {
          visionModel: this._store.get('visionModel'),
          modelName: this._store.get('modelName'),
        };
        
        const result = await this._screenshotOCR.processImage(base64, config);
        
        this._saveToHistory('ocr', '[剪贴板图片]', result);
        this._sendToRenderer('qp-display-direct-result', {
          mode: 'screenshot',
          result: result
        });
        
        return result;
      } catch (err) {
        console.error('[QuickPanel] 剪贴板图片识别失败:', err.message);
        this._sendToRenderer('qp-display-direct-result', {
          mode: 'screenshot',
          result: `❌ 图片识别失败:\n${err.message}`
        });
        throw err;
      }
    });

    // 粘贴图片识别
    ipcMain.handle('qp-recognize-image', async (event, base64) => {
      try {
        this.show();
        this._sendToRenderer('qp-display-direct-result', {
          mode: 'screenshot',
          result: '⏳ 正在识别图片内容，请稍候...'
        });
        
        const config = {
          visionModel: this._store.get('visionModel'),
          modelName: this._store.get('modelName'),
        };
        
        const result = await this._screenshotOCR.processImage(base64, config);
        
        this._saveToHistory('ocr', '[粘贴图片]', result);
        this._sendToRenderer('qp-display-direct-result', {
          mode: 'screenshot',
          result: result
        });
        
        return result;
      } catch (err) {
        console.error('[QuickPanel] 粘贴图片识别失败:', err.message);
        this._sendToRenderer('qp-display-direct-result', {
          mode: 'screenshot',
          result: `❌ 图片识别失败:\n${err.message}`
        });
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
      this._sendToRenderer('qp-display-direct-result', data);
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
  
  show() {
    const clipText = clipboard.readText();
    const clipImage = clipboard.readImage();
    this._sendToRenderer('qp-open', {
      clipboardText: clipText || '',
      hasImage: !clipImage.isEmpty(),
    });
    this._isVisible = true;
  }
  
  hide() {
    this._sendToRenderer('qp-close-ui');
    this._isVisible = false;
  }

  isVisible() {
    return this._isVisible;
  }

  syncToPetPosition() {
    // DOM panel follows the same in-renderer positioning/drag system as other panels.
  }

  async _startScreenshot() {
    this.hide();
    try {
      const base64 = await this._screenshotOCR.captureScreen();
      if (base64) {
        this.show();
        this._sendToRenderer('qp-display-direct-result', {
          mode: 'screenshot',
          result: '⏳ 正在识别图片内容，请稍候...'
        });
        
        const config = {
          visionModel: this._store.get('visionModel'),
          modelName: this._store.get('modelName'),
        };
        
        const result = await this._screenshotOCR.processImage(base64, config);
        
        this._saveToHistory('ocr', '[图片截图]', result);
        this._sendToRenderer('qp-display-direct-result', {
          mode: 'screenshot',
          result: result
        });
      }
    } catch (err) {
      console.error('[QuickPanel] 截图识别失败:', err.message);
      this.show();
      this._sendToRenderer('qp-display-direct-result', {
        mode: 'screenshot',
        result: `❌ 截图或识别失败:\n${err.message}`
      });
    }
  }

  destroy() {
    globalShortcut.unregister('CommandOrControl+Shift+Space');
    globalShortcut.unregister('CommandOrControl+Shift+S');
  }
}

module.exports = { QuickPanelManager };
