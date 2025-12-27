const { ipcMain } = require('electron');
const { getRepoRoot } = require('../../services/git');
const {
  readSummary,
  writeConfig,
  applyLink,
  applyAllLinks,
} = require('../../services/worktreeLinks');

function setupWorktreeLinksHandlers() {
  ipcMain.handle('worktree-links:get', async (_event, payload) => {
    const repoRoot = await getRepoRoot();
    const worktreePath = payload?.worktreePath;
    const worktreePaths = payload?.worktreePaths || [];
    return readSummary({ repoRoot, worktreePath, worktreePaths });
  });

  ipcMain.handle('worktree-links:set', async (_event, payload) => {
    const repoRoot = await getRepoRoot();
    const config = await writeConfig(repoRoot, payload || {});
    return config;
  });

  ipcMain.handle('worktree-links:apply', async (_event, payload) => {
    const repoRoot = await getRepoRoot();
    const { worktreePath, linkId } = payload || {};
    if (!worktreePath || !linkId) {
      throw new Error('worktreePath and linkId are required.');
    }
    return applyLink({ repoRoot, worktreePath, linkId });
  });

  ipcMain.handle('worktree-links:applyAll', async (_event, payload) => {
    const repoRoot = await getRepoRoot();
    const { worktreePath } = payload || {};
    if (!worktreePath) {
      throw new Error('worktreePath is required.');
    }
    return applyAllLinks({ repoRoot, worktreePath, bestEffort: true });
  });
}

module.exports = {
  setupWorktreeLinksHandlers,
};
