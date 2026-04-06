import assert from 'node:assert/strict';
import test from 'node:test';

import { buildTerminalStartPayload } from '../terminalStartPayload';

test('buildTerminalStartPayload includes project root for terminal re-resolution', () => {
  assert.deepEqual(
    buildTerminalStartPayload({
      cell: {
        id: 'main',
        projectRoot: '/repo',
      },
      sessionId: 'cli-session',
      worktreePath: '/stale/worktree',
      mode: 'shell',
    }),
    {
      cellId: 'main',
      sessionId: 'cli-session',
      worktreePath: '/stale/worktree',
      projectRoot: '/repo',
      mode: 'shell',
    }
  );
});
