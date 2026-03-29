import assert from 'node:assert/strict';
import test from 'node:test';

import { createCommanderSessionActionsRunner } from '../useCommanderSessionActions';

test('runSmartFork pre-tracks, launches, settles, and selects the created child session', async () => {
  const calls: string[] = [];
  const runner = createCommanderSessionActionsRunner({
    startSmartForkRun: async () => {
      calls.push('start');
      return { runId: 'run-1' };
    },
    launchCommanderTask: async () => {
      calls.push('launch-task');
      return {
        type: 'complete',
        value: {
          sessionId: 'child-1',
        },
      };
    },
    openAlert: async () => undefined,
    notifySuccess: () => undefined,
    trackPendingHarnessRun: ({ runId }) => {
      calls.push(runId ? 'track-run' : 'track-pre');
    },
    settleTrackedHarnessRun: async () => {
      calls.push('settle');
      return true;
    },
    focusSessionInUi: () => {
      calls.push('focus-ui');
    },
    clearTrackedHarnessRun: () => {
      calls.push('clear');
    },
  } as any);

  await runner.runSmartFork({
    cell: {
      id: 'cell-1',
      worktreePath: '/repo',
      name: 'Cell 1',
      branch: 'feat/test',
    },
    session: {
      id: 'session-1',
      name: 'CLI - codex',
    },
    available: true,
  });

  assert.deepEqual(calls, [
    'track-pre',
    'start',
    'track-run',
    'launch-task',
    'settle',
    'focus-ui',
  ]);
});

test('runSmartFork clears pending tracking and opens alert when start fails', async () => {
  const calls: string[] = [];
  const runner = createCommanderSessionActionsRunner({
    startSmartForkRun: async () => {
      calls.push('start');
      throw new Error('fork failed');
    },
    launchCommanderTask: async () => {
      calls.push('launch-task');
      return null;
    },
    openAlert: async () => {
      calls.push('alert');
      return undefined;
    },
    notifySuccess: () => undefined,
    trackPendingHarnessRun: ({ runId }) => {
      calls.push(runId ? 'track-run' : 'track-pre');
    },
    clearTrackedHarnessRun: () => {
      calls.push('clear');
    },
  } as any);

  await runner.runSmartFork({
    cell: {
      id: 'cell-1',
      worktreePath: '/repo',
      name: 'Cell 1',
      branch: 'feat/test',
    },
    session: {
      id: 'session-1',
      name: 'CLI - codex',
    },
    available: true,
  });

  assert.deepEqual(calls, ['track-pre', 'start', 'alert', 'clear']);
});

test('runSmartFork still delegates settle on partial failure when task sheet can open created child', async () => {
  const calls: string[] = [];
  const runner = createCommanderSessionActionsRunner({
    startSmartForkRun: async () => {
      calls.push('start');
      return { runId: 'run-partial' };
    },
    launchCommanderTask: async () => {
      calls.push('launch-task');
      return {
        type: 'complete',
        value: {
          sessionId: 'child-created',
        },
      };
    },
    openAlert: async () => undefined,
    notifySuccess: () => undefined,
    trackPendingHarnessRun: ({ runId }) => {
      calls.push(runId ? 'track-run' : 'track-pre');
    },
    settleTrackedHarnessRun: async () => {
      calls.push('settle');
      return true;
    },
    clearTrackedHarnessRun: () => {
      calls.push('clear');
    },
  } as any);

  await runner.runSmartFork({
    cell: {
      id: 'cell-1',
      worktreePath: '/repo',
      name: 'Cell 1',
      branch: 'feat/test',
    },
    session: {
      id: 'session-1',
      name: 'CLI - codex',
    },
    available: true,
  });

  assert.deepEqual(calls, [
    'track-pre',
    'start',
    'track-run',
    'launch-task',
    'settle',
  ]);
});

test('runSmartName renames the session and notifies success after candidate apply', async () => {
  const calls: string[] = [];
  const runner = createCommanderSessionActionsRunner({
    startSmartNameRun: async () => {
      calls.push('start');
      return { runId: 'run-name' };
    },
    launchCommanderTask: async () => {
      calls.push('launch-task');
      return {
        type: 'apply',
        value: 'Sharper Session',
      };
    },
    renameSession: async () => {
      calls.push('rename');
      return undefined;
    },
    notifySuccess: () => {
      calls.push('notify');
    },
    openAlert: async () => undefined,
  } as any);

  await runner.runSmartName({
    cell: {
      id: 'cell-1',
      worktreePath: '/repo',
      name: 'Cell 1',
      branch: 'feat/test',
    },
    session: {
      id: 'session-1',
      name: 'CLI - codex',
    },
    available: true,
  });

  assert.deepEqual(calls, ['start', 'launch-task', 'rename', 'notify']);
});

test('runSmartName does not rename when task sheet is cancelled', async () => {
  const calls: string[] = [];
  const runner = createCommanderSessionActionsRunner({
    startSmartNameRun: async () => {
      calls.push('start');
      return { runId: 'run-name' };
    },
    launchCommanderTask: async () => {
      calls.push('launch-task');
      return {
        type: 'closed',
      };
    },
    renameSession: async () => {
      calls.push('rename');
      return undefined;
    },
    notifySuccess: () => {
      calls.push('notify');
    },
    openAlert: async () => undefined,
  } as any);

  await runner.runSmartName({
    cell: {
      id: 'cell-1',
      worktreePath: '/repo',
      name: 'Cell 1',
      branch: 'feat/test',
    },
    session: {
      id: 'session-1',
      name: 'CLI - codex',
    },
    available: true,
  });

  assert.deepEqual(calls, ['start', 'launch-task']);
});
