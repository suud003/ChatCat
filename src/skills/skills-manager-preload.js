const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Skill import
  importSkillFile: (filePath) => ipcRenderer.invoke('skill-import-file', filePath),
  importSkillContent: (name, content) => ipcRenderer.invoke('skill-import-content', name, content),
  getImportedSkills: () => ipcRenderer.invoke('skill-get-imported'),
  removeImportedSkill: (name) => ipcRenderer.invoke('skill-remove-imported', name),

  // MCP import
  importMcpConfig: (configPath) => ipcRenderer.invoke('mcp-import-config', configPath),
  importMcpJson: (jsonContent) => ipcRenderer.invoke('mcp-import-json', jsonContent),
  getImportedMcp: () => ipcRenderer.invoke('mcp-get-imported'),
  removeMcp: (name) => ipcRenderer.invoke('mcp-remove', name),

  // File dialog
  dialogOpenFile: (options) => ipcRenderer.invoke('dialog-open-file', options),

  // Skill metadata
  skillGetAllMeta: () => ipcRenderer.invoke('skill-get-all-meta'),

  // Skills changed event
  onSkillsChanged: (cb) => ipcRenderer.on('skills-changed', () => cb()),

  // Window control
  closeWindow: () => ipcRenderer.send('skills-manager-close'),
});
