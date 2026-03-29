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

test('run.start preserves owner window scope in harness context', async () => {
  let capturedContext = null;
  let capturedPayload = null;
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

test('unsupported op returns a normalized user error', async () => {
  const controlBus = createControlBusService();
  const result = await controlBus.dispatch({
    op: 'unknown.op',
  });

  assert.equal(result.success, false);
  assert.equal(result.failures[0].code, 'USER_ERROR');
});

export {};
