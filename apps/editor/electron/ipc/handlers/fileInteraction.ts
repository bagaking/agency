const { ipcMain } = require('electron');

const { performFileIntent, performToolFileIntent } = require('../../services/fileInteraction');

function setupFileInteractionHandlers() {
  ipcMain.handle('file:interact', async (_event, payload) => {
    return performFileIntent(payload || {});
  });

  ipcMain.handle('file:tool:interact', async (_event, payload) => {
    return performToolFileIntent(payload || {});
  });
}

export { setupFileInteractionHandlers };

