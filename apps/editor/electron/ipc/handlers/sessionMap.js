const { ipcMain } = require('electron');
const { readSessionMap, writeSessionMap } = require('../../services/sessionMap');

function setupSessionMapHandlers() {
  ipcMain.handle('session-map:get', async (_event, payload) => readSessionMap(payload || {}));
  ipcMain.handle('session-map:set', async (_event, payload) => {
    if (!payload || typeof payload !== 'object') {
      throw new Error('session map payload must be an object.');
    }
    return writeSessionMap(payload);
  });
}

module.exports = {
  setupSessionMapHandlers,
};
