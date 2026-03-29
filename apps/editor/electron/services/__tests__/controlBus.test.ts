const test = require('node:test');
const assert = require('node:assert/strict');

const {
  CONTROL_BUS_OPS,
  createControlBusService,
} = require('../controlBus');

test('file.intent resolves rootPath from canonical cell refs', async () => {
  let capturedPayload = null;
  const controlBus = createControlBusService({
    listCells: async () => [
      {
        id: 'cell-1',
        worktreePath: '/repo/.worktrees/cell-1',
      },
    ],
    performFileIntent: async (payload) => {
      capturedPayload = payload;
      return {
        success: true,
        intent: 'open',
        warnings: [],
        failures: [],
        data: {
          path: payload.targetPath,
        },
      };
    },
  });

  const result = await controlBus.dispatch({
    op: CONTROL_BUS_OPS.fileIntent,
    refs: {
      projectRoot: '/repo',
      cellId: 'cell-1',
    },
    args: {
      intent: 'open',
      targetPath: 'README.md',
    },
    caller: {
      callerType: 'tool',
      callerId: 'test',
    },
  });

  assert.equal(result.success, true);
  assert.equal(capturedPayload.rootPath, '/repo/.worktrees/cell-1');
  assert.equal(result.data.intent, 'open');
});

test('file.intent rejects conflicting args.rootPath against canonical refs', async () => {
  const controlBus = createControlBusService({
    listCells: async () => [
      {
        id: 'cell-1',
        worktreePath: '/repo/.worktrees/cell-1',
      },
    ],
  });

  const result = await controlBus.dispatch({
    op: CONTROL_BUS_OPS.fileIntent,
    refs: {
      projectRoot: '/repo',
      cellId: 'cell-1',
    },
    args: {
      intent: 'open',
      targetPath: 'README.md',
      rootPath: '/repo',
    },
  });

  assert.equal(result.success, false);
  assert.equal(result.failures[0].code, 'REF_MISMATCH');
});

test('run.start preserves owner window scope in harness context', async () => {
  let capturedContext = null;
  let capturedPayload = null;
  const controlBus = createControlBusService({
    resolveProjectRoot: async ({ rootPath }) => rootPath,
    listCells: async () => [
      {
        id: 'cell-main',
        worktreePath: '/repo/.worktrees/cell-main',
      },
    ],
    listSessions: async () => [
      {
        id: 'session-ui',
      },
    ],
    startMainAgentHarnessRun: async (payload, context) => {
      capturedPayload = payload;
      capturedContext = context;
      return {
        success: true,
        action: 'start',
        data: {
          runId: 'run-1',
        },
      };
    },
  });

  const result = await controlBus.dispatch(
    {
      op: CONTROL_BUS_OPS.runStart,
      refs: {
        windowStateId: 'window-1',
        projectRoot: '/repo',
        cellId: 'cell-main',
        sessionId: 'session-ui',
      },
      args: {
        goal: {
          type: 'create_agent',
        },
      },
      caller: {
        callerType: 'tool',
        callerId: 'test-runner',
        traceId: 'trace-1',
      },
    },
    {
      transportTrust: 'trusted_host_cli',
    }
  );

  assert.equal(result.success, true);
  assert.equal(capturedContext.transportTrust, 'trusted_host_cli');
  assert.equal(capturedContext.accessScope, 'window');
  assert.equal(capturedContext.ownerWindowStateId, 'window-1');
  assert.equal(capturedPayload.callerId, 'test-runner');
  assert.deepEqual(
    capturedPayload.contextRefs,
    [
      { type: 'project', projectRoot: '/repo' },
      { type: 'cell', cellId: 'cell-main', worktreePath: '/repo/.worktrees/cell-main' },
      { type: 'session', sessionId: 'session-ui' },
    ]
  );
});

