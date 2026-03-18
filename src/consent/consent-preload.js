const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('consentAPI', {
  accept: () => ipcRenderer.send('consent-accept'),
  decline: () => ipcRenderer.send('consent-decline'),
});