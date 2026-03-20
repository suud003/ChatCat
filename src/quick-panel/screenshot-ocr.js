const { BrowserWindow, desktopCapturer, screen, nativeImage, ipcMain } = require('electron');
const path = require('path');
const { AITrigger, TRIGGER_TYPES } = require('../ai-runtime/trigger');

class ScreenshotOCR {
  /**
   * @param {import('electron-store')} store
   * @param {import('../shared/ai-client-main').AIClientMain} aiClient
   * @param {import('../ai-runtime/runtime').AIRuntime} aiRuntime
   */
  constructor(store, aiClient, aiRuntime) {
    this._store = store;
    this._aiClient = aiClient;
    this._aiRuntime = aiRuntime;
    this._overlayWindow = null;
  }

  async captureScreen() {
    return new Promise(async (resolve, reject) => {
      try {
        const primaryDisplay = screen.getPrimaryDisplay();
        const { width, height } = primaryDisplay.size;
        const scaleFactor = primaryDisplay.scaleFactor;
        
        const sources = await desktopCapturer.getSources({
          types: ['screen'],
          thumbnailSize: { 
            width: width * scaleFactor, 
            height: height * scaleFactor 
          }
        });
        
        if (!sources || sources.length === 0) {
          reject(new Error('无法获取屏幕截图'));
          return;
        }
        
        // 优先匹配主显示器：通过 display_id 或 name 匹配
        const primaryId = String(primaryDisplay.id);
        let matchedSource = sources.find(s => s.display_id === primaryId);
        
        // 如果 display_id 匹配不到，尝试通过 name 包含 display id 匹配
        if (!matchedSource) {
          matchedSource = sources.find(s => s.id && s.id.includes(primaryId));
        }
        
        // 兜底：如果只有一个 source 或都匹配不到，取第一个
        if (!matchedSource) {
          console.warn('[ScreenshotOCR] ⚠️ 无法精确匹配主显示器，使用第一个 source');
          matchedSource = sources[0];
        } else {
          console.log(`[ScreenshotOCR] ✅ 匹配到主显示器: display_id=${primaryId}`);
        }
        
        const fullScreenImage = matchedSource.thumbnail;
        
        this._createOverlay(fullScreenImage, scaleFactor, (region) => {
          if (!region) {
            resolve(null);
            return;
          }
          
          const cropped = fullScreenImage.crop({
            x: Math.round(region.x * scaleFactor),
            y: Math.round(region.y * scaleFactor),
            width: Math.round(region.width * scaleFactor),
            height: Math.round(region.height * scaleFactor)
          });
          
          const base64 = cropped.toDataURL().replace(/^data:image\/png;base64,/, '');
          resolve(base64);
        });
        
      } catch (err) {
        reject(err);
      }
    });
  }
  
  _createOverlay(screenshotImage, scaleFactor, callback) {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.size;
    
    this._overlayWindow = new BrowserWindow({
      x: primaryDisplay.bounds.x,
      y: primaryDisplay.bounds.y,
      width,
      height,
      fullscreen: true,
      frame: false,
      transparent: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      webPreferences: {
        contextIsolation: true,
        preload: path.join(__dirname, 'screenshot-preload.js')
      }
    });
    
    this._overlayWindow.loadFile(path.join(__dirname, 'screenshot-overlay.html'));
    
    this._overlayWindow.webContents.on('did-finish-load', () => {
      const dataUrl = screenshotImage.toDataURL();
      this._overlayWindow.webContents.send('set-screenshot', dataUrl);
    });
    
    const onRegionSelected = (event, region) => {
      this._destroyOverlay();
      callback(region);
    };
    
    const onCancel = () => {
      this._destroyOverlay();
      callback(null);
    };
    
    // Use once to avoid listener leaks
    ipcMain.once('screenshot-region', onRegionSelected);
    ipcMain.once('screenshot-cancel', onCancel);
  }
  
  _destroyOverlay() {
    // Remove listeners if window is destroyed before they trigger
    ipcMain.removeAllListeners('screenshot-region');
    ipcMain.removeAllListeners('screenshot-cancel');
    
    if (this._overlayWindow && !this._overlayWindow.isDestroyed()) {
      this._overlayWindow.destroy();
    }
    this._overlayWindow = null;
  }
  
  async processImage(base64, config) {
    const trigger = AITrigger.create(TRIGGER_TYPES.VISION, 'vision.ocr', { base64, config });
    return this._aiRuntime.vision(trigger);
  }
}

module.exports = { ScreenshotOCR };
