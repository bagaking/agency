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

test('resolveCellRuntimeRootPath falls back to project root for project-root cells', () => {
  assert.equal(
    resolveCellRuntimeRootPath({
      attachmentState: 'project_root',
      attachedWorktreePath: '',
      projectRoot: '/repo',
    }),
    '/repo'
  );
  assert.equal(
    canCellStartRuntime({
      attachmentState: 'project_root',
      projectRoot: '/repo',
    }),
    true
  );
});
