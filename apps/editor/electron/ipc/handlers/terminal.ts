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
  ensureSessionRuntimeRoot,
  resolveSessionServiceContext,
  resolveSessionForAttach,
  recreateSession,
} = require('../../services/sessions');
const {
  ensureInteractiveAttach,
  markInteractive,
  noteTerminalDisposed,
  setDetachNotifier,
} = require('../../services/sessionAttachManager');

const terminalOwnerIdsBySession = new Map();
const terminalWebContentsById = new Map();
const terminalOwnerCleanupRegistered = new Set();

function buildTerminalOwnerKey(cellId, sessionId) {
  return `${cellId}:${sessionId}`;
}

function isLiveWebContents(webContents) {
  return Boolean(webContents && !webContents.isDestroyed?.());
}

function removeTerminalOwnerIdFromAll(webContentsId) {
  terminalOwnerIdsBySession.forEach((ownerIds, key) => {
    ownerIds.delete(webContentsId);
    if (!ownerIds.size) {
      terminalOwnerIdsBySession.delete(key);
    }
  });
  terminalWebContentsById.delete(webContentsId);
}

function registerTerminalOwnerCleanup(sender) {
  const webContentsId = sender?.id;
  if (!webContentsId || terminalOwnerCleanupRegistered.has(webContentsId) || typeof sender.once !== 'function') {
    return;
  }
  terminalOwnerCleanupRegistered.add(webContentsId);
  sender.once('destroyed', () => {
    terminalOwnerCleanupRegistered.delete(webContentsId);
    removeTerminalOwnerIdFromAll(webContentsId);
  });
}

function addTerminalOwner({ cellId, sessionId, sender }) {
  const webContentsId = sender?.id;
  if (!cellId || !sessionId || !webContentsId || !isLiveWebContents(sender)) {
    return;
  }
  const key = buildTerminalOwnerKey(cellId, sessionId);
  const ownerIds = terminalOwnerIdsBySession.get(key) || new Set();
  ownerIds.add(webContentsId);
  terminalOwnerIdsBySession.set(key, ownerIds);
  terminalWebContentsById.set(webContentsId, sender);
  registerTerminalOwnerCleanup(sender);
}

function removeTerminalOwner({ cellId, sessionId, sender }) {
  const webContentsId = sender?.id;
  if (!cellId || !sessionId || !webContentsId) {
    return;
  }
  const key = buildTerminalOwnerKey(cellId, sessionId);
  const ownerIds = terminalOwnerIdsBySession.get(key);
  if (!ownerIds) {
    return;
  }
  ownerIds.delete(webContentsId);
  if (!ownerIds.size) {
    terminalOwnerIdsBySession.delete(key);
  }
}

function sendToWebContents(webContents, channel, payload) {
  if (!isLiveWebContents(webContents)) {
    return false;
  }
  webContents.send(channel, payload);
  return true;
}

function sendToFallbackWindow(getMainWindow, channel, payload) {
  const win = getMainWindow?.();
  if (!win || win.isDestroyed?.()) {
    return false;
  }
  return sendToWebContents(win.webContents, channel, payload);
}

function sendToSenderOrFallback(sender, getMainWindow, channel, payload) {
  if (sendToWebContents(sender, channel, payload)) {
    return true;
  }
  return sendToFallbackWindow(getMainWindow, channel, payload);
}

function sendTerminalEvent({ cellId, sessionId, channel, payload, getMainWindow }) {
  const key = buildTerminalOwnerKey(cellId, sessionId);
  const ownerIds = terminalOwnerIdsBySession.get(key);
  let delivered = false;
  if (ownerIds?.size) {
    Array.from(ownerIds).forEach((webContentsId) => {
      const webContents = terminalWebContentsById.get(webContentsId);
      if (sendToWebContents(webContents, channel, payload)) {
        delivered = true;
      } else {
        removeTerminalOwnerIdFromAll(webContentsId);
      }
    });
  }
  if (!delivered) {
    return sendToFallbackWindow(getMainWindow, channel, payload);
  }
  return true;
}

function clearTerminalOwners({ cellId, sessionId }) {
  terminalOwnerIdsBySession.delete(buildTerminalOwnerKey(cellId, sessionId));
}

function setupTerminalHandlers({ getMainWindow }) {
  setDetachNotifier(({ cellId, sessionId }) => {
    sendTerminalEvent({
      cellId,
      sessionId,
      channel: 'terminal:detached',
      payload: { cellId, sessionId },
      getMainWindow,
    });
    clearTerminalOwners({ cellId, sessionId });
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

  ipcMain.handle('terminal:start', async (event, payload) => {
    const ownerSender = event?.sender;
    const { cellId, worktreePath, projectRoot, mode, sessionId } = payload || {};
    if (!cellId) {
      logRuntime('error', 'terminal start failed (missing context)', { cellId, worktreePath });
      throw new Error('cellId is required.');
    }
    const sessionContext = await resolveSessionServiceContext({
      cellId,
      worktreePath,
      projectRoot,
    });
    const runtimeRoot = ensureSessionRuntimeRoot(
      sessionContext,
      'Cell runtime root is missing.'
    );
    const resolvedWorktreePath = String(runtimeRoot.path || worktreePath || '').trim();
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

      addTerminalOwner({
        cellId,
        sessionId: resolvedSession.id,
        sender: ownerSender,
      });

      if (!session.subscribed) {
        session.subscribed = true;
        session.ptyProcess.onData((data) => {
          sendTerminalEvent({
            cellId,
            sessionId: resolvedSession.id,
            channel: 'terminal:data',
            payload: {
              cellId,
              sessionId: resolvedSession.id,
              data,
            },
            getMainWindow,
          });
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
      sendToSenderOrFallback(
        ownerSender,
        getMainWindow,
        'terminal:error',
        {
          cellId,
          sessionId: resolvedSessionId,
          message: error.message || 'Terminal failed to start.',
        }
      );
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

  ipcMain.on('terminal:dispose', (event, payload) => {
    if (!payload) {
      return;
    }
    disposeSession(payload.cellId, payload.sessionId);
    noteTerminalDisposed({ cellId: payload.cellId, sessionId: payload.sessionId });
    removeTerminalOwner({
      cellId: payload.cellId,
      sessionId: payload.sessionId,
      sender: event?.sender,
    });
  });
}

export { setupTerminalHandlers };
