const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('agency', {
  listCells: () => ipcRenderer.invoke('cells:list'),
  createCell: (payload) => ipcRenderer.invoke('cells:create', payload),
  updateCellState: (payload) => ipcRenderer.invoke('cells:updateState', payload),
  startTerminal: (payload) => ipcRenderer.invoke('terminal:start', payload),
  writeTerminal: (payload) => ipcRenderer.send('terminal:write', payload),
  resizeTerminal: (payload) => ipcRenderer.send('terminal:resize', payload),
  onTerminalData: (handler) => ipcRenderer.on('terminal:data', handler),
  onCellsUpdated: (handler) => ipcRenderer.on('cells:updated', handler),
});
