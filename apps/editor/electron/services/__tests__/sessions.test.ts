const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

export {};

const serviceModulePath = require.resolve('../sessions.ts');

async function withSessionsService(options, run) {
  const originalLoad = Module._load;
  const repoRoot = options?.repoRoot || (await fs.mkdtemp(path.join(os.tmpdir(), 'agency-sessions-')));
  const state = {
    registry: options?.registry || { version: 1, sessions: [] },
    createCalls: [],
    hasSessionCalls: [],
    listTmuxSessionStatesCalls: 0,
    syncCalls: [],
  };

  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === './sessionRegistry') {
      return {
        readRegistry: async () => state.registry,
        writeRegistry: async (_ctx, next) => {
          state.registry = next;
          return next;
        },
        updateRegistry: async (_ctx, mutate) => {
          const next = await mutate(state.registry);
          state.registry = next;
          return next;
        },
        upsertSession: (registry, session) => {
          const sessions = Array.isArray(registry.sessions) ? [...registry.sessions] : [];
          const index = sessions.findIndex((item) => item.id === session.id);
          if (index >= 0) {
            sessions[index] = session;
          } else {
            sessions.push(session);
          }
          return { ...registry, sessions };
        },
        removeSession: (registry, sessionId) => ({
          ...registry,
          sessions: (registry.sessions || []).filter((session) => session.id !== sessionId),
        }),
      };
    }
    if (request === './cells') {
      return {
        resolveCellContext: async () => ({
          repoRoot,
          cell: {
            id: 'cell-main',
            name: 'main',
            branch: 'main',
            attachmentState: 'project_root',
          },
          worktreePath: '',
          attachedWorktreePath: '',
        }),
      };
    }
    if (request === './sessionTopology') {
      return {
        SESSION_NODE_KINDS: { ROOT: 'root' },
        buildNewSessionTopologyFields: () => ({
          parentSessionId: null,
          order: 0,
          nodeKind: 'root',
          sourceSessionId: null,
        }),
        moveSessionNodeInRegistry: () => ({ changed: false, registry: state.registry }),
      };
    }
    if (request === './projectRoot') {
      return {
        resolveProjectRoot: async (
          { rootPath }: { rootPath?: string } = {}
        ) => rootPath || repoRoot,
      };
    }
    if (request === './sessionNaming') {
      return {
        formatSessionName: async () => 'Session 1',
        getSessionNamingSettings: async () => ({}),
        resolveUserName: () => 'tester',
      };
    }
    if (request === './tmux') {
      return {
        ensureTmuxAvailable: async () => undefined,
        hasSession: async (tmuxSession) => {
          state.hasSessionCalls.push(tmuxSession);
          return options?.onHasSession ? options.onHasSession(tmuxSession, state) : false;
        },
        listTmuxSessionStates: async () => {
          state.listTmuxSessionStatesCalls += 1;
          return options?.onListTmuxSessionStates
            ? options.onListTmuxSessionStates(state)
            : [];
        },
        createSession: async (tmuxSession, cwd) => {
          state.createCalls.push({ tmuxSession, cwd });
        },
        setExtendedKeys: async () => undefined,
        setMouse: async () => undefined,
        killSession: async () => undefined,
        getLastPaneActivity: async () => null,
        capturePane: async () => '',
        setAgencySessionMetadata: async (_tmuxSession, payload) => {
          state.syncCalls.push(payload);
        },
      };
    }
    if (request === './git') {
      return {
        getRepoRoot: async () => repoRoot,
      };
    }
    if (request === './sessionMap') {
      return {
        readSessionMap: async () => ({}),
      };
    }
    if (request === './sessionPreviewCache') {
      return {
        readPreviewCache: async () => null,
        writePreviewCache: async () => undefined,
      };
    }
    if (request === './mobileSessionProxy') {
      return {
        revokeMobileSessionProxyTokenForSession: () => undefined,
      };
    }
    return originalLoad.call(this, request, parent, isMain);
  };

  delete require.cache[serviceModulePath];
  const service = require(serviceModulePath);
  try {
    await run(service, state, repoRoot);
  } finally {
    delete require.cache[serviceModulePath];
    Module._load = originalLoad;
    await fs.rm(repoRoot, { recursive: true, force: true });
  }
}

