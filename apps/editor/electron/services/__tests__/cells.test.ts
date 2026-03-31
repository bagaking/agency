const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const Module = require('node:module');

const serviceModulePath = require.resolve('../cells.ts');

async function createTempDir(prefix) {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

async function withCellsService(options, run) {
  const originalLoad = Module._load;
  const listWorktrees = options?.listWorktrees || (async () => []);
  const checkGates = options?.checkGates || (async () => []);
  const createWorktree = options?.createWorktree || (async () => {});
  const branchExists = options?.branchExists || (async () => false);
  const resolveBaseBranch = options?.resolveBaseBranch || (async () => 'main');

  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === './git') {
      return {
        getRepoRoot: async (cwd) => path.resolve(String(cwd || '')),
        listWorktrees,
        resolveBaseBranch,
        createWorktree,
        branchExists,
      };
    }
    if (request === './projectRoot') {
      return {
        resolveProjectRoot: async ({ rootPath }: any = {}) => path.resolve(String(rootPath || '')),
      };
    }
    if (request === './worktreeLinks') {
      return {
        readConfig: async () => ({ autoLinkOnCreate: false, links: [] }),
        applyAllLinks: async () => {},
      };
    }
    if (request === './gates') {
      return {
        checkGates,
      };
    }
    return originalLoad.call(this, request, parent, isMain);
  };

  delete require.cache[serviceModulePath];
  const service = require(serviceModulePath);
  try {
    await run(service);
  } finally {
    delete require.cache[serviceModulePath];
    Module._load = originalLoad;
  }
}

