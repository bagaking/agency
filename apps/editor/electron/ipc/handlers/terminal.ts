const { ipcMain } = require('electron');
const {
  writeSession,
  dispatchSessionInput,
  dispatchSessionCommand,
  resizeSession,
  disposeSession,
} = require('../../services/terminal');
const { logRuntime } = require('../../services/runtimeLog');
const {
  ensureDefaultSession,
  resolveSessionForAttach,
  recreateSession,
} = require('../../services/sessions');
const { resolveCellContext } = require('../../services/cells');
const {
  ensureInteractiveAttach,
  markInteractive,
  noteTerminalDisposed,
  setDetachNotifier,
} = require('../../services/sessionAttachManager');

function setupTerminalHandlers({ getMainWindow }) {
  setDetachNotifier(({ cellId, sessionId }) => {
    const win = getMainWindow();
    if (!win) {
      return;
    }
    win.webContents.send('terminal:detached', { cellId, sessionId });
  });

  ipcMain.on('session:interactive', (_event, payload) => {
    if (!payload) {
      return;
    }
    const { cellId, sessionId, worktreePath, active } = payload;
    if (!cellId || !sessionId || !worktreePath) {
      return;
    }
    markInteractive({ cellId, sessionId, worktreePath, active });
  });

  ipcMain.handle('terminal:start', async (_event, payload) => {
    const { cellId, worktreePath, projectRoot, mode, sessionId } = payload || {};
    if (!cellId) {
      logRuntime('error', 'terminal start failed (missing context)', { cellId, worktreePath });
      throw new Error('cellId is required.');
    }
    const cellContext = await resolveCellContext({
      cellId,
      worktreePath,
      rootPath: projectRoot || worktreePath,
    });
    const resolvedWorktreePath = String(
      cellContext?.attachedWorktreePath || worktreePath || ''
    ).trim();
    if (!resolvedWorktreePath || !require('fs').existsSync(resolvedWorktreePath)) {
      logRuntime('error', 'terminal start failed (missing worktree)', {
        cellId,
        worktreePath: resolvedWorktreePath || worktreePath,
      });
      throw new Error('Cell worktree attachment is missing.');
    }
    let resolvedSessionId = sessionId || 'default';
    try {
      let resolvedSession;
      if (sessionId) {
        try {
          resolvedSession = await resolveSessionForAttach({
            cellId,
            worktreePath: resolvedWorktreePath,
            sessionId,
            projectRoot,
          });
        } catch (error) {
          const message = error?.message || '';
          if (message.includes('Session not found') || message.includes('Session is stale')) {
            resolvedSession = await recreateSession({
              cellId,
              worktreePath: resolvedWorktreePath,
              sessionId,
              projectRoot,
            });
          } else {
            throw error;
          }
        }
      } else {
        resolvedSession = await ensureDefaultSession({
          cellId,
          worktreePath: resolvedWorktreePath,
          projectRoot,
        });
      }
      resolvedSessionId = resolvedSession.id;
      const record = await ensureInteractiveAttach({
        cellId,
        sessionId: resolvedSession.id,
        worktreePath: resolvedWorktreePath,
        mode: mode || 'shell',
        resolvedSession,
      });
      const session = record?.terminalSession;
      if (!session) {
        throw new Error('Terminal session failed to start.');
      }

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

  ipcMain.on('terminal:dispatchCommand', (_event, payload) => {
    if (!payload) {
      return;
    }
    void dispatchSessionCommand(payload.cellId, payload.sessionId, {
      command: payload.command || '',
      appendEnter: payload.appendEnter !== false,
      doubleEnter: payload.doubleEnter === true,
    });
  });

  ipcMain.on('terminal:dispatchInput', (_event, payload) => {
    if (!payload) {
      return;
    }
    void dispatchSessionInput(payload.cellId, payload.sessionId, {
      text: payload.text || '',
      confirm: payload.confirm || {},
    });
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
    noteTerminalDisposed({ cellId: payload.cellId, sessionId: payload.sessionId });
  });
}

export { setupTerminalHandlers };
