const { BrowserWindow, globalShortcut, screen, clipboard, nativeImage, ipcMain } = require('electron');
const path = require('path');
const { TextProcessor } = require('./text-processor');
const { ScreenshotOCR } = require('./screenshot-ocr');
const { AITrigger, TRIGGER_TYPES } = require('../ai-runtime/trigger');

class QuickPanelManager {
  /**
   * @param {BrowserWindow} mainWindow
   * @param {import('electron-store')} store
   * @param {import('../shared/ai-client-main').AIClientMain} aiClient
   * @param {import('../ai-runtime/runtime').AIRuntime} aiRuntime
   * @param {import('../ai-runtime/trigger-bus').TriggerBus} [triggerBus]
   */
  constructor(mainWindow, store, aiClient, aiRuntime, triggerBus) {
    this._mainWindow = mainWindow;
    this._store = store;
    this._aiClient = aiClient;
    this._aiRuntime = aiRuntime;
    this._triggerBus = triggerBus || null;
    this._isVisible = false;
    this._textProcessor = new TextProcessor(store);
    this._screenshotOCR = new ScreenshotOCR(store, aiClient, aiRuntime, mainWindow);
  }

  init() {
    this._registerShortcuts();
    this._setupIPC();
  }

  /**
   * Send IPC message to both panel window and main window (inline UI).
   * The inline QuickPanel UI lives inside mainWindow, so we must send there too.
   */
  _sendToUI(channel, ...args) {
    if (this._panelWindow && !this._panelWindow.isDestroyed()) {
      this._panelWindow.webContents.send(channel, ...args);
    }
    if (this._mainWindow && !this._mainWindow.isDestroyed()) {
      this._mainWindow.webContents.send(channel, ...args);
    }
  }

  _createPanel() {
    // quick-panel.html has been removed — QuickPanel now uses inline UI inside mainWindow.
    // Standalone panel window is no longer created.
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
      this.toggle().catch(() => {});
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

    ipcMain.handle('qp-set-visible', async (_, visible) => {
      if (visible) {
        await this.show();
      } else {
        this.hide();
      }
      return { visible: this.isVisible() };
    });

    ipcMain.on('qp-report-size', (_, size) => {
      const h = Number(size?.height);
      if (!Number.isFinite(h) || h <= 0) return;
      this._resizeWindowToContent(h);
    });

    // 查询快捷键注册状态
    ipcMain.handle('qp-get-shortcut-status', () => {
      return this._shortcutStatus || { toggle: false, screenshot: false };
    });

    // 文本处理请求 (Phase 3: via TriggerBus, fallback to AIRuntime)
    ipcMain.handle('qp-process-text', async (event, mode, text) => {
      try {
        const trigger = AITrigger.create(TRIGGER_TYPES.QUICK_TEXT, `quick.${mode}`, { mode, text });
        let result;

        if (this._triggerBus) {
          // Phase 3: Route through TriggerBus
          const { correlationId } = this._triggerBus.submit(trigger, { priority: 'NORMAL' });

          // Subscribe to chunks for streaming to QuickPanel window
          const chunkHandler = (evt) => {
            if (evt.correlationId === correlationId) {
              this._sendToUI('qp-stream-chunk', evt.chunk);
            }
          };
          this._triggerBus.on('trigger:chunk', chunkHandler);

          const busResult = await this._triggerBus.getResult(correlationId, 60000);
          this._triggerBus.removeListener('trigger:chunk', chunkHandler);

          if (busResult.status === 'completed') {
            result = busResult.result;
          } else {
            throw new Error(busResult.error || 'TriggerBus execution failed');
          }
        } else {
          // Phase 2 fallback: direct AIRuntime
          result = await this._aiRuntime.runStream(trigger, (chunk) => {
            this._sendToUI('qp-stream-chunk', chunk);
          });
        }

        this._saveToHistory(mode, text, result);
        this._sendToUI('qp-stream-end', result);

        return result;
      } catch (err) {
        console.error('[QuickPanel] AI 请求失败:', err.message);
        this._sendToUI('qp-stream-error', err.message);
        throw err;
      }
    });
    
    // 问答请求 (Phase 3: via TriggerBus, fallback to AIRuntime)
    ipcMain.handle('qp-ask', async (event, question, history) => {
      try {
        const trigger = AITrigger.create(TRIGGER_TYPES.QUICK_ASK, 'quick.ask', { question, history });
        let result;

        if (this._triggerBus) {
          // Phase 3: Route through TriggerBus
          const { correlationId } = this._triggerBus.submit(trigger, { priority: 'NORMAL' });

          const chunkHandler = (evt) => {
            if (evt.correlationId === correlationId) {
              this._sendToUI('qp-stream-chunk', evt.chunk);
            }
          };
          this._triggerBus.on('trigger:chunk', chunkHandler);

          const busResult = await this._triggerBus.getResult(correlationId, 60000);
          this._triggerBus.removeListener('trigger:chunk', chunkHandler);

          if (busResult.status === 'completed') {
            result = busResult.result;
          } else {
            throw new Error(busResult.error || 'TriggerBus execution failed');
          }
        } else {
          // Phase 2 fallback: direct AIRuntime
          result = await this._aiRuntime.runStream(trigger, (chunk) => {
            this._sendToUI('qp-stream-chunk', chunk);
          });
        }

        const lastMsg = Array.isArray(history) && history.length > 0
          ? history[history.length - 1].content
          : question;
        this._saveToHistory('ask', lastMsg, result);
        this._sendToUI('qp-stream-end', result);

        return result;
      } catch (err) {
        console.error('[QuickPanel] AI 请求失败:', err.message);
        this._sendToUI('qp-stream-error', err.message);
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

    // 从剪贴板读取图片（由猫咪气泡触发）
    // 注意：只是打开面板和显示预览，用户需要在 QuickPanel 内确认才会执行 OCR
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
          // 发送图片预览给 QuickPanel（用户需在面板内手动点击"开始识别"才执行 OCR）
          this._panelWindow.webContents.send('qp-auto-recognize-image', {
            base64,
            dataUrl: image.toDataURL()
          });
        }
        // Also send to main window inline UI
        if (this._mainWindow && !this._mainWindow.isDestroyed()) {
          this._mainWindow.webContents.send('qp-auto-recognize-image', {
            base64,
            dataUrl: image.toDataURL()
          });
        }
        
        return { success: true, message: '已打开 QuickPanel，请点击"开始识别"按钮' };
      } catch (err) {
        console.error('[QuickPanel] 剪贴板图片处理失败:', err.message);
        throw err;
      }
    });