test('listCells imports legacy worktree lifecycle into repo-owned cell store', async (t) => {
  const repoRoot = await createTempDir('agency-cells-repo-');
  const worktreePath = path.join(repoRoot, '.worktrees', 'alpha');
  await fs.mkdir(path.join(worktreePath, '.agency'), { recursive: true });
  await fs.writeFile(
    path.join(worktreePath, '.agency', 'cell-alpha.yaml'),
    ['id: alpha', 'name: Alpha', 'state: active', 'avatar: atlas'].join('\n'),
    'utf8'
  );

  t.after(async () => {
    await fs.rm(repoRoot, { recursive: true, force: true });
  });

  await withCellsService(
    {
      listWorktrees: async () => [{ path: worktreePath, branch: 'feat/alpha', head: 'abc123' }],
    },
    async ({ listCells }) => {
      const cells = await listCells({ rootPath: repoRoot });
      assert.equal(cells.length, 1);
      assert.equal(cells[0].id, 'alpha');
      assert.equal(cells[0].attachmentState, 'attached');
      assert.equal(cells[0].attachedWorktreePath, worktreePath);
      assert.equal(cells[0].state, 'active');
      const repoOwnedRecordPath = path.join(repoRoot, '.agency', 'cells', 'alpha', 'cell.yaml');
      const repoOwnedRecord = await fs.readFile(repoOwnedRecordPath, 'utf8');
      assert.match(repoOwnedRecord, /attachmentState: attached/);
      assert.match(repoOwnedRecord, new RegExp(`worktreePath: ${worktreePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
    }
  );
});

test('listCells keeps repo-owned cells visible when the attachment is detached or missing', async (t) => {
  const repoRoot = await createTempDir('agency-cells-detached-');
  const detachedWorktreePath = path.join(repoRoot, '.worktrees', 'detached-cell');
  await fs.mkdir(path.join(repoRoot, '.agency', 'cells', 'detached-cell'), { recursive: true });
  await fs.mkdir(detachedWorktreePath, { recursive: true });
  await fs.writeFile(
    path.join(repoRoot, '.agency', 'cells', 'detached-cell', 'cell.yaml'),
    [
      'version: 2',
      'id: detached-cell',
      'name: Detached Cell',
      'branch: refactor/detached',
      'state: draft',
      'attachmentState: attached',
      'worktreePath: ""',
      `lastKnownWorktreePath: ${detachedWorktreePath}`,
    ].join('\n'),
    'utf8'
  );
  await fs.mkdir(path.join(repoRoot, '.agency', 'cells', 'missing-cell'), { recursive: true });
  await fs.writeFile(
    path.join(repoRoot, '.agency', 'cells', 'missing-cell', 'cell.yaml'),
    [
      'version: 2',
      'id: missing-cell',
      'name: Missing Cell',
      'branch: refactor/missing',
      'state: draft',
      'attachmentState: attached',
      'worktreePath: ""',
      `lastKnownWorktreePath: ${path.join(repoRoot, '.worktrees', 'missing-cell')}`,
    ].join('\n'),
    'utf8'
  );

  t.after(async () => {
    await fs.rm(repoRoot, { recursive: true, force: true });
  });

  await withCellsService({}, async ({ listCells }) => {
    const cells = await listCells({ rootPath: repoRoot });
    const detachedCell = cells.find((cell) => cell.id === 'detached-cell');
    const missingCell = cells.find((cell) => cell.id === 'missing-cell');
    assert.equal(detachedCell?.attachmentState, 'detached');
    assert.equal(detachedCell?.attachedWorktreePath, '');
    assert.equal(missingCell?.attachmentState, 'missing');
    assert.equal(missingCell?.attachedWorktreePath, '');
  });
});

test('updateCellState updates detached cells without running attached-worktree gates', async (t) => {
  const repoRoot = await createTempDir('agency-cells-state-');
  const detachedWorktreePath = path.join(repoRoot, '.worktrees', 'beta');
  await fs.mkdir(path.join(repoRoot, '.agency', 'cells', 'beta'), { recursive: true });
  await fs.mkdir(detachedWorktreePath, { recursive: true });
  await fs.writeFile(
    path.join(repoRoot, '.agency', 'cells', 'beta', 'cell.yaml'),
    [
      'version: 2',
      'id: beta',
      'name: Beta',
      'branch: refactor/beta',
      'state: draft',
      'attachmentState: detached',
      'worktreePath: ""',
      `lastKnownWorktreePath: ${detachedWorktreePath}`,
    ].join('\n'),
    'utf8'
  );

  t.after(async () => {
    await fs.rm(repoRoot, { recursive: true, force: true });
  });

  await withCellsService(
    {
      checkGates: async () => {
        throw new Error('attached gates should not run for detached cells');
      },
    },
    async ({ updateCellState }) => {
      const updated = await updateCellState({
        id: 'beta',
        rootPath: repoRoot,
        state: 'archived',
      });
      assert.equal(updated.id, 'beta');
      assert.equal(updated.state, 'archived');
      assert.equal(updated.attachmentState, 'detached');
      const stored = await fs.readFile(
        path.join(repoRoot, '.agency', 'cells', 'beta', 'cell.yaml'),
        'utf8'
      );
      assert.match(stored, /state: archived/);
    }
  );
});

test('createCell can bind an existing branch without renaming it', async (t) => {
  const repoRoot = await createTempDir('agency-cells-existing-branch-');
  const createdWorktrees: Array<{ repoRoot: string; worktreePath: string; branch: string; baseBranch: string }> = [];

  t.after(async () => {
    await fs.rm(repoRoot, { recursive: true, force: true });
  });

  await withCellsService(
    {
      branchExists: async (_repoRoot: string, branch: string) => branch === 'main',
      createWorktree: async (root: string, worktreePath: string, branch: string, baseBranch: string) => {
        createdWorktrees.push({ repoRoot: root, worktreePath, branch, baseBranch });
        await fs.mkdir(worktreePath, { recursive: true });
      },
    },
    async ({ createCell }) => {
      const created = await createCell({
        name: 'mainline-review',
        existingBranch: 'main',
        rootPath: repoRoot,
      });

      assert.equal(created.branch, 'main');
      assert.equal(created.name, 'mainline-review');
      assert.match(created.worktreePath, /\.worktrees\/mainline-review$/);
      assert.equal(createdWorktrees.length, 1);
      assert.equal(createdWorktrees[0]?.branch, 'main');
      assert.equal(createdWorktrees[0]?.baseBranch, 'main');
    }
  );
});

test('createCell honors an explicit base branch when creating a new branch', async (t) => {
  const repoRoot = await createTempDir('agency-cells-base-branch-');
  const createdWorktrees: Array<{ branch: string; baseBranch: string }> = [];

  t.after(async () => {
    await fs.rm(repoRoot, { recursive: true, force: true });
  });

  await withCellsService(
    {
      branchExists: async (_repoRoot: string, branch: string) => branch === 'main',
      createWorktree: async (_root: string, worktreePath: string, branch: string, baseBranch: string) => {
        createdWorktrees.push({ branch, baseBranch });
        await fs.mkdir(worktreePath, { recursive: true });
      },
    },
    async ({ createCell }) => {
      const created = await createCell({
        name: 'alpha',
        branch: 'feat/alpha',
        baseBranch: 'main',
        rootPath: repoRoot,
      });

      assert.equal(created.branch, 'feat/alpha');
      assert.equal(createdWorktrees.length, 1);
      assert.equal(createdWorktrees[0]?.branch, 'feat/alpha');
      assert.equal(createdWorktrees[0]?.baseBranch, 'main');
    }
  );
});

export {};
