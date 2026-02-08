const { ipcMain } = require('electron');

const {
  performFileIntent,
  performToolFileIntent,
  classifyAgentFiles,
} = require('../../services/fileInteraction');

function setupFileInteractionHandlers() {
  ipcMain.handle('file:interact', async (_event, payload) => {
    return performFileIntent(payload || {});
  });

  ipcMain.handle('file:tool:interact', async (_event, payload) => {
    return performToolFileIntent(payload || {});
  });

  ipcMain.handle('file:semantic:classify', async (_event, payload) => {
    return classifyAgentFiles(payload || {});
  });
}

export { setupFileInteractionHandlers };

