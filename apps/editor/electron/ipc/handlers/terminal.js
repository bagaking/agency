const { ipcMain } = require('electron');
const {
  startSession,
  writeSession,
  resizeSession,
  disposeSession,
} = require('../../services/terminal');
const { logRuntime } = require('../../services/runtimeLog');
const {
  ensureDefaultSession,
  resolveSessionForAttach,
  recreateSession,
} = require('../../services/sessions');

function setupTerminalHandlers({ getMainWindow }) {
  ipcMain.handle('terminal:start', async (_event, payload) => {
    const { cellId, worktreePath, mode, sessionId } = payload || {};
    if (!cellId || !worktreePath) {
      logRuntime('error', 'terminal start failed (missing context)', { cellId, worktreePath });
      throw new Error('cellId and worktreePath are required.');
    }
    if (!require('fs').existsSync(worktreePath)) {
      logRuntime('error', 'terminal start failed (missing worktree)', {
        cellId,
        worktreePath,
      });
      throw new Error(`Worktree path does not exist: ${worktreePath}`);
    }
    let resolvedSessionId = sessionId || 'default';
    try {
      let resolvedSession;
      if (sessionId) {
        try {
          resolvedSession = await resolveSessionForAttach({ worktreePath, sessionId });
        } catch (error) {
          const message = error?.message || '';
          if (message.includes('Session not found') || message.includes('Session is stale')) {
            resolvedSession = await recreateSession({ cellId, worktreePath, sessionId });
          } else {
            throw error;
          }
        }
      } else {
        resolvedSession = await ensureDefaultSession({ cellId, worktreePath });
      }
      resolvedSessionId = resolvedSession.id;
      const session = startSession({
        cellId,
        sessionId: resolvedSession.id,
        tmuxSession: resolvedSession.tmuxSession,
        cwd: worktreePath,
        mode: mode || 'shell',
      });

      if (!session.subscribed) {
        session.subscribed = true;
        session.ptyProcess.onData((data) => {
          const win = getMainWindow();
          if (win) {
            win.webContents.send('terminal:data', {
              cellId,
              sessionId: resolvedSession.id,
              data,
            });
          }
        });
      }

      return { ok: true };
    } catch (error) {
      logRuntime('error', 'terminal start failed', {
        cellId,
        sessionId: resolvedSessionId,
        mode,
        error: error.message,
      });
      const win = getMainWindow();
      if (win) {
        win.webContents.send('terminal:error', {
          cellId,
          sessionId: resolvedSessionId,
          message: error.message || 'Terminal failed to start.',
        });
      }
      throw error;
    }
  });

  ipcMain.on('terminal:write', (_event, payload) => {
    if (!payload) {
      return;
    }
    writeSession(payload.cellId, payload.sessionId, payload.data || '');
  });

  ipcMain.on('terminal:resize', (_event, payload) => {
    if (!payload) {
      return;
    }
    resizeSession(payload.cellId, payload.sessionId, payload.cols, payload.rows);
  });

  ipcMain.on('terminal:dispose', (_event, payload) => {
    if (!payload) {
      return;
    }
    disposeSession(payload.cellId, payload.sessionId);
  });
}

module.exports = {
  setupTerminalHandlers,
};
