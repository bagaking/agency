import assert from 'node:assert/strict';
import test from 'node:test';

import {
  mergeSessionActivityTimestampsWithSuppression,
} from '../sessionRuntime';

test('mergeSessionActivityTimestampsWithSuppression skips suppressed sessions', () => {
  const now = Date.parse('2026-03-30T14:00:00.000Z');
  const result = mergeSessionActivityTimestampsWithSuppression({
    current: {
      'cell-a:session-a': now - 20_000,
    },
    cellId: 'cell-a',
    sessions: [
      {
        id: 'session-a',
        lastActivityAt: new Date(now - 1_000).toISOString(),
      },
    ],
    ignoreUntilByKey: {
      'cell-a:session-a': now + 5_000,
    },
    now,
  });

  assert.equal(result['cell-a:session-a'], now - 20_000);
});

test('mergeSessionActivityTimestampsWithSuppression still records unsuppressed newer activity', () => {
  const now = Date.parse('2026-03-30T14:00:00.000Z');
  const result = mergeSessionActivityTimestampsWithSuppression({
    current: {
      'cell-b:session-b': now - 20_000,
    },
    cellId: 'cell-b',
    sessions: [
      {
        id: 'session-b',
        lastActivityAt: new Date(now - 1_000).toISOString(),
      },
    ],
    ignoreUntilByKey: {
      'cell-b:session-b': now - 1,
    },
    now,
  });

  assert.equal(result['cell-b:session-b'], now - 1_000);
});
