const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Store
  getStore: (key) => ipcRenderer.invoke('get-store', key),
  setStore: (key, value) => ipcRenderer.invoke('set-store', key, value),

  // System info
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),

  // Window control
  dragWindow: (dx, dy) => ipcRenderer.send('window-drag', { dx, dy }),
  setIgnoreMouse: (ignore) => ipcRenderer.send('set-ignore-mouse', ignore),

  // Events from main process
  onGlobalKeydown: (callback) => ipcRenderer.on('global-keydown', (_, data) => callback(data)),
  onGlobalKeyup: (callback) => ipcRenderer.on('global-keyup', (_, data) => callback(data)),
  onGlobalClick: (callback) => ipcRenderer.on('global-click', (_, data) => callback(data)),
  onGlobalMousemove: (callback) => ipcRenderer.on('global-mousemove', (_, data) => callback(data)),
  onToggleChat: (callback) => ipcRenderer.on('toggle-chat', () => callback()),
  onOpenSettings: (callback) => ipcRenderer.on('open-settings', () => callback())
});