test('run.start rejects conflicting args.contextRefs against canonical refs', async () => {
  const controlBus = createControlBusService({
    listCells: async () => [
      {
        id: 'cell-main',
        worktreePath: '/repo/.worktrees/cell-main',
      },
    ],
    listSessions: async () => [
      {
        id: 'session-ui',
      },
    ],
  });

  const result = await controlBus.dispatch({
    op: CONTROL_BUS_OPS.runStart,
    refs: {
      projectRoot: '/repo',
      cellId: 'cell-main',
      sessionId: 'session-ui',
    },
    args: {
      goal: {
        type: 'create_agent',
      },
      contextRefs: [
        {
          type: 'project',
          projectRoot: '/somewhere-else',
        },
      ],
    },
  });

  assert.equal(result.success, false);
  assert.equal(result.failures[0].code, 'REF_MISMATCH');
});

test('window.list returns normalized window shell data', async () => {
  const controlBus = createControlBusService({
    describeEditorWindows: () => [
      {
        windowId: 1,
        windowStateId: 'window-1',
        projectRoot: '/repo',
        title: 'repo - Agency',
      },
    ],
  });

  const result = await controlBus.dispatch({
    op: CONTROL_BUS_OPS.windowList,
  });

  assert.equal(result.success, true);
  assert.deepEqual(result.data, {
    windows: [
      {
        windowId: 1,
        windowStateId: 'window-1',
        projectRoot: '/repo',
        title: 'repo - Agency',
      },
    ],
  });
});

test('window.focus rejects conflicting args.windowStateId against refs', async () => {
  const controlBus = createControlBusService({
    getAllWindows: () => [],
  });

  const result = await controlBus.dispatch({
    op: CONTROL_BUS_OPS.windowFocus,
    refs: {
      windowStateId: 'window-a',
    },
    args: {
      windowStateId: 'window-b',
    },
  });

  assert.equal(result.success, false);
  assert.equal(result.failures[0].code, 'REF_MISMATCH');
});

test('window.list ignores unrelated invalid cell refs', async () => {
  const controlBus = createControlBusService({
    describeEditorWindows: () => [
      {
        windowId: 1,
        windowStateId: 'window-1',
        projectRoot: '/repo',
        title: 'repo - Agency',
      },
    ],
    listCells: async () => [],
  });

  const result = await controlBus.dispatch({
    op: CONTROL_BUS_OPS.windowList,
    refs: {
      cellId: 'missing-cell',
    },
  });

  assert.equal(result.success, true);
  assert.equal(result.data.windows.length, 1);
});

test('project.get does not mark unresolved explicit projectRoot as valid', async () => {
  const controlBus = createControlBusService({
    resolveProjectRoot: async () => '',
    getProjectContext: async () => ({
      projectRoot: '',
      recentProjects: [],
      windowStateId: '',
    }),
  });

  const result = await controlBus.dispatch({
    op: CONTROL_BUS_OPS.projectGet,
    refs: {
      projectRoot: '/definitely/not/a/repo',
    },
  });

  assert.equal(result.success, true);
  assert.equal(result.data.projectRoot, '');
  assert.equal(result.data.valid, false);
});

test('session.perform rejects conflicting worktreePath against canonical refs', async () => {
  const controlBus = createControlBusService({
    listCells: async () => [
      {
        id: 'cell-main',
        worktreePath: '/repo/.worktrees/cell-main',
      },
    ],
    listSessions: async () => [
      {
        id: 'session-ui',
      },
    ],
  });

  const result = await controlBus.dispatch({
    op: CONTROL_BUS_OPS.sessionPerform,
    refs: {
      projectRoot: '/repo',
      cellId: 'cell-main',
      sessionId: 'session-ui',
    },
    args: {
      intent: 'inspect',
      worktreePath: '/repo',
    },
  });

  assert.equal(result.success, false);
  assert.equal(result.failures[0].code, 'REF_MISMATCH');
});

test('unsupported op returns a normalized user error', async () => {
  const controlBus = createControlBusService();
  const result = await controlBus.dispatch({
    op: 'unknown.op',
  });

  assert.equal(result.success, false);
  assert.equal(result.failures[0].code, 'USER_ERROR');
});

export {};
