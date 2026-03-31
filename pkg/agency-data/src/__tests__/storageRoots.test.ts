import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getCellOwnerRoot,
  getRepoAgencyDir,
  requireOwnerStorage,
  resolveOwnerStorage,
} from '../repositories/storageRoots';

test('resolveOwnerStorage prefers canonical project/cell ownership when project root is known', () => {
  const project = resolveOwnerStorage(
    {
      projectRootPath: '/repo',
      worktreePath: '/repo/.worktrees/cell-a',
    },
    'project'
  );
  assert.equal(project.mode, 'canonical');
  assert.equal(project.ownerRoot, '/repo/.agency');

  const cell = resolveOwnerStorage(
    {
      projectRootPath: '/repo',
      cellId: 'cell-a',
      worktreePath: '/repo/.worktrees/cell-a',
    },
    'cell'
  );
  assert.equal(cell.mode, 'canonical');
  assert.equal(cell.ownerRoot, '/repo/.agency/cells/cell-a');
});

test('resolveOwnerStorage falls back to legacy worktree ownership when canonical owner keys are absent', () => {
  const project = resolveOwnerStorage(
    {
      worktreePath: '/repo/.worktrees/cell-a',
    },
    'project'
  );
  assert.equal(project.mode, 'legacy');
  assert.equal(project.ownerRoot, '/repo/.worktrees/cell-a/.agency');

  const cell = resolveOwnerStorage(
    {
      worktreePath: '/repo/.worktrees/cell-a',
    },
    'cell'
  );
  assert.equal(cell.mode, 'legacy');
  assert.equal(cell.ownerRoot, '/repo/.worktrees/cell-a/.agency');
});

test('requireOwnerStorage rejects missing owner context with explicit errors', () => {
  assert.throws(
    () => requireOwnerStorage({}, 'project'),
    /worktreePath or projectRootPath is required/
  );
  assert.throws(
    () => requireOwnerStorage({ projectRootPath: '/repo' }, 'cell'),
    /worktreePath or projectRootPath \+ cellId is required/
  );
});

test('helper path builders normalize repo and cell roots consistently', () => {
  assert.equal(getRepoAgencyDir('/repo'), '/repo/.agency');
  assert.equal(getCellOwnerRoot('/repo', 'cell.alpha'), '/repo/.agency/cells/cell.alpha');
});

test('cell owner resolution rejects dot-only path traversal segments', () => {
  assert.equal(getCellOwnerRoot('/repo', '.'), '');
  assert.equal(getCellOwnerRoot('/repo', '..'), '');
  assert.throws(
    () =>
      requireOwnerStorage(
        {
          projectRootPath: '/repo',
          cellId: '..',
        },
        'cell'
      ),
    /worktreePath or projectRootPath \+ cellId is required/
  );
});
