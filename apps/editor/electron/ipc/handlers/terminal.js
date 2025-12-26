const { ipcMain } = require('electron');
const {
  startSession,
  writeSession,
  resizeSession,
  disposeSession,
} = require('../../services/terminal');

function setupTerminalHandlers({ getMainWindow }) {
  ipcMain.handle('terminal:start', async (_event, payload) => {
    const { cellId, worktreePath, mode } = payload || {};
    if (!cellId || !worktreePath) {
      throw new Error('cellId and worktreePath are required.');
    }
    if (!require('fs').existsSync(worktreePath)) {
      throw new Error(`Worktree path does not exist: ${worktreePath}`);
    }
    try {
      const session = startSession({
        cellId,
        cwd: worktreePath,
        mode: mode || 'cli',
      });

      if (!session.subscribed) {
        session.subscribed = true;
        session.ptyProcess.onData((data) => {
          const win = getMainWindow();
          if (win) {
            win.webContents.send('terminal:data', { cellId, data });
          }
        });
      }

      return { ok: true };
    } catch (error) {
      const win = getMainWindow();
      if (win) {
        win.webContents.send('terminal:error', {
          cellId,
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
    writeSession(payload.cellId, payload.data || '');
  });

  ipcMain.on('terminal:resize', (_event, payload) => {
    if (!payload) {
      return;
    }
    resizeSession(payload.cellId, payload.cols, payload.rows);
  });

  ipcMain.on('terminal:dispose', (_event, payload) => {
    if (!payload) {
      return;
    }
    disposeSession(payload.cellId);
  });
}

module.exports = {
  setupTerminalHandlers,
};
