const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const Module = require('node:module');

const uiStateModulePath = require.resolve('../uiState.ts');

async function withUiStateService(run) {
  const userDataPath = await fs.mkdtemp(path.join(os.tmpdir(), 'agency-ui-state-'));
  const originalLoad = Module._load;

  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === 'electron') {
      return {
        app: {
          getPath(name) {
            if (name === 'userData') {
              return userDataPath;
            }
            throw new Error(`Unsupported app path request: ${name}`);
          },
        },
      };
    }
    return originalLoad.call(this, request, parent, isMain);
  };

  delete require.cache[uiStateModulePath];
  const uiState = require(uiStateModulePath);

  try {
    await run({ uiState, userDataPath });
  } finally {
    delete require.cache[uiStateModulePath];
    Module._load = originalLoad;
    await fs.rm(userDataPath, { recursive: true, force: true });
  }
}

test('normalizes legacy flat ui state into app/global and window-local scopes', async () => {
  await withUiStateService(async ({ uiState, userDataPath }) => {
    const legacyPayload = {
      recentProjects: [
        {
          path: '/tmp/repo-a',
          name: 'repo-a',
          lastOpenedAt: '2026-03-22T00:00:00.000Z',
        },
      ],
      projectRoot: '/tmp/repo-a',
      selectedId: 'cell-a',
      activeView: 'explorer',
      sidebarWidth: 420,
    };

    await fs.writeFile(
      path.join(userDataPath, 'editor-ui-state.json'),
      JSON.stringify(legacyPayload, null, 2),
      'utf8'
    );

    const state = await uiState.readUiState();
    assert.equal(state.version, uiState.STATE_VERSION);
    assert.equal(state.lastActiveWindowStateId, uiState.LEGACY_WINDOW_STATE_ID);
    assert.deepEqual(state.appState.recentProjects, legacyPayload.recentProjects);
    assert.equal(
      state.windowStates[uiState.LEGACY_WINDOW_STATE_ID]?.projectRoot,
      '/tmp/repo-a'
    );
    assert.equal(
      state.windowStates[uiState.LEGACY_WINDOW_STATE_ID]?.selectedId,
      'cell-a'
    );
    assert.equal(
      state.windowStates[uiState.LEGACY_WINDOW_STATE_ID]?.activeView,
      'explorer'
    );
  });
});

test('keeps window snapshots isolated while sharing app-global state', async () => {
  await withUiStateService(async ({ uiState }) => {
    await uiState.updateWindowUiState('window-a', {
      projectRoot: '/tmp/repo-a',
      selectedId: 'cell-a',
      activeView: 'agent-cells',
    });
    await uiState.updateWindowUiState('window-b', {
      projectRoot: '/tmp/repo-b',
      selectedId: 'cell-b',
      activeView: 'explorer',
    });
    await uiState.updateAppUiState({
      recentProjects: [
        {
          path: '/tmp/repo-b',
          name: 'repo-b',
          lastOpenedAt: '2026-03-22T00:00:00.000Z',
        },
      ],
    });
    await uiState.markLastActiveWindowState('window-b');

    const windowA = await uiState.readWindowUiState('window-a');
    const windowB = await uiState.readWindowUiState('window-b');
    const state = await uiState.readUiState();

    assert.equal(windowA.projectRoot, '/tmp/repo-a');
    assert.equal(windowA.selectedId, 'cell-a');
    assert.equal(windowB.projectRoot, '/tmp/repo-b');
    assert.equal(windowB.selectedId, 'cell-b');
    assert.equal(state.lastActiveWindowStateId, 'window-b');
    assert.deepEqual(state.appState.recentProjects, [
      {
        path: '/tmp/repo-b',
        name: 'repo-b',
        lastOpenedAt: '2026-03-22T00:00:00.000Z',
      },
    ]);
  });
});

export {};
