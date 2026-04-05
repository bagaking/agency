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
    assert.deepEqual(state.appState.openWindowStateIds, [uiState.LEGACY_WINDOW_STATE_ID]);
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
      attentionSummary: {
        version: 1,
        itemCount: 2,
        highestSeverity: 'critical',
        countsByKind: {
          failed: 1,
          unread: 1,
        },
        primary: {
          id: 'run-failed',
          kind: 'failed',
          ownerKind: 'run',
          severity: 'critical',
          label: 'Create Child Agent via Fork',
          detail: 'Source session is blocked.',
          refs: {
            runId: 'run-failed',
            cellId: 'cell-a',
            sessionId: 'session-main',
          },
        },
        updatedAt: '2026-03-30T12:00:00.000Z',
      },
      sessionVisitedByKey: {
        'cell-a:session-child': 123,
      },
      activeView: 'agent-cells',
      windowBounds: {
        x: 40,
        y: 50,
        width: 1200,
        height: 800,
      },
      windowDisplayAnchor: {
        displayId: '69733248',
        relativeBounds: {
          x: 0.03,
          y: 0.05,
          width: 0.62,
          height: 0.74,
        },
      },
    });
    await uiState.updateWindowUiState('window-b', {
      projectRoot: '/tmp/repo-b',
      selectedId: 'cell-b',
      activeView: 'explorer',
      windowMaximized: true,
    });
    await uiState.updateAppUiState({
      recentProjects: [
        {
          path: '/tmp/repo-b',
          name: 'repo-b',
          lastOpenedAt: '2026-03-22T00:00:00.000Z',
        },
      ],
      openWindowStateIds: ['window-a', 'window-b'],
    });
    await uiState.markLastActiveWindowState('window-b');

    const windowA = await uiState.readWindowUiState('window-a');
    const windowB = await uiState.readWindowUiState('window-b');
    const state = await uiState.readUiState();

    assert.equal(windowA.projectRoot, '/tmp/repo-a');
    assert.equal(windowA.selectedId, 'cell-a');
    assert.equal(windowA.attentionSummary?.highestSeverity, 'critical');
    assert.equal(windowA.attentionSummary?.primary?.id, 'run-failed');
    assert.deepEqual(windowA.sessionVisitedByKey, {
      'cell-a:session-child': 123,
    });
    assert.deepEqual(windowA.windowBounds, {
      x: 40,
      y: 50,
      width: 1200,
      height: 800,
    });
    assert.deepEqual(windowA.windowDisplayAnchor, {
      displayId: '69733248',
      relativeBounds: {
        x: 0.03,
        y: 0.05,
        width: 0.62,
        height: 0.74,
      },
    });
    assert.equal(windowB.projectRoot, '/tmp/repo-b');
    assert.equal(windowB.selectedId, 'cell-b');
    assert.equal(windowB.windowMaximized, true);
    assert.equal(state.lastActiveWindowStateId, 'window-b');
    assert.deepEqual(state.appState.openWindowStateIds, ['window-a', 'window-b']);
    assert.deepEqual(state.appState.recentProjects, [
      {
        path: '/tmp/repo-b',
        name: 'repo-b',
        lastOpenedAt: '2026-03-22T00:00:00.000Z',
      },
    ]);
  });
});

test('peekWindowUiState returns the latest in-memory window snapshot without reload', async () => {
  await withUiStateService(async ({ uiState }) => {
    await uiState.updateWindowUiState('window-a', {
      attentionSummary: {
        version: 1,
        itemCount: 1,
        highestSeverity: 'high',
        countsByKind: {
          running: 1,
        },
        primary: {
          id: 'run-active',
          kind: 'running',
          ownerKind: 'run',
          severity: 'high',
          label: 'Create Child Agent via Fork',
          detail: 'Run is still active.',
          refs: {
            runId: 'run-active',
            cellId: 'cell-a',
            sessionId: 'session-main',
          },
        },
        updatedAt: '2026-03-30T12:10:00.000Z',
      },
    });

    const snapshot = uiState.peekWindowUiState('window-a');

    assert.equal(snapshot.attentionSummary?.primary?.id, 'run-active');
    assert.equal(snapshot.attentionSummary?.itemCount, 1);
  });
});

export {};
