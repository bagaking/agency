const { ipcMain } = require('electron');
const { listWorktrees } = require('../../services/git');
const { resolveProjectRoot } = require('../../services/projectRoot');

function setupWorktreeHandlers() {
  const isTestMode = process.env.AGENCY_TEST_MODE === '1';
  ipcMain.handle('worktrees:list', async (_event, payload) => {
    if (isTestMode) {
      return [
        {
          path: '/tmp/agency/test-cell',
          branch: 'feature/test-cell',
        },
      ];
    }
    const repoRoot = await resolveProjectRoot({ rootPath: payload?.rootPath });
    if (!repoRoot) {
      return [];
    }
    return listWorktrees(repoRoot);
  });
}

module.exports = {
  setupWorktreeHandlers,
};
