const { ipcMain } = require('electron');
const terminusSettings = require('../../services/terminusSettings');

function setupTerminusSettingsHandlers() {
  ipcMain.handle('terminus-settings:get', async (_event, payload) =>
    terminusSettings.getTerminusSettings(payload || {})
  );
  ipcMain.handle('terminus-settings:set', async (_event, payload) => {
    const settings = payload?.settings;
    return terminusSettings.setTerminusSettings({
      scope: payload?.scope,
      worktreePath: payload?.worktreePath,
      settings,
    });
  });
}

export { setupTerminusSettingsHandlers };
