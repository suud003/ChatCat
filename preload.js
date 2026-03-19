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
  onGlobalKeydown: (callback) => {
    const listener = (_, data) => callback(data);
    ipcRenderer.on('global-keydown', listener);
    return () => ipcRenderer.removeListener('global-keydown', listener);
  },
  onGlobalKeyup: (callback) => ipcRenderer.on('global-keyup', (_, data) => callback(data)),
  onGlobalClick: (callback) => {
    const listener = (_, data) => callback(data);
    ipcRenderer.on('global-click', listener);
    return () => ipcRenderer.removeListener('global-click', listener);
  },
  onGlobalMousemove: (callback) => {
    const listener = (_, data) => callback(data);
    ipcRenderer.on('global-mousemove', listener);
    return () => ipcRenderer.removeListener('global-mousemove', listener);
  },
  onToggleChat: (callback) => ipcRenderer.on('toggle-chat', () => callback()),
  onOpenSettings: (callback) => ipcRenderer.on('open-settings', () => callback()),
  onBeforeQuit: (callback) => ipcRenderer.on('app-before-quit', () => callback()),
  onDisplayChanged: (callback) => ipcRenderer.on('display-changed', (_, data) => callback(data)),
  onResetPetPosition: (callback) => ipcRenderer.on('reset-pet-position', () => callback()),

  // Recorder
  // V2: recorderToggle 已废弃，仅返回状态。录制启停由隐私授权 (consent-request/consent-revoke) 控制
  recorderToggle: () => ipcRenderer.invoke('recorder-toggle'),
  recorderSetDir: () => ipcRenderer.invoke('recorder-set-dir'),
  recorderGetStatus: () => ipcRenderer.invoke('recorder-get-status'),
  recorderGetTodayContent: () => ipcRenderer.invoke('recorder-get-today-content'),
  onRecorderUpdate: (callback) => ipcRenderer.on('recorder-update', (_, data) => callback(data)),
  onRecorderStateChanged: (callback) => ipcRenderer.on('recorder-state-changed', (_, data) => callback(data)),

  // Clipboard
  clipboardGetHistory: () => ipcRenderer.invoke('clipboard-get-history'),
  clipboardCopy: (text) => ipcRenderer.invoke('clipboard-copy', text),
  clipboardClear: () => ipcRenderer.invoke('clipboard-clear'),
  onClipboardUpdate: (callback) => {
    const listener = (_, data) => callback(data);
    ipcRenderer.on('clipboard-update', listener);
    return () => ipcRenderer.removeListener('clipboard-update', listener);
  },

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
  mpGetCredentials: () => ipcRenderer.invoke('mp-get-credentials'),

  // V2 Pillar B
  onClipboardImageDetected: (cb) => ipcRenderer.on('clipboard-image-detected', (_, data) => cb(data)),
  recognizeClipboardImage: () => ipcRenderer.invoke('qp-recognize-clipboard-image'),
  qpProcessText: (mode, text) => ipcRenderer.invoke('qp-process-text', mode, text),
  qpShowResult: (data) => ipcRenderer.send('qp-show-result', data),
  qpToggle: () => ipcRenderer.send('qp-toggle'),
  qpShow: () => ipcRenderer.invoke('qp-show'),
  qpHide: () => ipcRenderer.invoke('qp-hide'),
  qpIsVisible: () => ipcRenderer.invoke('qp-is-visible'),
  qpGetShortcutStatus: () => ipcRenderer.invoke('qp-get-shortcut-status'),
  onQpShortcutStatus: (cb) => ipcRenderer.on('qp-shortcut-status', (_, data) => cb(data)),

  // V2 Pillar C
  consentCheck: () => ipcRenderer.invoke('consent-check'),
  consentRequest: () => ipcRenderer.invoke('consent-request'),
  consentRevoke: () => ipcRenderer.invoke('consent-revoke'),
  onConsentStatusChanged: (cb) => ipcRenderer.on('consent-status-changed', (_, data) => cb(data))
});
