import test from 'node:test';
import assert from 'node:assert/strict';

import {
  isTrackedHarnessEventRelevant,
  resolveCreatedSessionFromHarnessRun,
  resolveTrackedHarnessTerminalOutcome,
} from '../commanderHarnessTracking';

test('isTrackedHarnessEventRelevant accepts terminal events matched only by pending clientRequestId', () => {
  const relevant = isTrackedHarnessEventRelevant({
    event: {
      runId: 'run-fast',
      clientRequestId: 'fork-123',
      terminal: true,
    },
    knownRunsById: {},
    pendingRuns: {
      'fork-123': {
        clientRequestId: 'fork-123',
        runId: '',
        cellId: 'cell-1',
      },
    },
  });

  assert.equal(relevant, true);
});

test('resolveCreatedSessionFromHarnessRun finds a created child session from failed capability summaries', () => {
  const session = resolveCreatedSessionFromHarnessRun({
    status: 'failed',
    capabilityCalls: [
      {
        capabilityId: 'session.runtime',
        summary: {
          data: {
            session: {
              id: 'child-timeout',
              profileId: 'codex',
              nodeKind: 'fork',
            },
          },
        },
      },
    ],
  });

  assert.deepEqual(session, {
    id: 'child-timeout',
    profileId: 'codex',
    nodeKind: 'fork',
  });
});

test('resolveCreatedSessionFromHarnessRun prefers artifact child over inspect source summary', () => {
  const session = resolveCreatedSessionFromHarnessRun({
    status: 'failed',
    capabilityCalls: [
      {
        request: {
          intent: 'inspect',
        },
        summary: {
          data: {
            session: {
              id: 'source-session',
              profileId: 'codex',
              nodeKind: 'root',
            },
          },
        },
      },
    ],
    artifacts: [
      {
        kind: 'session',
        sessionId: 'child-session',
        profileId: 'codex',
        nodeKind: 'fork',
      },
    ],
  });

  assert.deepEqual(session, {
    id: 'child-session',
    profileId: 'codex',
    nodeKind: 'fork',
  });
});

test('resolveTrackedHarnessTerminalOutcome marks failed child-created runs as partial success', () => {
  const outcome = resolveTrackedHarnessTerminalOutcome({
    status: 'failed',
    failures: [
      {
        message: 'Timed out waiting for child session runtime readiness.',
      },
    ],
    capabilityCalls: [
      {
        request: {
          intent: 'inspect',
        },
        summary: {
          data: {
            session: {
              id: 'source-session',
            },
          },
        },
      },
    ],
    artifacts: [
      {
        kind: 'session',
        sessionId: 'child-session',
        profileId: 'codex',
        nodeKind: 'fork',
      },
    ],
  });

  assert.equal(outcome.createdSessionId, 'child-session');
  assert.equal(outcome.partialSuccess, true);
  assert.match(outcome.failureMessage, /Child session created, readiness not confirmed/i);
});
