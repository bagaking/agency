const { ipcMain } = require('electron');
const { materializeClipboard, materializeMarkdown } = require('../../services/clipboard');

function setupClipboardHandlers() {
  ipcMain.handle('clipboard:materialize', async (_event, payload) => {
    return materializeClipboard(payload || {});
  });
  ipcMain.handle('clipboard:materializeMarkdown', async (_event, payload) => {
    return materializeMarkdown(payload || {});
  });
}

module.exports = {
  setupClipboardHandlers,
};
