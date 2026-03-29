import test from 'node:test';
import assert from 'node:assert/strict';

import {
  isTrackedHarnessEventRelevant,
  resolveCreatedSessionFromHarnessRun,
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
