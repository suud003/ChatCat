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
  moveToDisplay: (screenX, screenY) => ipcRenderer.send('move-to-display', { screenX, screenY }),

  // Events from main process
  onGlobalKeydown: (callback) => ipcRenderer.on('global-keydown', (_, data) => callback(data)),
  onGlobalKeyup: (callback) => ipcRenderer.on('global-keyup', (_, data) => callback(data)),
  onGlobalClick: (callback) => ipcRenderer.on('global-click', (_, data) => callback(data)),
  onGlobalMousemove: (callback) => ipcRenderer.on('global-mousemove', (_, data) => callback(data)),
  onToggleChat: (callback) => ipcRenderer.on('toggle-chat', () => callback()),
  onOpenSettings: (callback) => ipcRenderer.on('open-settings', () => callback()),
  onBeforeQuit: (callback) => ipcRenderer.on('app-before-quit', () => callback()),
  onDisplayChanged: (callback) => ipcRenderer.on('display-changed', (_, data) => callback(data)),
  onResetPetPosition: (callback) => ipcRenderer.on('reset-pet-position', () => callback()),

  // Recorder
  recorderToggle: () => ipcRenderer.invoke('recorder-toggle'),
  recorderSetDir: () => ipcRenderer.invoke('recorder-set-dir'),
  recorderGetStatus: () => ipcRenderer.invoke('recorder-get-status'),
  recorderGetTodayContent: () => ipcRenderer.invoke('recorder-get-today-content'),
  onRecorderUpdate: (callback) => ipcRenderer.on('recorder-update', (_, data) => callback(data)),

  // Clipboard
  clipboardGetHistory: () => ipcRenderer.invoke('clipboard-get-history'),
  clipboardCopy: (text) => ipcRenderer.invoke('clipboard-copy', text),
  clipboardClear: () => ipcRenderer.invoke('clipboard-clear'),
  onClipboardUpdate: (callback) => ipcRenderer.on('clipboard-update', (_, data) => callback(data)),

  // Skills
  skillTrigger: (skillId) => ipcRenderer.invoke('skill-trigger', skillId),
  skillGetStatus: () => ipcRenderer.invoke('skill-get-status'),
  skillGetConvertedText: (date) => ipcRenderer.invoke('skill-get-converted-text', date),
  skillGetDailyReport: (date) => ipcRenderer.invoke('skill-get-daily-report', date),
  onSkillComplete: (callback) => ipcRenderer.on('skill-complete', (_, data) => callback(data)),
  onTodosUpdated: (callback) => ipcRenderer.on('todos-updated', () => callback()),

  // Skill Agent (SKILL.md-based system)
  skillExecute: (skillId, context) => ipcRenderer.invoke('skill-execute', skillId, context),
  skillGetAllMeta: () => ipcRenderer.invoke('skill-get-all-meta'),
  dailyReportSetDir: () => ipcRenderer.invoke('daily-report-set-dir'),
  openFilePath: (filePath) => ipcRenderer.invoke('open-file-path', filePath),
  saveFile: (filePath, content) => ipcRenderer.invoke('save-file', filePath, content),

  // Multiplayer
  mpStartServer: (port) => ipcRenderer.invoke('mp-start-server', port),
  mpStopServer: () => ipcRenderer.invoke('mp-stop-server'),
  mpGetServerStatus: () => ipcRenderer.invoke('mp-get-server-status'),
  mpSaveCredentials: (creds) => ipcRenderer.invoke('mp-save-credentials', creds),
  mpGetCredentials: () => ipcRenderer.invoke('mp-get-credentials')
});
