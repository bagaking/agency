const { ipcMain } = require('electron');
const { getQuickActions, setQuickActions } = require('../../services/quickActions');

function setupQuickActionsHandlers() {
  ipcMain.handle('quick-actions:get', async (_event, payload) => {
    const scope = payload?.scope || 'resolved';
    return getQuickActions({
      scope,
      worktreePath: payload?.worktreePath,
      projectRoot: payload?.projectRoot,
      cellId: payload?.cellId,
    });
  });
  ipcMain.handle('quick-actions:set', async (_event, payload) => {
    const scope = payload?.scope || 'global';
    const actions = payload?.actions;
    if (!Array.isArray(actions)) {
      throw new Error('quick actions payload must be an array.');
    }
    return setQuickActions({
      scope,
      worktreePath: payload?.worktreePath,
      projectRoot: payload?.projectRoot,
      cellId: payload?.cellId,
      actions,
    });
  });
}

export { setupQuickActionsHandlers };