test('createNewSession uses project root as runtime root for project-root cells', async () => {
  await withSessionsService({}, async ({ createNewSession }, state, repoRoot) => {
    const created = await createNewSession({
      cellId: 'cell-main',
      projectRoot: repoRoot,
      name: 'CLI',
      profileId: 'shell',
    });

    assert.equal(created.cellId, 'cell-main');
    assert.equal(created.cellBranch, 'main');
    assert.equal(state.createCalls.length, 1);
    assert.equal(state.createCalls[0].cwd, repoRoot);
    assert.equal(state.syncCalls[0].runtimeRootKind, 'project');
    assert.equal(state.syncCalls[0].runtimeRootPath, repoRoot);
  });
});

test('listSessions preserves sessions added while refreshing registry status', async () => {
  await withSessionsService(
    {
      registry: {
        version: 1,
        sessions: [
          {
            id: 'sess-existing',
            name: 'Existing',
            tmuxSession: 'agency-cell-main-existing',
            cellId: 'cell-main',
            status: 'active',
          },
        ],
      },
      onHasSession: async (_tmuxSession, state) => {
        if (!state.registry.sessions.some((session) => session.id === 'sess-new')) {
          state.registry = {
            ...state.registry,
            sessions: [
              ...state.registry.sessions,
              {
                id: 'sess-new',
                name: 'New',
                tmuxSession: 'agency-cell-main-new',
                cellId: 'cell-main',
                status: 'active',
              },
            ],
          };
        }
        return false;
      },
      onListTmuxSessionStates: async (state) => {
        if (!state.registry.sessions.some((session) => session.id === 'sess-new')) {
          state.registry = {
            ...state.registry,
            sessions: [
              ...state.registry.sessions,
              {
                id: 'sess-new',
                name: 'New',
                tmuxSession: 'agency-cell-main-new',
                cellId: 'cell-main',
                status: 'active',
              },
            ],
          };
        }
        return [];
      },
    },
    async ({ listSessions }, state, repoRoot) => {
      await listSessions({
        cellId: 'cell-main',
        projectRoot: repoRoot,
      });

      assert.deepEqual(
        state.registry.sessions.map((session) => session.id),
        ['sess-existing', 'sess-new']
      );
      assert.equal(state.registry.sessions[0].status, 'stale');
      assert.equal(state.registry.sessions[1].status, 'active');
    }
  );
});

test('listSessions uses a batched tmux state snapshot instead of per-session probes', async () => {
  await withSessionsService(
    {
      registry: {
        version: 1,
        sessions: [
          {
            id: 'sess-active',
            name: 'Active',
            tmuxSession: 'agency-cell-main-active',
            cellId: 'cell-main',
            status: 'stale',
          },
          {
            id: 'sess-stale',
            name: 'Stale',
            tmuxSession: 'agency-cell-main-stale',
            cellId: 'cell-main',
            status: 'active',
          },
        ],
      },
      onHasSession: async () => {
        throw new Error('hasSession should not be called by listSessions.');
      },
      onListTmuxSessionStates: async () => [
        {
          tmuxSession: 'agency-cell-main-active',
          lastActivityAt: null,
        },
      ],
    },
    async ({ listSessions }, state, repoRoot) => {
      const sessions = await listSessions({
        cellId: 'cell-main',
        projectRoot: repoRoot,
      });

      assert.equal(state.listTmuxSessionStatesCalls, 1);
      assert.deepEqual(state.hasSessionCalls, []);
      assert.equal(sessions.find((session) => session.id === 'sess-active')?.status, 'active');
      assert.equal(sessions.find((session) => session.id === 'sess-stale')?.status, 'stale');
    }
  );
});
