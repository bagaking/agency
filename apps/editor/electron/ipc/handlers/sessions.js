const { ipcMain } = require('electron');
const {
  listSessions,
  createNewSession,
  closeSessionById,
  detachSessionById,
  renameSessionById,
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
    const { cellId, worktreePath, name, sessionId, profileId, avatar } = payload || {};
    if (!cellId || !worktreePath) {
      throw new Error('cellId and worktreePath are required.');
    }
    return createNewSession({ cellId, worktreePath, name, sessionId, profileId, avatar });
  });

  ipcMain.handle('sessions:close', async (_event, payload) => {
    const { worktreePath, sessionId } = payload || {};
    if (!worktreePath || !sessionId) {
      throw new Error('worktreePath and sessionId are required.');
    }
    return closeSessionById({ worktreePath, sessionId });
  });

  ipcMain.handle('sessions:detach', async (_event, payload) => {
    const { worktreePath, sessionId } = payload || {};
    if (!worktreePath || !sessionId) {
      throw new Error('worktreePath and sessionId are required.');
    }
    return detachSessionById({ worktreePath, sessionId });
  });

  ipcMain.handle('sessions:rename', async (_event, payload) => {
    const { worktreePath, sessionId, name } = payload || {};
    if (!worktreePath || !sessionId || !name) {
      throw new Error('worktreePath, sessionId, and name are required.');
    }
    return renameSessionById({ worktreePath, sessionId, name });
  });
}

module.exports = {
  setupSessionHandlers,
};
