const { ipcMain } = require('electron');
const { getQuickActions, setQuickActions } = require('../../services/quickActions');

function setupQuickActionsHandlers() {
  ipcMain.handle('quick-actions:get', async (_event, payload) => {
    const scope = payload?.scope || 'resolved';
    const worktreePath = payload?.worktreePath;
    return getQuickActions({ scope, worktreePath });
  });
  ipcMain.handle('quick-actions:set', async (_event, payload) => {
    const scope = payload?.scope || 'global';
    const actions = payload?.actions;
    const worktreePath = payload?.worktreePath;
    if (!Array.isArray(actions)) {
      throw new Error('quick actions payload must be an array.');
    }
    return setQuickActions({ scope, worktreePath, actions });
  });
}

module.exports = {
  setupQuickActionsHandlers,
};
