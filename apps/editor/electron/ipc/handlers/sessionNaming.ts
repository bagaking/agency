const { ipcMain } = require('electron');
const sessionNaming = require('../../services/sessionNaming');

function setupSessionNamingHandlers() {
  ipcMain.handle('session-naming:get', async (_event, payload) =>
    sessionNaming.getSessionNamingSettings(payload || {})
  );
  ipcMain.handle('session-naming:set', async (_event, payload) => {
    const settings = payload?.settings;
    return sessionNaming.setSessionNamingSettings({
      scope: payload?.scope,
      worktreePath: payload?.worktreePath,
      projectRoot: payload?.projectRoot,
      cellId: payload?.cellId,
      settings,
    });
  });
}

export { setupSessionNamingHandlers };
