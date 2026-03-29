const { BrowserWindow, ipcMain } = require('electron');
const path = require('path');

class SkillsManager {
  constructor(mainWindow) {
    this._mainWindow = mainWindow;
    this._win = null;
  }

  show() {
    if (this._win && !this._win.isDestroyed()) {
      this._win.show();
      this._win.focus();
      return;
    }
    this._createWindow();
  }

  hide() {
    if (this._win && !this._win.isDestroyed()) {
      this._win.hide();
    }
  }

  _createWindow() {
    this._win = new BrowserWindow({
      width: 650,
      height: 520,
      frame: false,
      transparent: false,
      resizable: false,
      center: true,
      show: false,
      webPreferences: {
        preload: path.join(__dirname, 'skills-manager-preload.js'),
        contextIsolation: true,
        nodeIntegration: false
      }
    });

    this._win.loadFile(path.join(__dirname, 'skills-manager.html'));

    this._win.once('ready-to-show', () => {
      this._win.show();
    });

    // Hide instead of destroy on close
    this._win.on('close', (e) => {
      if (!this._win.isDestroyed()) {
        e.preventDefault();
        this._win.hide();
      }
    });

    this._win.on('closed', () => {
      this._win = null;
    });

    if (process.argv.includes('--dev')) {
      this._win.webContents.openDevTools({ mode: 'detach' });
    }
  }

  destroy() {
    if (this._win && !this._win.isDestroyed()) {
      this._win.removeAllListeners('close');
      this._win.close();
      this._win = null;
    }
  }
}

module.exports = { SkillsManager };
