const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildCommanderHarnessPayload,
  createCommanderService,
} = require('../commander');
const {
  COMMANDER_ACTION_IDS,
} = require('../../../shared/commanderCore');

test('buildCommanderHarnessPayload creates a smart-name Harness payload', () => {
  const payload = buildCommanderHarnessPayload({
    actionId: COMMANDER_ACTION_IDS.smartName,
    worktreePath: '/repo',
    cellId: 'cell-1',
    cellName: 'feat/cell-1',
    cellBranch: 'feat/cell-1',
    sessionId: 'session-1',
    sessionName: 'CLI - codex',
  });

  assert.equal(payload.goal.type, 'suggest_session_name');
  assert.equal(payload.callerId, 'commander-smart-name');
  assert.deepEqual(payload.requestedCapabilities, ['session.runtime']);
  assert.equal(payload.runner.providerId, 'codex_cli');
  assert.equal(payload.runner.steps[0].skillPackId, 'session.smart-name');
  assert.equal(payload.runner.steps[0].agent.sessionRuntime.sessionName, 'CLI - codex');
});

test('buildCommanderHarnessPayload creates a smart-fork Harness payload', () => {
  const payload = buildCommanderHarnessPayload({
    actionId: COMMANDER_ACTION_IDS.smartFork,
    worktreePath: '/repo',
    cellId: 'cell-1',
    cellName: 'feat/cell-1',
    cellBranch: 'feat/cell-1',
    sessionId: 'session-1',
  });

  assert.equal(payload.goal.type, 'create_agent');
  assert.equal(payload.callerId, 'commander-smart-fork');
  assert.equal(payload.runner.steps[0].kind, 'create_agent');
  assert.equal(
    payload.runner.steps[0].skillPackId,
    'session.tool-native-fork'
  );
});

test('performCommanderAction blocks provider-backed actions when Commander is not ready', async () => {
  let harnessCalled = false;
  const commander = createCommanderService({
    getCommanderStatus: async () => ({
      ready: false,
      reason: 'Commander backend is offline.',
    }),
    resolveActionStatuses: async () => ({
      [COMMANDER_ACTION_IDS.smartFork]: {
        visible: false,
        enabled: false,
        reason: 'Commander backend is offline.',
        checkedAt: new Date().toISOString(),
      },
      [COMMANDER_ACTION_IDS.smartName]: {
        visible: false,
        enabled: false,
        reason: 'Commander backend is offline.',
        checkedAt: new Date().toISOString(),
      },
    }),
    startHarnessRun: async () => {
      harnessCalled = true;
      return null;
    },
  });

  await assert.rejects(
    () =>
      commander.performCommanderAction({
        actionId: COMMANDER_ACTION_IDS.smartFork,
        worktreePath: '/repo',
        cellId: 'cell-1',
        sessionId: 'session-1',
      }),
    /Commander backend is offline/
  );
  assert.equal(harnessCalled, false);
});

test('performCommanderAction delegates a ready action to the Harness control plane', async () => {
  let capturedPayload = null;
  let capturedContext = null;
  const commander = createCommanderService({
    getCommanderStatus: async () => ({
      ready: true,
      reason: '',
    }),
    resolveActionStatuses: async () => ({
      [COMMANDER_ACTION_IDS.smartFork]: {
        visible: true,
        enabled: true,
        reason: '',
        checkedAt: new Date().toISOString(),
        mode: 'smart_fork',
      },
      [COMMANDER_ACTION_IDS.smartName]: {
        visible: true,
        enabled: true,
        reason: '',
        checkedAt: new Date().toISOString(),
      },
    }),
    startHarnessRun: async (payload, context) => {
      capturedPayload = payload;
      capturedContext = context;
      return {
        success: true,
        data: {
          runId: 'run-1',
        },
      };
    },
  });

  const response = await commander.performCommanderAction(
    {
      actionId: COMMANDER_ACTION_IDS.smartFork,
      worktreePath: '/repo',
      cellId: 'cell-1',
      cellName: 'feat/cell-1',
      cellBranch: 'feat/cell-1',
      sessionId: 'session-1',
      sourceSurface: 'agent-cells',
      callerType: 'renderer',
    },
    {
      ownerWindowStateId: 'window-1',
      accessScope: 'window',
    }
  );

  assert.equal(response.success, true);
  assert.equal(capturedPayload.goal.type, 'create_agent');
  assert.equal(capturedPayload.runner.steps[0].agent.strategy, 'tool_native_fork');
  assert.equal(capturedContext.ownerWindowStateId, 'window-1');
});

test('performCommanderAction blocks an unavailable Commander action even when global readiness is true', async () => {
  let harnessCalled = false;
  const commander = createCommanderService({
    getCommanderStatus: async () => ({
      ready: true,
      reason: '',
    }),
    resolveActionStatuses: async () => ({
      [COMMANDER_ACTION_IDS.smartFork]: {
        visible: false,
        enabled: false,
        reason: 'Smart Fork is not supported for the current session.',
        checkedAt: new Date().toISOString(),
        mode: 'fail',
      },
      [COMMANDER_ACTION_IDS.smartName]: {
        visible: true,
        enabled: true,
        reason: '',
        checkedAt: new Date().toISOString(),
      },
    }),
    startHarnessRun: async () => {
      harnessCalled = true;
      return null;
    },
  });

  await assert.rejects(
    () =>
      commander.performCommanderAction({
        actionId: COMMANDER_ACTION_IDS.smartFork,
        worktreePath: '/repo',
        cellId: 'cell-1',
        sessionId: 'session-1',
      }),
    /Smart Fork is not supported/
  );
  assert.equal(harnessCalled, false);
});

export {};
