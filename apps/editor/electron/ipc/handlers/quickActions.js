const { ipcMain } = require('electron');
const { readQuickActions, writeQuickActions } = require('../../services/quickActions');

function setupQuickActionsHandlers() {
  ipcMain.handle('quick-actions:get', async () => readQuickActions());
  ipcMain.handle('quick-actions:set', async (_event, payload) => {
    if (!Array.isArray(payload)) {
      throw new Error('quick actions payload must be an array.');
    }
    return writeQuickActions(payload);
  });
}

module.exports = {
  setupQuickActionsHandlers,
};
