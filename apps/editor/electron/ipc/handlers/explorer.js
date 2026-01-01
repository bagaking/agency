const { ipcMain, BrowserWindow } = require('electron');
const path = require('path');
const { getRepoRoot } = require('../../services/git');
const { resolveProjectRoot } = require('../../services/projectRoot');
const { startExplorerWatch, stopExplorerWatch } = require('../../services/explorerWatch');
const {
  listDirectory,
  getExplorerStatus,
  searchFiles,
  createEntry,
  renameEntry,
  deleteEntry,
  copyEntry,
  revealEntry,
  readEntry,
} = require('../../services/explorer');

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
    const limit = payload?.limit || 1000;
    return searchFiles({ rootPath, query, limit });
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

  ipcMain.handle('explorer:watch', async (_event, payload) => {
    const rootPath = payload?.rootPath || '';
    if (!rootPath) {
      stopExplorerWatch();
      return { watching: false };
    }
    const result = startExplorerWatch(rootPath, (change) => {
      BrowserWindow.getAllWindows().forEach((win) => {
        if (!win.isDestroyed()) {
          win.webContents.send('explorer:changed', change);
        }
      });
    });
    return result;
  });
}

module.exports = {
  setupExplorerHandlers,
};
