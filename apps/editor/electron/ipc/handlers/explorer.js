const { ipcMain } = require('electron');
const path = require('path');
const { getRepoRoot } = require('../../services/git');
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
    const repoRoot = rootPath ? await getRepoRoot(rootPath) : await getRepoRoot();
    const resolvedRoot = rootPath || repoRoot;
    return {
      repoRoot,
      rootPath: resolvedRoot,
      name: path.basename(resolvedRoot) || resolvedRoot,
    };
  });

  ipcMain.handle('explorer:list', async (_event, payload) => {
    const rootPath = payload?.rootPath;
    const relativePath = payload?.path || '';
    const showHidden = payload?.showHidden !== false;
    return listDirectory({ rootPath, relativePath, showHidden });
  });

  ipcMain.handle('explorer:status', async () => {
    return getExplorerStatus();
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
}

module.exports = {
  setupExplorerHandlers,
};
