const { ipcMain, BrowserWindow } = require('electron');
const path = require('path');
const { getRepoRoot } = require('../../services/git');
const { resolveProjectRoot } = require('../../services/projectRoot');
const { startExplorerWatch, stopExplorerWatch } = require('../../services/explorerWatch');
const {
  listDirectory,
  getExplorerStatus,
  searchFiles,
  searchContent,
  replaceContent,
  createEntry,
  renameEntry,
  deleteEntry,
  copyEntry,
  importEntries,
  revealEntry,
  readEntry,
} = require('../../services/explorer');
const { readExplorerProjectPolicy } = require('../../services/explorerPolicy');

const explorerWatchSubscriptions = new Map();
const explorerWatchCleanupRegistered = new Set();

function hasExplorerWatchSubscribers(rootPath) {
  for (const subscribedRoot of explorerWatchSubscriptions.values()) {
    if (subscribedRoot === rootPath) {
      return true;
    }
  }
  return false;
}

function releaseExplorerWatchSubscription(webContentsId) {
  const previousRoot = explorerWatchSubscriptions.get(webContentsId) || '';
  if (!previousRoot) {
    return;
  }
  explorerWatchSubscriptions.delete(webContentsId);
  if (!hasExplorerWatchSubscribers(previousRoot)) {
    stopExplorerWatch(previousRoot);
  }
}

function registerExplorerWatchCleanup(sender) {
  const webContentsId = sender?.id;
  if (!webContentsId || explorerWatchCleanupRegistered.has(webContentsId)) {
    return;
  }
  explorerWatchCleanupRegistered.add(webContentsId);
  sender.once('destroyed', () => {
    explorerWatchCleanupRegistered.delete(webContentsId);
    releaseExplorerWatchSubscription(webContentsId);
  });
}

function broadcastExplorerChange(change) {
  BrowserWindow.getAllWindows().forEach((win) => {
    if (win.isDestroyed()) {
      return;
    }
    if (explorerWatchSubscriptions.get(win.webContents.id) !== change.rootPath) {
      return;
    }
    win.webContents.send('explorer:changed', change);
  });
}

