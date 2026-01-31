const { ipcMain } = require('electron');
const { readSessionMap, writeSessionMap } = require('../../services/sessionMap');
const { captureSessionPreview } = require('../../services/sessionPreview');

function setupSessionMapHandlers() {
  ipcMain.handle('session-map:get', async (_event, payload) => readSessionMap(payload || {}));
  ipcMain.handle('session-map:set', async (_event, payload) => {
    if (!payload || typeof payload !== 'object') {
      throw new Error('session map payload must be an object.');
    }
    return writeSessionMap(payload);
  });
  ipcMain.handle('session-map:preview', async (_event, payload) => {
    if (!payload || typeof payload !== 'object') {
      throw new Error('session map preview payload must be an object.');
    }
    const { worktreePath, sessionId, lines } = payload;
    return captureSessionPreview({ worktreePath, sessionId, lines });
  });
}

module.exports = {
  setupSessionMapHandlers,
};
