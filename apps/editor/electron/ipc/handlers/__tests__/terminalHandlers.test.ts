const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

const terminalHandlersModulePath = require.resolve('../terminal.ts');

function createSender(id) {
  const onceHandlers = new Map();
  const sent = [];
  return {
    id,
    sent,
    once(event, handler) {
      onceHandlers.set(event, handler);
    },
    emitOnce(event) {
      const handler = onceHandlers.get(event);
      onceHandlers.delete(event);
      handler?.();
    },
    send(channel, payload) {
      sent.push({ channel, payload });
    },
    isDestroyed() {
      return false;
    },
  };
}

function createTerminalSession() {
  let onDataHandler = null;
  return {
    ptyProcess: {
      onData(handler) {
        onDataHandler = handler;
      },
    },
    emitData(data) {
      onDataHandler?.(data);
    },
  };
}

async function withTerminalHandler(run, options: any = {}) {
  const originalLoad = Module._load;
  const handlers = new Map();
  const listeners = new Map();
  const mainSender = createSender(1);
  const terminalSession = createTerminalSession();
  let detachNotifier = null;

  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === 'electron') {
      return {
        ipcMain: {
          handle(channel, handler) {
            handlers.set(channel, handler);
          },
          on(channel, handler) {
            listeners.set(channel, handler);
          },
        },
      };
    }
    if (request === '../../services/terminal') {
      return {
        writeSession() {},
        dispatchSessionInput: async () => undefined,
        dispatchSessionCommand: async () => undefined,
        resizeSession() {},
        disposeSession() {},
      };
    }
    if (request === '../../services/runtimeLog') {
      return {
        logRuntime() {},
      };
    }
    if (request === '../../services/sessions') {
      return {
        ensureDefaultSession: async () => ({
          id: 'session-a',
          tmuxSession: 'tmux-a',
        }),
        ensureSessionRuntimeRoot: (context) => ({
          path: context.worktreePath,
        }),
        resolveSessionServiceContext: async ({ worktreePath }) => ({
          worktreePath,
        }),
        resolveSessionForAttach: async ({ sessionId }) => ({
          id: sessionId,
          tmuxSession: 'tmux-a',
        }),
        recreateSession: async ({ sessionId }) => ({
          id: sessionId,
          tmuxSession: 'tmux-a',
        }),
      };
    }
    if (request === '../../services/sessionAttachManager') {
      return {
        ensureInteractiveAttach: async () => {
          if (options.failAttach) {
            throw new Error('attach failed');
          }
          return {
            terminalSession,
          };
        },
        markInteractive() {},
        noteTerminalDisposed() {},
        setDetachNotifier(handler) {
          detachNotifier = handler;
        },
      };
    }
    return originalLoad.call(this, request, parent, isMain);
  };

  delete require.cache[terminalHandlersModulePath];
  const { setupTerminalHandlers } = require(terminalHandlersModulePath);
  setupTerminalHandlers({
    getMainWindow: () => ({
      webContents: mainSender,
    }),
  });

  try {
    await run({
      startHandler: handlers.get('terminal:start'),
      terminalSession,
      detach(payload) {
        detachNotifier?.(payload);
      },
      mainSender,
    });
  } finally {
    delete require.cache[terminalHandlersModulePath];
    Module._load = originalLoad;
  }
}

test('terminal data and detach events route to the starting window owner', async () => {
  await withTerminalHandler(async ({ startHandler, terminalSession, detach, mainSender }) => {
    const ownerSender = createSender(20);
    await startHandler(
      { sender: ownerSender },
      {
        cellId: 'cell-a',
        sessionId: 'session-a',
        worktreePath: process.cwd(),
      }
    );

    terminalSession.emitData('hello\n');
    detach({ cellId: 'cell-a', sessionId: 'session-a' });

    assert.deepEqual(ownerSender.sent, [
      {
        channel: 'terminal:data',
        payload: { cellId: 'cell-a', sessionId: 'session-a', data: 'hello\n' },
      },
      {
        channel: 'terminal:detached',
        payload: { cellId: 'cell-a', sessionId: 'session-a' },
      },
    ]);
    assert.deepEqual(mainSender.sent, []);
  });
});

test('terminal start errors route to the requesting window owner', async () => {
  await withTerminalHandler(async ({ startHandler, mainSender }) => {
    const ownerSender = createSender(30);
    await assert.rejects(
      () =>
        startHandler(
          { sender: ownerSender },
          {
            cellId: 'cell-a',
            sessionId: 'session-a',
            worktreePath: process.cwd(),
          }
        ),
      /attach failed/
    );

    assert.deepEqual(ownerSender.sent, [
      {
        channel: 'terminal:error',
        payload: {
          cellId: 'cell-a',
          sessionId: 'session-a',
          message: 'attach failed',
        },
      },
    ]);
    assert.deepEqual(mainSender.sent, []);
  }, { failAttach: true });
});

test('terminal data fans out to every window attached to the same session', async () => {
  await withTerminalHandler(async ({ startHandler, terminalSession, mainSender }) => {
    const senderA = createSender(40);
    const senderB = createSender(50);
    const payload = {
      cellId: 'cell-a',
      sessionId: 'session-a',
      worktreePath: process.cwd(),
    };

    await startHandler({ sender: senderA }, payload);
    await startHandler({ sender: senderB }, payload);

    terminalSession.emitData('shared\n');

    assert.deepEqual(senderA.sent, [
      {
        channel: 'terminal:data',
        payload: { cellId: 'cell-a', sessionId: 'session-a', data: 'shared\n' },
      },
    ]);
    assert.deepEqual(senderB.sent, [
      {
        channel: 'terminal:data',
        payload: { cellId: 'cell-a', sessionId: 'session-a', data: 'shared\n' },
      },
    ]);
    assert.deepEqual(mainSender.sent, []);
  });
});

export {};