function setupExplorerHandlers() {
  ipcMain.handle('explorer:root', async (_event, payload) => {
    const rootPath = payload?.rootPath;
    const repoRoot = rootPath
      ? await getRepoRoot(rootPath)
      : await resolveProjectRoot();
    const resolvedRoot = repoRoot ? rootPath || repoRoot : '';
    return {
      repoRoot: repoRoot || '',
      rootPath: resolvedRoot,
      name: resolvedRoot ? path.basename(resolvedRoot) || resolvedRoot : '',
    };
  });

  ipcMain.handle('explorer:list', async (_event, payload) => {
    const rootPath = payload?.rootPath;
    const relativePath = payload?.path || '';
    const showHidden = payload?.showHidden !== false;
    return listDirectory({ rootPath, relativePath, showHidden });
  });

  ipcMain.handle('explorer:status', async (_event, payload) => {
    return getExplorerStatus({ rootPath: payload?.rootPath });
  });

  ipcMain.handle('explorer:search', async (_event, payload) => {
    const rootPath = payload?.rootPath;
    const query = payload?.query || '';
    const includeAll = Boolean(payload?.includeAll);
    const limit = payload?.limit || 1000;
    return searchFiles({ rootPath, query, includeAll, limit });
  });

  ipcMain.handle('explorer:contentSearch', async (_event, payload) => {
    const rootPath = payload?.rootPath;
    return searchContent({
      rootPath,
      query: payload?.query || '',
      scope: payload?.scope || undefined,
      caseSensitive: Boolean(payload?.caseSensitive),
      wholeWord: Boolean(payload?.wholeWord),
      useRegex: Boolean(payload?.useRegex),
      limit: payload?.limit || 200,
    });
  });

  ipcMain.handle('explorer:contentReplace', async (_event, payload) => {
    const rootPath = payload?.rootPath;
    return replaceContent({
      rootPath,
      query: payload?.query || '',
      replacement: payload?.replacement || '',
      scope: payload?.scope || undefined,
      caseSensitive: Boolean(payload?.caseSensitive),
      wholeWord: Boolean(payload?.wholeWord),
      useRegex: Boolean(payload?.useRegex),
      confirmedPaths: Array.isArray(payload?.confirmedPaths) ? payload.confirmedPaths : [],
    });
  });

  ipcMain.handle('explorer:policy', async (_event, payload) => {
    return readExplorerProjectPolicy({ rootPath: payload?.rootPath });
  });

  ipcMain.handle('explorer:create', async (_event, payload) => {
    const rootPath = payload?.rootPath;
    const type = payload?.type || 'file';
    const parentPath = payload?.parentPath || '';
    const name = payload?.name || '';
    return createEntry({ rootPath, type, parentPath, name });
  });

  ipcMain.handle('explorer:rename', async (_event, payload) => {
    const rootPath = payload?.rootPath;
    const sourcePath = payload?.sourcePath;
    const targetPath = payload?.targetPath;
    if (!sourcePath || !targetPath) {
      throw new Error('sourcePath and targetPath are required.');
    }
    return renameEntry({ rootPath, sourcePath, targetPath });
  });

  ipcMain.handle('explorer:delete', async (_event, payload) => {
    const rootPath = payload?.rootPath;
    const targetPath = payload?.targetPath;
    if (!targetPath) {
      throw new Error('targetPath is required.');
    }
    return deleteEntry({ rootPath, targetPath });
  });

  ipcMain.handle('explorer:copy', async (_event, payload) => {
    const rootPath = payload?.rootPath;
    const sourcePath = payload?.sourcePath;
    const targetPath = payload?.targetPath;
    if (!sourcePath || !targetPath) {
      throw new Error('sourcePath and targetPath are required.');
    }
    return copyEntry({ rootPath, sourcePath, targetPath });
  });

  ipcMain.handle('explorer:import', async (_event, payload) => {
    const rootPath = payload?.rootPath;
    const targetDir = typeof payload?.targetDir === 'string' ? payload.targetDir : '';
    const sourcePaths = Array.isArray(payload?.sourcePaths)
      ? payload.sourcePaths.filter((item) => typeof item === 'string' && item.trim())
      : [];
    if (!sourcePaths.length) {
      throw new Error('sourcePaths must contain at least one path.');
    }
    return importEntries({ rootPath, targetDir, sourcePaths });
  });

  ipcMain.handle('explorer:reveal', async (_event, payload) => {
    const rootPath = payload?.rootPath;
    const targetPath = payload?.targetPath;
    if (!targetPath) {
      throw new Error('targetPath is required.');
    }
    return revealEntry({ rootPath, targetPath });
  });

  ipcMain.handle('explorer:read', async (_event, payload) => {
    const rootPath = payload?.rootPath;
    const targetPath = payload?.targetPath;
    return readEntry({ rootPath, targetPath });
  });

  ipcMain.handle('explorer:watch', async (event, payload) => {
    const rootPath = payload?.rootPath || '';
    const sender = event?.sender;
    const webContentsId = sender?.id;
    const previousRoot = webContentsId ? explorerWatchSubscriptions.get(webContentsId) || '' : '';
    if (!rootPath) {
      if (webContentsId) {
        releaseExplorerWatchSubscription(webContentsId);
      } else {
        stopExplorerWatch();
      }
      return { watching: false };
    }
    const result = startExplorerWatch(rootPath, broadcastExplorerChange);
    if (webContentsId) {
      explorerWatchSubscriptions.set(webContentsId, rootPath);
      registerExplorerWatchCleanup(sender);
      if (previousRoot && previousRoot !== rootPath && !hasExplorerWatchSubscribers(previousRoot)) {
        stopExplorerWatch(previousRoot);
      }
    }
    return result;
  });
}

export { setupExplorerHandlers };
