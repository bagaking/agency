// @ts-nocheck
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('agencyCapture', {
  getDisplaySource: (payload) => ipcRenderer.invoke('capture:getSource', payload),
  completeCapture: (payload) => ipcRenderer.invoke('capture:complete', payload),
  cancelCapture: (payload) => ipcRenderer.invoke('capture:cancel', payload),
  setIncludeAgencyWindows: (payload) => ipcRenderer.invoke('capture:setIncludeAgency', payload),
});
