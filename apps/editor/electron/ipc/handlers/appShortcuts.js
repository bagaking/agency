const { ipcMain } = require('electron');
const {
  getAppShortcuts,
  setAppShortcuts,
  applyAppShortcuts,
} = require('../../services/appShortcuts');

function setupAppShortcutsHandlers() {
  ipcMain.handle('app-shortcuts:get', async (_event, payload) =>
    getAppShortcuts(payload || {})
  );

  ipcMain.handle('app-shortcuts:set', async (_event, payload) => {
    if (payload?.actions && !Array.isArray(payload.actions)) {
      throw new Error('app shortcuts actions must be an array.');
    }
    return setAppShortcuts(payload || {});
  });

  ipcMain.handle('app-shortcuts:apply', async (_event, payload) => {
    if (payload?.actions && !Array.isArray(payload.actions)) {
      throw new Error('app shortcuts actions must be an array.');
    }
    return applyAppShortcuts(payload || {});
  });
}

module.exports = {
  setupAppShortcutsHandlers,
};