    // 粘贴图片识别
    ipcMain.handle('qp-recognize-image', async (event, base64) => {
      try {
        this._sendToUI('qp-display-direct-result', {
          mode: 'screenshot',
          result: '⏳ 正在识别图片内容，请稍候...'
        });

        const config = {
          visionModel: this._store.get('visionModel'),
          modelName: this._store.get('modelName'),
        };

        const result = await this._screenshotOCR.processImage(base64, config);

        this._saveToHistory('ocr', '[粘贴图片]', result);

        this._sendToUI('qp-display-direct-result', {
          mode: 'screenshot',
          result: result
        });

        return result;
      } catch (err) {
        console.error('[QuickPanel] 粘贴图片识别失败:', err.message);
        this._sendToUI('qp-display-direct-result', {
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
      setTimeout(() => {
        this._sendToUI('qp-display-direct-result', data);
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

  async toggle() {
    if (this._isVisible) {
      this.hide();
    } else {
      await this.show();
    }
  }
  
  async show() {
    if (!this._panelWindow || this._panelWindow.isDestroyed()) {
      this._createPanel();
    }
    // _createPanel() is a no-op (panel HTML removed) — skip panel window operations
    if (!this._panelWindow || this._panelWindow.isDestroyed()) {
      this._isVisible = true;
      return;
    }
    if (!this._panelWindow.webContents.isLoadingMainFrame()) {
      // no-op
    } else {
      await new Promise(resolve => {
        this._panelWindow.webContents.once('did-finish-load', resolve);
      });
    }

    // First positioning before show.
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

    // Re-anchor after show to avoid falling back to initial center position.
    this.syncToPetPosition(true);
    setTimeout(() => this.syncToPetPosition(true), 80);
    setTimeout(() => this.syncToPetPosition(true), 220);
  }

  /**
   * Reposition QuickPanel to the upper-left of the pet cat.
   */
  _repositionToNearPet() {
    if (!this._panelWindow || this._panelWindow.isDestroyed()) return;
    if (!this._lastPetScreenPos) return;

    const { screenX, screenY, width: petW } = this._lastPetScreenPos;
    const [panelW, panelH] = this._panelWindow.getSize();

    // Place to the upper-left of the pet
    let x = Math.round(screenX - panelW - 10);
    let y = Math.round(screenY - panelH + 100);

    // Keep on screen
    const display = screen.getDisplayNearestPoint({ x: screenX, y: screenY });
    const { x: wX, y: wY, width: wW, height: wH } = display.workArea;

    // If not enough space on the left, try upper-right
    if (x < wX) {
      x = Math.round(screenX + petW + 10);
    }
    // Clamp to screen bounds
    x = Math.max(wX, Math.min(x, wX + wW - panelW));
    y = Math.max(wY, Math.min(y, wY + wH - panelH));

    this._panelWindow.setPosition(x, y);
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

  _resizeWindowToContent(contentHeight) {
    if (!this._panelWindow || this._panelWindow.isDestroyed()) return;
    const current = this._panelWindow.getBounds();
    const display = screen.getDisplayMatching(current);
    const minH = 220;
    const maxH = Math.max(minH, Math.min(680, display.workArea.height - 20));
    const nextH = this._clamp(Math.round(contentHeight), minH, maxH);
    if (Math.abs(nextH - current.height) <= 2) return;

    this._panelWindow.setBounds({
      x: current.x,
      y: current.y,
      width: current.width,
      height: nextH,
    });

    // Keep alignment stable after height change.
    this.syncToPetPosition(true);
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

        this._sendToUI('qp-display-direct-result', {
          mode: 'screenshot',
          result: '⏳ 正在识别图片内容，请稍候...'
        });

        const config = {
          visionModel: this._store.get('visionModel'),
          modelName: this._store.get('modelName'),
        };

        const result = await this._screenshotOCR.processImage(base64, config);

        this._saveToHistory('ocr', '[图片截图]', result);

        this._sendToUI('qp-display-direct-result', {
          mode: 'screenshot',
          result: result
        });
      }
    } catch (err) {
      console.error('[QuickPanel] 截图识别失败:', err.message);
      this.show();
      this._sendToUI('qp-display-direct-result', {
        mode: 'screenshot',
        result: `❌ 截图或识别失败:\n${err.message}`
      });
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
