const { ipcMain } = require('electron');
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
} = require('../../services/explorer');

function setupExplorerHandlers() {
  ipcMain.handle('explorer:root', async () => {
    const repoRoot = await getRepoRoot();
    return { repoRoot, name: repoRoot.split('/').filter(Boolean).pop() || repoRoot };
  });

  ipcMain.handle('explorer:list', async (_event, payload) => {
    const repoRoot = await getRepoRoot();
    const relativePath = payload?.path || '';
    const showHidden = payload?.showHidden !== false;
    return listDirectory({ repoRoot, relativePath, showHidden });
  });

  ipcMain.handle('explorer:status', async () => {
    return getExplorerStatus();
  });

  ipcMain.handle('explorer:search', async (_event, payload) => {
    const repoRoot = await getRepoRoot();
    const query = payload?.query || '';
    const limit = payload?.limit || 1000;
    return searchFiles({ repoRoot, query, limit });
  });

  ipcMain.handle('explorer:create', async (_event, payload) => {
    const repoRoot = await getRepoRoot();
    const type = payload?.type || 'file';
    const parentPath = payload?.parentPath || '';
    const name = payload?.name || '';
    return createEntry({ repoRoot, type, parentPath, name });
  });

  ipcMain.handle('explorer:rename', async (_event, payload) => {
    const repoRoot = await getRepoRoot();
    const sourcePath = payload?.sourcePath;
    const targetPath = payload?.targetPath;
    if (!sourcePath || !targetPath) {
      throw new Error('sourcePath and targetPath are required.');
    }
    return renameEntry({ repoRoot, sourcePath, targetPath });
  });

  ipcMain.handle('explorer:delete', async (_event, payload) => {
    const repoRoot = await getRepoRoot();
    const targetPath = payload?.targetPath;
    if (!targetPath) {
      throw new Error('targetPath is required.');
    }
    return deleteEntry({ repoRoot, targetPath });
  });

  ipcMain.handle('explorer:copy', async (_event, payload) => {
    const repoRoot = await getRepoRoot();
    const sourcePath = payload?.sourcePath;
    const targetPath = payload?.targetPath;
    if (!sourcePath || !targetPath) {
      throw new Error('sourcePath and targetPath are required.');
    }
    return copyEntry({ repoRoot, sourcePath, targetPath });
  });

  ipcMain.handle('explorer:reveal', async (_event, payload) => {
    const repoRoot = await getRepoRoot();
    const targetPath = payload?.targetPath;
    if (!targetPath) {
      throw new Error('targetPath is required.');
    }
    return revealEntry({ repoRoot, targetPath });
  });
}

module.exports = {
  setupExplorerHandlers,
};
