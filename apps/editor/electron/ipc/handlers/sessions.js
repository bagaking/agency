const { ipcMain } = require('electron');
const {
  listSessions,
  createNewSession,
  closeSessionById,
} = require('../../services/sessions');

function setupSessionHandlers() {
  ipcMain.handle('sessions:list', async (_event, payload) => {
    const { worktreePath } = payload || {};
    if (!worktreePath) {
      throw new Error('worktreePath is required.');
    }
    return listSessions({ worktreePath });
  });

  ipcMain.handle('sessions:create', async (_event, payload) => {
    const { cellId, worktreePath, name } = payload || {};
    if (!cellId || !worktreePath) {
      throw new Error('cellId and worktreePath are required.');
    }
    return createNewSession({ cellId, worktreePath, name });
  });

  ipcMain.handle('sessions:close', async (_event, payload) => {
    const { worktreePath, sessionId } = payload || {};
    if (!worktreePath || !sessionId) {
      throw new Error('worktreePath and sessionId are required.');
    }
    return closeSessionById({ worktreePath, sessionId });
  });
}

module.exports = {
  setupSessionHandlers,
};
