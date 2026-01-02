const { ipcMain } = require('electron');
const { materializeClipboard } = require('../../services/clipboard');

function setupClipboardHandlers() {
  ipcMain.handle('clipboard:materialize', async (_event, payload) => {
    return materializeClipboard(payload || {});
  });
}

module.exports = {
  setupClipboardHandlers,
};
