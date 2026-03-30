const { ipcMain } = require('electron');
const {
  listSessions,
  createNewSession,
  closeSessionById,
  detachSessionById,
  renameSessionById,
  updateSessionMeta,
  moveSessionNodeById,
  setSessionMouse,
} = require('../../services/sessions');
const { prepareSessionContinueOnMobile } = require('../../services/mobileSessionContinuation');

function setupSessionHandlers() {
  ipcMain.handle('sessions:list', async (_event, payload) => {
    const { worktreePath, cellId, projectRoot, rootPath } = payload || {};
    if (!worktreePath && !cellId) {
      throw new Error('worktreePath or cellId is required.');
    }
    return listSessions({ worktreePath, cellId, projectRoot, rootPath });
  });

  ipcMain.handle('sessions:create', async (_event, payload) => {
    const {
      cellId,
      worktreePath,
      name,
      sessionId,
      profileId,
      avatar,
      cellName,
      cellBranch,
      parentSessionId,
      nodeKind,
      sourceSessionId,
      projectRoot,
      rootPath,
    } = payload || {};
    if (!cellId) {
      throw new Error('cellId is required.');
    }
    return createNewSession({
      cellId,
      worktreePath,
      projectRoot,
      rootPath,
      name,
      sessionId,
      profileId,
      avatar,
      cellName,
      cellBranch,
      parentSessionId,
      nodeKind,
      sourceSessionId,
    });
  });

  ipcMain.handle('sessions:close', async (_event, payload) => {
    const { worktreePath, sessionId, cellId, projectRoot } = payload || {};
    if (!sessionId || (!worktreePath && !cellId)) {
      throw new Error('sessionId and worktreePath or cellId are required.');
    }
    return closeSessionById({ worktreePath, sessionId, cellId, projectRoot });
  });

  ipcMain.handle('sessions:detach', async (_event, payload) => {
    const { worktreePath, sessionId, cellId, projectRoot } = payload || {};
    if (!sessionId || (!worktreePath && !cellId)) {
      throw new Error('sessionId and worktreePath or cellId are required.');
    }
    return detachSessionById({ worktreePath, sessionId, cellId, projectRoot });
  });

  ipcMain.handle('sessions:rename', async (_event, payload) => {
    const { worktreePath, sessionId, name, cellId, projectRoot } = payload || {};
    if (!sessionId || !name || (!worktreePath && !cellId)) {
      throw new Error('sessionId, name, and worktreePath or cellId are required.');
    }
    return renameSessionById({ worktreePath, sessionId, name, cellId, projectRoot });
  });

  ipcMain.handle('sessions:updateMeta', async (_event, payload) => {
    const { worktreePath, sessionId, avatar, cellId, projectRoot } = payload || {};
    if (!sessionId || (!worktreePath && !cellId)) {
      throw new Error('sessionId and worktreePath or cellId are required.');
    }
    return updateSessionMeta({ worktreePath, sessionId, avatar, cellId, projectRoot });
  });

  ipcMain.handle('sessions:move', async (_event, payload) => {
    const { worktreePath, sessionId, parentSessionId, beforeSessionId, cellId, projectRoot } = payload || {};
    if (!sessionId || (!worktreePath && !cellId)) {
      throw new Error('sessionId and worktreePath or cellId are required.');
    }
    return moveSessionNodeById({
      worktreePath,
      sessionId,
      parentSessionId: parentSessionId || null,
      beforeSessionId: beforeSessionId || null,
      cellId,
      projectRoot,
    });
  });

  ipcMain.handle('sessions:setMouse', async (_event, payload) => {
    const { worktreePath, sessionId, enabled, cellId, projectRoot } = payload || {};
    if (!sessionId || (!worktreePath && !cellId)) {
      throw new Error('sessionId and worktreePath or cellId are required.');
    }
    return setSessionMouse({ worktreePath, sessionId, enabled, cellId, projectRoot });
  });

  ipcMain.handle('sessions:continueOnMobile', async (_event, payload) => {
    const { worktreePath, sessionId, mode, cellId, projectRoot, rootPath } = payload || {};
    if (!sessionId || (!worktreePath && !cellId)) {
      throw new Error('sessionId and worktreePath or cellId are required.');
    }
    return prepareSessionContinueOnMobile({
      worktreePath,
      sessionId,
      mode,
      cellId,
      projectRoot,
      rootPath,
    });
  });
}

export { setupSessionHandlers };
