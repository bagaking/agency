import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import yaml from 'js-yaml';

import {
  createHilItem,
  getHilIndexPath,
  listHilItems,
} from '../repositories/hilRepository';

async function createTempDir(prefix: string) {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

test('createHilItem stores repo-owned HIL artifacts under the cell store', async (t) => {
  const repoRoot = await createTempDir('agency-hil-repo-');
  t.after(async () => {
    await fs.rm(repoRoot, { recursive: true, force: true });
  });

  const item = await createHilItem({
    repoRootPath: repoRoot,
    cellId: 'cell-1',
    kind: 'comment',
    body: 'repo-owned comment',
    anchor: {
      file: 'src/app.ts',
      line: 3,
      column: 1,
    },
  });

  const indexPath = getHilIndexPath({ repoRootPath: repoRoot, cellId: 'cell-1' });
  const raw = await fs.readFile(indexPath, 'utf8');
  const parsed = (yaml.load(raw) || {}) as Record<string, any>;

  assert.equal(parsed.items?.[0]?.id, item.id);
  assert.match(indexPath, /\/\.agency\/cells\/cell-1\/hil\/index\.yaml$/);

  const listed = await listHilItems({
    repoRootPath: repoRoot,
    cellId: 'cell-1',
    kind: 'comment',
  });
  assert.equal(listed.length, 1);
  assert.equal(listed[0]?.body, 'repo-owned comment');
});

test('listHilItems migrates legacy worktree HIL state into repo-owned cell storage', async (t) => {
  const repoRoot = await createTempDir('agency-hil-migrate-repo-');
  const worktreePath = path.join(repoRoot, 'worktrees', 'cell-a');
  t.after(async () => {
    await fs.rm(repoRoot, { recursive: true, force: true });
  });

  await fs.mkdir(path.dirname(worktreePath), { recursive: true });
  await fs.mkdir(path.dirname(getHilIndexPath(worktreePath)), { recursive: true });
  await fs.writeFile(
    getHilIndexPath(worktreePath),
    yaml.dump({
      version: 1,
      items: [
        {
          id: 'legacy-comment',
          kind: 'comment',
          status: 'open',
          createdAt: '2026-03-31T00:00:00.000Z',
          body: 'legacy body',
          anchor: { file: 'src/legacy.ts', line: 4, column: 1 },
          meta: {},
        },
      ],
    }),
    'utf8'
  );

  const listed = await listHilItems({
    repoRootPath: repoRoot,
    cellId: 'cell-a',
    worktreePath,
    kind: 'comment',
  });

  assert.equal(listed.length, 1);
  assert.equal(listed[0]?.id, 'legacy-comment');

  const repoOwnedIndexPath = getHilIndexPath({ repoRootPath: repoRoot, cellId: 'cell-a' });
  const migratedRaw = await fs.readFile(repoOwnedIndexPath, 'utf8');
  assert.match(migratedRaw, /legacy-comment/);
});
