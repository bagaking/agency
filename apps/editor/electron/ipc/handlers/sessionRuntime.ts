const { ipcMain } = require('electron');
const { performSessionRuntimeIntent } = require('../../services/sessionRuntime');

function setupSessionRuntimeHandlers() {
  ipcMain.handle('session-runtime:perform', async (_event, payload) => {
    return performSessionRuntimeIntent(payload || {});
  });
}

export { setupSessionRuntimeHandlers };
