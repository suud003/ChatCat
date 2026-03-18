const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('screenshotAPI', {
  onSetScreenshot: (cb) => ipcRenderer.on('set-screenshot', (_, dataUrl) => cb(dataUrl)),
  sendRegion: (region) => ipcRenderer.send('screenshot-region', region),
  sendCancel: () => ipcRenderer.send('screenshot-cancel')
});