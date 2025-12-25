const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('agency', {
  listCells: () => ipcRenderer.invoke('cells:list'),
  listWorktrees: () => ipcRenderer.invoke('worktrees:list'),
  createCell: (payload) => ipcRenderer.invoke('cells:create', payload),
  updateCellState: (payload) => ipcRenderer.invoke('cells:updateState', payload),
  startTerminal: (payload) => ipcRenderer.invoke('terminal:start', payload),
  writeTerminal: (payload) => ipcRenderer.send('terminal:write', payload),
  resizeTerminal: (payload) => ipcRenderer.send('terminal:resize', payload),
  onTerminalData: (handler) => {
    const wrapped = (_event, payload) => handler(payload);
    ipcRenderer.on('terminal:data', wrapped);
    return () => ipcRenderer.removeListener('terminal:data', wrapped);
  },
  onCellsUpdated: (handler) => {
    const wrapped = (_event, payload) => handler(payload);
    ipcRenderer.on('cells:updated', wrapped);
    return () => ipcRenderer.removeListener('cells:updated', wrapped);
  },
});
