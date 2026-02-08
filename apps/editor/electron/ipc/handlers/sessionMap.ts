const { ipcMain } = require('electron');
const { readSessionMap, writeSessionMap } = require('../../services/sessionMap');
const { captureSessionPreview, captureSessionSnapshot } = require('../../services/sessionPreview');

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
    const { cellId, worktreePath, sessionId, lines, startCommand, cacheOnly } = payload;
    if (!cellId) {
      throw new Error('session map preview requires cellId.');
    }
    return captureSessionPreview({
      cellId,
      worktreePath,
      sessionId,
      lines,
      startCommand,
      cacheOnly,
    });
  });

  ipcMain.handle('session-map:snapshot', async (_event, payload) => {
    if (!payload || typeof payload !== 'object') {
      throw new Error('session snapshot payload must be an object.');
    }
    const { cellId, worktreePath, sessionId, lines, startCommand } = payload;
    if (!cellId) {
      throw new Error('session snapshot requires cellId.');
    }
    return captureSessionSnapshot({ cellId, worktreePath, sessionId, lines, startCommand });
  });
}

export { setupSessionMapHandlers };
