const { ipcMain } = require('electron');
const { getRepoRoot, listWorktrees } = require('../../services/git');

function setupWorktreeHandlers() {
  const isTestMode = process.env.AGENCY_TEST_MODE === '1';
  ipcMain.handle('worktrees:list', async () => {
    if (isTestMode) {
      return [
        {
          path: '/tmp/agency/test-cell',
          branch: 'feature/test-cell',
        },
      ];
    }
    const repoRoot = await getRepoRoot();
    return listWorktrees(repoRoot);
  });
}

module.exports = {
  setupWorktreeHandlers,
};
