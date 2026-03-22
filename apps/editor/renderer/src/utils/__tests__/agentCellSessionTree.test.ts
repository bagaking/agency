import test from 'node:test';
import assert from 'node:assert/strict';

import { projectAgentCellSessionTree } from '../agentCellSessionTree';

test('projects nested visible session rows by parent/order', () => {
  const projection = projectAgentCellSessionTree({
    activeSessionId: 'session-1',
    sessions: [
      { id: 'session-1', name: 'Root', order: 2000, status: 'active' },
      { id: 'session-2', name: 'Child A', parentSessionId: 'session-1', order: 1000, status: 'stale' },
      { id: 'session-3', name: 'Child B', parentSessionId: 'session-1', order: 2000, status: 'stale' },
      { id: 'session-0', name: 'Earlier Root', order: 1000, status: 'stale' },
    ],
  });

  assert.deepEqual(
    projection.rows.map((row) => [row.id, row.depth, row.parentSessionId]),
    [
      ['session-0', 0, null],
      ['session-1', 0, null],
      ['session-2', 1, 'session-1'],
      ['session-3', 1, 'session-1'],
    ]
  );
});

test('keeps detached active session visible and non-active detached sessions in overflow', () => {
  const projection = projectAgentCellSessionTree({
    activeSessionId: 'detached-active',
    sessions: [
      { id: 'detached-active', status: 'detached' },
      { id: 'detached-hidden', status: 'detached' },
      { id: 'closed-1', status: 'closed' },
    ],
  });

  assert.deepEqual(
    projection.rows.map((row) => row.id),
    ['detached-active']
  );
  assert.deepEqual(
    projection.overflowDetachedSessions.map((session) => session.id),
    ['detached-hidden']
  );
  assert.deepEqual(
    projection.overflowClosedSessions.map((session) => session.id),
    ['closed-1']
  );
});

test('promotes visible descendants when stored parent is hidden', () => {
  const projection = projectAgentCellSessionTree({
    activeSessionId: 'root-visible',
    sessions: [
      { id: 'root-visible', status: 'active' },
      { id: 'detached-parent', status: 'detached', parentSessionId: 'root-visible' },
      { id: 'child-visible', status: 'stale', parentSessionId: 'detached-parent' },
    ],
  });

  assert.deepEqual(
    projection.rows.map((row) => [row.id, row.parentSessionId, row.depth]),
    [
      ['root-visible', null, 0],
      ['child-visible', 'root-visible', 1],
    ]
  );
});
