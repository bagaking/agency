const { ipcMain } = require('electron');
const { resolveProjectRoot } = require('../../services/projectRoot');
const {
  readSummary,
  writeConfig,
  applyLink,
  applyAllLinks,
} = require('../../services/worktreeLinks');

function setupWorktreeLinksHandlers() {
  ipcMain.handle('worktree-links:get', async (_event, payload) => {
    const repoRoot = await resolveProjectRoot({ rootPath: payload?.rootPath });
    if (!repoRoot) {
      return {
        config: { version: 1, autoLinkOnCreate: false, links: [] },
        candidates: [],
        statuses: [],
        statusesByPath: {},
        configPath: '',
        repoRoot: '',
      };
    }
    const worktreePath = payload?.worktreePath;
    const worktreePaths = payload?.worktreePaths || [];
    return readSummary({ repoRoot, worktreePath, worktreePaths });
  });

  ipcMain.handle('worktree-links:set', async (_event, payload) => {
    const repoRoot = await resolveProjectRoot({ rootPath: payload?.rootPath });
    if (!repoRoot) {
      throw new Error('Project root is not configured.');
    }
    const config = await writeConfig(repoRoot, payload || {});
    return config;
  });

  ipcMain.handle('worktree-links:apply', async (_event, payload) => {
    const repoRoot = await resolveProjectRoot({ rootPath: payload?.rootPath });
    if (!repoRoot) {
      throw new Error('Project root is not configured.');
    }
    const { worktreePath, linkId } = payload || {};
    if (!worktreePath || !linkId) {
      throw new Error('worktreePath and linkId are required.');
    }
    return applyLink({ repoRoot, worktreePath, linkId });
  });

  ipcMain.handle('worktree-links:applyAll', async (_event, payload) => {
    const repoRoot = await resolveProjectRoot({ rootPath: payload?.rootPath });
    if (!repoRoot) {
      throw new Error('Project root is not configured.');
    }
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
