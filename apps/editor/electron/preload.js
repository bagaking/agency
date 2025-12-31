const { contextBridge, ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const MAX_TEXT_BYTES = Number(process.env.AGENCY_WORKBENCH_MAX_BYTES || 1024 * 1024);
const BINARY_CHECK_BYTES = 8000;
const WORKBENCH_TIMEOUT_MS = Number(process.env.AGENCY_WORKBENCH_TIMEOUT_MS || 8000);

function normalizeRelPath(value) {
  if (!value) {
    return '';
  }
  return value.replace(/\\/g, '/').replace(/^\.?\//, '').replace(/\/+$/, '');
}

function resolveSafePath(rootPath, targetPath) {
  const base = rootPath ? path.resolve(rootPath) : process.cwd();
  const normalized = normalizeRelPath(targetPath);
  const absolute = path.resolve(base, normalized);
  const rel = path.relative(base, absolute);
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new Error('Path escapes repository root.');
  }
  return absolute;
}

async function readLocalTextFile({ rootPath, targetPath }) {
  if (!targetPath) {
    throw new Error('targetPath is required.');
  }
  const absolute = resolveSafePath(rootPath, targetPath);
  const stats = await fs.promises.stat(absolute);
  if (!stats.isFile()) {
    throw new Error('Target is not a file.');
  }
  const size = stats.size || 0;
  const length = Math.min(size, MAX_TEXT_BYTES);
  const handle = await fs.promises.open(absolute, 'r');
  const buffer = Buffer.alloc(length);
  try {
    await handle.read(buffer, 0, length, 0);
  } finally {
    await handle.close();
  }
  const binary = buffer.slice(0, Math.min(length, BINARY_CHECK_BYTES)).includes(0);
  return {
    path: normalizeRelPath(targetPath),
    size,
    mtimeMs: stats.mtimeMs || 0,
    truncated: size > MAX_TEXT_BYTES,
    binary,
    content: binary ? '' : buffer.toString('utf-8'),
  };
}

async function statLocalEntry({ rootPath, targetPath }) {
  if (!targetPath) {
    throw new Error('targetPath is required.');
  }
  const absolute = resolveSafePath(rootPath, targetPath);
  const stats = await fs.promises.stat(absolute);
  return {
    path: normalizeRelPath(targetPath),
    absolutePath: absolute,
    size: stats.size || 0,
    mtimeMs: stats.mtimeMs || 0,
    isFile: stats.isFile(),
    isDirectory: stats.isDirectory(),
  };
}

async function resolveLocalFileUrl({ rootPath, targetPath }) {
  const entry = await statLocalEntry({ rootPath, targetPath });
  return {
    path: entry.path,
    url: pathToFileURL(entry.absolutePath).toString(),
  };
}

function invokeWithTimeout(channel, payload, timeoutMs = WORKBENCH_TIMEOUT_MS) {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    return ipcRenderer.invoke(channel, payload);
  }
  let timeoutHandle;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error(`IPC timeout for ${channel}`));
    }, timeoutMs);
  });
  return Promise.race([ipcRenderer.invoke(channel, payload), timeoutPromise]).finally(() => {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  });
}

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
  readWorkbenchEntry: async (payload) => {
    try {
      return await invokeWithTimeout('workbench:read', payload);
    } catch (error) {
      return readLocalTextFile(payload || {});
    }
  },
  writeWorkbenchEntry: (payload) => ipcRenderer.invoke('workbench:write', payload),
  statWorkbenchEntry: async (payload) => {
    try {
      return await invokeWithTimeout('workbench:stat', payload);
    } catch (error) {
      return statLocalEntry(payload || {});
    }
  },
  diffWorkbenchEntry: (payload) => ipcRenderer.invoke('workbench:diff', payload),
  blameWorkbenchEntry: (payload) => ipcRenderer.invoke('workbench:blame', payload),
  getWorkbenchFileUrl: async (payload) => {
    try {
      return await invokeWithTimeout('workbench:fileUrl', payload);
    } catch (error) {
      return resolveLocalFileUrl(payload || {});
    }
  },
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
