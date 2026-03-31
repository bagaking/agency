import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildCommanderAssistantTurn,
  buildCommanderQuickPrompts,
  buildCommanderWelcomeTurn,
  resolveCommanderContext,
  resolveCommanderIntent,
  resolveRelevantHarnessRun,
} from '../sessionMapCommander';

const runningRun = {
  runId: 'run-1',
  status: 'running',
  goal: {
    title: 'Create Child Agent via Fork',
  },
  currentStep: {
    id: 'create-agent',
    title: 'Create child agent from selected session',
  },
  timeline: [
    {
      id: 't-1',
      title: 'Harness run started',
      phase: 'started',
      status: 'running',
    },
  ],
};

const failedRun = {
  runId: 'run-2',
  status: 'failed',
  goal: {
    title: 'Create Child Agent via Fork',
  },
  failures: [
    {
      message: 'Source session is not running the Codex TUI.',
    },
  ],
  timeline: [
    {
      id: 't-2',
      title: 'Run tool-native fork',
      phase: 'failed',
      status: 'failed',
      detail: {
        message: 'Source session is not running the Codex TUI.',
      },
    },
  ],
};

const focusedFailedRun = {
  ...failedRun,
  runId: 'run-3',
  attentionRefs: {
    cellId: 'cell-main',
    sourceSessionId: 'session-ui',
  },
};

const focusData = {
  cell: {
    id: 'cell-main',
    name: 'main',
  },
  session: {
    id: 'session-ui',
    name: 'UI',
    status: 'active',
  },
};

test('resolveCommanderIntent recognizes Chinese failure phrasing', () => {
  assert.equal(resolveCommanderIntent('为什么 fork 失败了'), 'failure');
  assert.equal(resolveCommanderIntent('下一步怎么办'), 'next');
  assert.equal(resolveCommanderIntent('现在在做什么'), 'status');
});

test('resolveCommanderContext prefers active run and exposes resumable state', () => {
  const context = resolveCommanderContext({
    focusData,
    harnessRuns: [failedRun, runningRun],
    sessionError: '',
  });

  assert.equal(context.activeRun?.runId, 'run-1');
  assert.equal(context.relevantRun?.runId, 'run-1');
  assert.equal(context.hasActiveRun, true);
  assert.equal(context.hasResumableRun, false);
});

test('buildCommanderQuickPrompts includes retry prompt for resumable runs', () => {
  const context = resolveCommanderContext({
    focusData,
    harnessRuns: [failedRun],
    sessionError: '',
  });

  const prompts = buildCommanderQuickPrompts(context);
  assert.equal(prompts.some((item) => item.id === 'retry'), true);
});

test('resolveRelevantHarnessRun prefers the run bound to the focused session', () => {
  const unrelatedRunningRun = {
    ...runningRun,
    runId: 'run-unrelated',
    attentionRefs: {
      cellId: 'cell-other',
      sourceSessionId: 'session-other',
    },
  };

  const relevantRun = resolveRelevantHarnessRun({
    focusData,
    harnessRuns: [unrelatedRunningRun, focusedFailedRun],
  });

  assert.equal(relevantRun?.runId, 'run-3');
});

test('resolveRelevantHarnessRun ignores a preferred run that points at another session', () => {
  const unrelatedRunningRun = {
    ...runningRun,
    runId: 'run-unrelated',
    attentionRefs: {
      cellId: 'cell-other',
      sourceSessionId: 'session-other',
    },
  };

  const relevantRun = resolveRelevantHarnessRun({
    focusData,
    harnessRuns: [unrelatedRunningRun, focusedFailedRun],
    preferredRunId: 'run-unrelated',
  });

  assert.equal(relevantRun?.runId, 'run-3');
});

test('buildCommanderWelcomeTurn carries session and run context', () => {
  const context = resolveCommanderContext({
    focusData,
    harnessRuns: [runningRun],
    sessionError: '',
  });
  const turn = buildCommanderWelcomeTurn(context);

  assert.equal(turn.title, 'Commander Brief Ready');
  assert.match(turn.body, /Focused session: UI/);
  assert.match(turn.body, /Create Child Agent via Fork/);
});

test('buildCommanderAssistantTurn offers retry action on failed run', () => {
  const context = resolveCommanderContext({
    focusData,
    harnessRuns: [failedRun],
    sessionError: '',
  });
  const turn = buildCommanderAssistantTurn('Why did this fail?', context);

  assert.equal(turn.title, 'Failure Analysis');
  assert.match(turn.body, /Source session is not running the Codex TUI/);
  assert.equal(turn.actions.some((action) => action.kind === 'resume_run'), true);
});
