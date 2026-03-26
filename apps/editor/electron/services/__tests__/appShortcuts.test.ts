const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

const serviceModulePath = require.resolve('../appShortcuts.ts');

async function withAppShortcutsService(run) {
  const originalLoad = Module._load;
  const sentMessages = [];
  const registrations = new Map();
  const windows = [];
  let focusedWindow = null;

  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === 'electron') {
      return {
        app: {
          getPath() {
            return '/tmp/agency-app-shortcuts-test';
          },
        },
        BrowserWindow: {
          getFocusedWindow() {
            return focusedWindow;
          },
          getAllWindows() {
            return windows;
          },
        },
        globalShortcut: {
          register(accelerator, callback) {
            registrations.set(accelerator, callback);
            return true;
          },
          unregister(accelerator) {
            registrations.delete(accelerator);
          },
          isRegistered(accelerator) {
            return registrations.has(accelerator);
          },
        },
      };
    }
    if (request === './runtimeLog') {
      return {
        logRuntime() {},
      };
    }
    return originalLoad.call(this, request, parent, isMain);
  };

  delete require.cache[serviceModulePath];
  const service = require(serviceModulePath);

  const createWindow = (name) => ({
    name,
    destroyed: false,
    isDestroyed() {
      return this.destroyed;
    },
    webContents: {
      send(channel, payload) {
        sentMessages.push({ name, channel, payload });
      },
    },
  });

  try {
    await run({
      service,
      registrations,
      sentMessages,
      windows,
      createWindow,
      setFocusedWindow(nextWindow) {
        focusedWindow = nextWindow;
      },
    });
  } finally {
    service.clearRegisteredShortcuts();
    delete require.cache[serviceModulePath];
    Module._load = originalLoad;
  }
}

test('app shortcuts dispatch to the focused window only', async () => {
  await withAppShortcutsService(async ({
    service,
    registrations,
    sentMessages,
    windows,
    createWindow,
    setFocusedWindow,
  }) => {
    const firstWindow = createWindow('first');
    const secondWindow = createWindow('second');
    windows.push(firstWindow, secondWindow);
    setFocusedWindow(secondWindow);

    const applyResult = service.applyAppShortcuts({
      actions: [
        {
          id: 'view.explorer',
          enabled: true,
          shortcut: 'CmdOrCtrl+Shift+E',
        },
      ],
    });

    assert.equal(applyResult.ok, true);
    const callback = registrations.get('CmdOrCtrl+Shift+E');
    assert.equal(typeof callback, 'function');

    callback();

    assert.deepEqual(sentMessages, [
      {
        name: 'second',
        channel: 'app-shortcuts:trigger',
        payload: { id: 'view.explorer' },
      },
    ]);
  });
});

export {};
