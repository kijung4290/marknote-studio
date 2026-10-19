'use strict';
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('marknoteDesktop', {
  isDesktop: true,
  invoke: (action, payload = {}) => ipcRenderer.invoke('marknote:ipc', { action, payload }),
  onMenuShortcut: (callback) => {
    ipcRenderer.on('marknote:shortcut', (_event, cmd) => callback(cmd));
  },
  onUpdateStatus: (callback) => {
    ipcRenderer.on('marknote:update-status', (_event, data) => callback(data));
  }
});
