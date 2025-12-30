const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('agency', {
  listCells: () => ipcRenderer.invoke('cells:list'),
  listWorktrees: () => ipcRenderer.invoke('worktrees:list'),
  listSessions: (payload) => ipcRenderer.invoke('sessions:list', payload),
  createSession: (payload) => ipcRenderer.invoke('sessions:create', payload),
  closeSession: (payload) => ipcRenderer.invoke('sessions:close', payload),
  detachSession: (payload) => ipcRenderer.invoke('sessions:detach', payload),
  renameSession: (payload) => ipcRenderer.invoke('sessions:rename', payload),
  getUiState: () => ipcRenderer.invoke('ui-state:get'),
  setUiState: (payload) => ipcRenderer.invoke('ui-state:set', payload),
  getQuickActions: (payload) => ipcRenderer.invoke('quick-actions:get', payload),
  setQuickActions: (payload) => ipcRenderer.invoke('quick-actions:set', payload),
  getGates: (payload) => ipcRenderer.invoke('gates:get', payload),
  setGates: (payload) => ipcRenderer.invoke('gates:set', payload),
  checkGates: (payload) => ipcRenderer.invoke('gates:check', payload),
  getWorktreeLinks: (payload) => ipcRenderer.invoke('worktree-links:get', payload),
  setWorktreeLinks: (payload) => ipcRenderer.invoke('worktree-links:set', payload),
  applyWorktreeLink: (payload) => ipcRenderer.invoke('worktree-links:apply', payload),
  applyAllWorktreeLinks: (payload) => ipcRenderer.invoke('worktree-links:applyAll', payload),
  getTmuxStatus: () => ipcRenderer.invoke('tmux:status'),
  getExplorerRoot: () => ipcRenderer.invoke('explorer:root'),
  listExplorerEntries: (payload) => ipcRenderer.invoke('explorer:list', payload),
  getExplorerStatus: () => ipcRenderer.invoke('explorer:status'),
  searchExplorerFiles: (payload) => ipcRenderer.invoke('explorer:search', payload),
  readExplorerEntry: (payload) => ipcRenderer.invoke('explorer:read', payload),
  readWorkbenchEntry: (payload) => ipcRenderer.invoke('workbench:read', payload),
  writeWorkbenchEntry: (payload) => ipcRenderer.invoke('workbench:write', payload),
  statWorkbenchEntry: (payload) => ipcRenderer.invoke('workbench:stat', payload),
  diffWorkbenchEntry: (payload) => ipcRenderer.invoke('workbench:diff', payload),
  blameWorkbenchEntry: (payload) => ipcRenderer.invoke('workbench:blame', payload),
  getWorkbenchFileUrl: (payload) => ipcRenderer.invoke('workbench:fileUrl', payload),
  createExplorerEntry: (payload) => ipcRenderer.invoke('explorer:create', payload),
  renameExplorerEntry: (payload) => ipcRenderer.invoke('explorer:rename', payload),
  deleteExplorerEntry: (payload) => ipcRenderer.invoke('explorer:delete', payload),
  copyExplorerEntry: (payload) => ipcRenderer.invoke('explorer:copy', payload),
  revealExplorerEntry: (payload) => ipcRenderer.invoke('explorer:reveal', payload),
  createCell: (payload) => ipcRenderer.invoke('cells:create', payload),
  updateCellState: (payload) => ipcRenderer.invoke('cells:updateState', payload),
  logRuntime: (payload) => ipcRenderer.send('runtime-log:write', payload),
  startTerminal: (payload) => ipcRenderer.invoke('terminal:start', payload),
  writeTerminal: (payload) => ipcRenderer.send('terminal:write', payload),
  resizeTerminal: (payload) => ipcRenderer.send('terminal:resize', payload),
  disposeTerminal: (payload) => ipcRenderer.send('terminal:dispose', payload),
  onTerminalData: (handler) => {
    const wrapped = (_event, payload) => handler(payload);
    ipcRenderer.on('terminal:data', wrapped);
    return () => ipcRenderer.removeListener('terminal:data', wrapped);
  },
  onTerminalError: (handler) => {
    const wrapped = (_event, payload) => handler(payload);
    ipcRenderer.on('terminal:error', wrapped);
    return () => ipcRenderer.removeListener('terminal:error', wrapped);
  },
  onCellsUpdated: (handler) => {
    const wrapped = (_event, payload) => handler(payload);
    ipcRenderer.on('cells:updated', wrapped);
    return () => ipcRenderer.removeListener('cells:updated', wrapped);
  },
});
