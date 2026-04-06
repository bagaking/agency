import assert from 'node:assert/strict';
import test from 'node:test';

import { canCellStartRuntime, resolveCellRuntimeRootPath } from '../cellRuntimeRoot';

test('resolveCellRuntimeRootPath prefers attached worktree paths', () => {
  assert.equal(
    resolveCellRuntimeRootPath({
      attachmentState: 'attached',
      attachedWorktreePath: '/repo/.worktrees/feature',
      projectRoot: '/repo',
    }),
    '/repo/.worktrees/feature'
  );
});

test('resolveCellRuntimeRootPath falls back to project root for branch-only cells', () => {
  assert.equal(
    resolveCellRuntimeRootPath({
      attachmentState: 'branch_only',
      attachedWorktreePath: '',
      projectRoot: '/repo',
    }),
    '/repo'
  );
  assert.equal(
    canCellStartRuntime({
      attachmentState: 'branch_only',
      projectRoot: '/repo',
    }),
    true
  );
});
