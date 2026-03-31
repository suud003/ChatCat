const { BrowserWindow, ipcMain } = require('electron');
const path = require('path');

class PrivacyConsentManager {
  constructor(store, mainWindow) {
    this._store = store;
    this._mainWindow = mainWindow;
    this._consentWindow = null;
    // 主进程内部回调，在授权状态变化时由 main.js 设置
    this.onConsentChanged = null;
  }
  
  init() {
    // 监听授权请求
    ipcMain.handle('consent-check', () => {
      return this.isConsentGranted();
    });
    
    ipcMain.handle('consent-request', async () => {
      return this.requestConsent();
    });
    
    ipcMain.handle('consent-revoke', () => {
      return this.revokeConsent();
    });

    // 如果未来 Pillar C 的数据使用范围变化，需要重新授权
    const CURRENT_CONSENT_VERSION = '1.0';
    if (this._store.get('contentConsentVersion') !== CURRENT_CONSENT_VERSION) {
      // 新版本需要重新授权
      this._store.set('contentConsentGranted', false);
    }
  }
  
  isConsentGranted() {
    return this._store.get('contentConsentGranted', false);
  }
  
  getConsentInfo() {
    return {
      granted: this._store.get('contentConsentGranted', false),
      grantedAt: this._store.get('contentConsentGrantedAt', null),
      version: this._store.get('contentConsentVersion', null)
    };
  }
  
  async requestConsent() {
    if (this.isConsentGranted()) return true;
    
    return new Promise((resolve) => {
      this._showConsentDialog((accepted) => {
        if (accepted) {
          this._store.set('contentConsentGranted', true);
          this._store.set('contentConsentGrantedAt', Date.now());
          this._store.set('contentConsentVersion', '1.0');
          
          // 通知渲染进程：授权已通过，激活 Pillar C UI
          if (this._mainWindow && !this._mainWindow.isDestroyed()) {
            this._mainWindow.webContents.send('consent-status-changed', { granted: true });
          }
          
          // 通知主进程内部：联动 recorder 启停
          try {
            if (typeof this.onConsentChanged === 'function') {
              this.onConsentChanged(true);
            }
          } catch (err) {
            console.error('[PrivacyConsent] onConsentChanged callback error:', err);
          }
        }
        resolve(accepted);
      });
    });
  }
  
  revokeConsent() {
    this._store.set('contentConsentGranted', false);
    this._store.set('contentConsentRevokedAt', Date.now());
    
    // 立即停止记录（主进程内部联动）
    if (typeof this.onConsentChanged === 'function') {
      this.onConsentChanged(false);
    }
    
    // 通知渲染进程更新 UI
    if (this._mainWindow && !this._mainWindow.isDestroyed()) {
      this._mainWindow.webContents.send('consent-status-changed', { granted: false });
    }
    
    // 注意：不删除已有的本地文件，只是停止记录
    return true;
  }
  
  _showConsentDialog(callback) {
    let callbackFired = false;
    const settle = (accepted) => {
      if (callbackFired) return;
      callbackFired = true;
      callback(accepted);
    };

    this._consentWindow = new BrowserWindow({
      width: 500,
      height: 480,
      parent: this._mainWindow,
      modal: true,
      frame: false,
      transparent: true,
      resizable: false,
      webPreferences: {
        preload: path.join(__dirname, 'consent-preload.js'),
        contextIsolation: true,
        nodeIntegration: false
      }
    });
    
    this._consentWindow.loadFile(path.join(__dirname, 'consent-dialog.html'));
    
    const cleanup = () => {
      ipcMain.removeListener('consent-accept', onAccept);
      ipcMain.removeListener('consent-decline', onDecline);
    };

    // 先 settle 再 destroy — 因为 destroy() 会同步触发 closed 事件，
    // 如果先 destroy 再 settle，closed handler 中的 settle(false)
    // 会抢先执行，导致 accept 永远变成 decline。
    const closeAndSettle = (accepted) => {
      cleanup();
      settle(accepted);
      if (this._consentWindow && !this._consentWindow.isDestroyed()) {
        this._consentWindow.destroy();
      }
      this._consentWindow = null;
    };

    // 接收用户选择
    const onAccept = () => {
      closeAndSettle(true);
    };
    
    const onDecline = () => {
      closeAndSettle(false);
    };
    
    ipcMain.once('consent-accept', onAccept);
    ipcMain.once('consent-decline', onDecline);
    
    this._consentWindow.on('closed', () => {
      cleanup();
      this._consentWindow = null;
      // 窗口被关闭（不通过按钮）= 拒绝
      settle(false);
    });
  }
}

module.exports = { PrivacyConsentManager };