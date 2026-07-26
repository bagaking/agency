const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

const explorerHandlersModulePath = require.resolve('../explorer.ts');

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
  };
}

function createWindow(sender) {
  return {
    webContents: sender,
    isDestroyed() {
      return false;
    },
  };
}

async function withExplorerWatchHandler(run) {
  const originalLoad = Module._load;
  const handlers = new Map();
  const windows = [];
  const watchCallbacks = new Map();
  const starts = [];
  const stops = [];
  const serviceStubs = {
    '../../services/git': {
      getRepoRoot: async (rootPath) => rootPath || '',
    },
    '../../services/projectRoot': {
      resolveProjectRoot: async () => '',
    },
    '../../services/explorerWatch': {
      startExplorerWatch(rootPath, onChange) {
        starts.push(rootPath);
        watchCallbacks.set(rootPath, onChange);
        return { watching: true, rootPath };
      },
      stopExplorerWatch(rootPath = '') {
        stops.push(rootPath);
        if (rootPath) {
          watchCallbacks.delete(rootPath);
        } else {
          watchCallbacks.clear();
        }
      },
    },
    '../../services/explorer': {
      listDirectory: async () => ({ path: '', entries: [] }),
      getExplorerStatus: async () => ({}),
      searchFiles: async () => ({ matches: [], truncated: false }),
      searchContent: async () => ({ results: [] }),
      replaceContent: async () => ({}),
      createEntry: async () => ({}),
      renameEntry: async () => ({}),
      deleteEntry: async () => ({}),
      copyEntry: async () => ({}),
      importEntries: async () => ({}),
      revealEntry: async () => ({}),
      readEntry: async () => ({}),
    },
    '../../services/explorerPolicy': {
      readExplorerProjectPolicy: async () => ({}),
    },
  };

  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === 'electron') {
      return {
        ipcMain: {
          handle(channel, handler) {
            handlers.set(channel, handler);
          },
        },
        BrowserWindow: {
          getAllWindows() {
            return windows;
          },
        },
      };
    }
    if (serviceStubs[request]) {
      return serviceStubs[request];
    }
    return originalLoad.call(this, request, parent, isMain);
  };

  delete require.cache[explorerHandlersModulePath];
  const { setupExplorerHandlers } = require(explorerHandlersModulePath);
  setupExplorerHandlers();

  try {
    await run({
      handler: handlers.get('explorer:watch'),
      windows,
      watchCallbacks,
      starts,
      stops,
    });
  } finally {
    delete require.cache[explorerHandlersModulePath];
    Module._load = originalLoad;
  }
}

test('explorer watch handler routes change events to the subscribed window root', async () => {
  await withExplorerWatchHandler(async ({ handler, windows, watchCallbacks, stops }) => {
    const senderA = createSender(101);
    const senderB = createSender(202);
    const rootA = '/tmp/agency-root-a';
    const rootB = '/tmp/agency-root-b';
    windows.push(createWindow(senderA), createWindow(senderB));

    await handler({ sender: senderA }, { rootPath: rootA });
    await handler({ sender: senderB }, { rootPath: rootB });

    watchCallbacks.get(rootA)?.({ rootPath: rootA, paths: ['src'], timestamp: 1 });
    watchCallbacks.get(rootB)?.({ rootPath: rootB, paths: ['docs'], timestamp: 2 });

    assert.deepEqual(senderA.sent, [
      {
        channel: 'explorer:changed',
        payload: { rootPath: rootA, paths: ['src'], timestamp: 1 },
      },
    ]);
    assert.deepEqual(senderB.sent, [
      {
        channel: 'explorer:changed',
        payload: { rootPath: rootB, paths: ['docs'], timestamp: 2 },
      },
    ]);

    await handler({ sender: senderA }, { rootPath: '' });

    assert.deepEqual(stops, [rootA]);
    assert.equal(watchCallbacks.has(rootB), true);
  });
});

test('explorer watch handler keeps a shared root alive until the last subscriber leaves', async () => {
  await withExplorerWatchHandler(async ({ handler, windows, watchCallbacks, stops }) => {
    const senderA = createSender(303);
    const senderB = createSender(404);
    const rootPath = '/tmp/agency-shared-root';
    windows.push(createWindow(senderA), createWindow(senderB));

    await handler({ sender: senderA }, { rootPath });
    await handler({ sender: senderB }, { rootPath });
    await handler({ sender: senderA }, { rootPath: '' });

    assert.deepEqual(stops, []);
    assert.equal(watchCallbacks.has(rootPath), true);

    senderB.emitOnce('destroyed');

    assert.deepEqual(stops, [rootPath]);
  });
});

export {};
