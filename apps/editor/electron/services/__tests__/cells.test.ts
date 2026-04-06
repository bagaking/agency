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

test('listCells surfaces attached detached-head worktrees without reviving stale branch metadata', async (t) => {
  const repoRoot = await createTempDir('agency-cells-detached-head-');
  const attachedWorktreePath = path.join(repoRoot, '.worktrees', 'detached-head');
  await fs.mkdir(path.join(repoRoot, '.agency', 'cells', 'detached-head'), { recursive: true });
  await fs.mkdir(attachedWorktreePath, { recursive: true });
  await fs.writeFile(
    path.join(repoRoot, '.agency', 'cells', 'detached-head', 'cell.yaml'),
    [
      'version: 2',
      'id: detached-head',
      'name: Detached Head',
      'branch: feat/original-branch',
      'state: active',
      'attachmentState: attached',
      `worktreePath: ${attachedWorktreePath}`,
      `lastKnownWorktreePath: ${attachedWorktreePath}`,
    ].join('\n'),
    'utf8'
  );

  t.after(async () => {
    await fs.rm(repoRoot, { recursive: true, force: true });
  });

  await withCellsService(
    {
      listWorktrees: async () => [{ path: attachedWorktreePath, branch: '', head: 'abcdef1234567890' }],
    },
    async ({ listCells }) => {
      const cells = await listCells({ rootPath: repoRoot });
      const detachedHeadCell = cells.find((cell) => cell.id === 'detached-head');
      assert.equal(detachedHeadCell?.attachmentState, 'attached');
      assert.equal(detachedHeadCell?.branch, '');
      assert.equal(detachedHeadCell?.head, 'abcdef1234567890');
      assert.equal(detachedHeadCell?.isDetachedHead, true);
    }
  );
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

test('updateCellState allows attached cells when configured gates pass', async (t) => {
  const repoRoot = await createTempDir('agency-cells-state-attached-');
  const attachedWorktreePath = path.join(repoRoot, '.worktrees', 'gamma');
  await fs.mkdir(path.join(repoRoot, '.agency', 'cells', 'gamma'), { recursive: true });
  await fs.mkdir(attachedWorktreePath, { recursive: true });
  await fs.writeFile(
    path.join(repoRoot, '.agency', 'cells', 'gamma', 'cell.yaml'),
    [
      'version: 2',
      'id: gamma',
      'name: Gamma',
      'branch: feat/gamma',
      'state: ""',
      'attachmentState: attached',
      `worktreePath: ${attachedWorktreePath}`,
      `lastKnownWorktreePath: ${attachedWorktreePath}`,
    ].join('\n'),
    'utf8'
  );

  t.after(async () => {
    await fs.rm(repoRoot, { recursive: true, force: true });
  });

  await withCellsService(
    {
      listWorktrees: async () => [{ path: attachedWorktreePath, branch: 'feat/gamma', head: 'abc123' }],
      checkGates: async () => [],
    },
    async ({ updateCellState }) => {
      const updated = await updateCellState({
        id: 'gamma',
        rootPath: repoRoot,
        state: 'active',
      });
      assert.equal(updated.id, 'gamma');
      assert.equal(updated.state, 'active');
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
      assert.equal(created.attachmentState, 'project_root');
      assert.equal(created.attachedWorktreePath, '');
      assert.equal(created.worktreePath, '');
      assert.equal(createdWorktrees.length, 0);
    }
  );
});

test('createCell can create a project-root cell without branch or worktree materialization', async (t) => {
  const repoRoot = await createTempDir('agency-cells-project-root-');
  const createdWorktrees: Array<unknown> = [];

  t.after(async () => {
    await fs.rm(repoRoot, { recursive: true, force: true });
  });

  await withCellsService(
    {
      createWorktree: async (...args: unknown[]) => {
        createdWorktrees.push(args);
      },
    },
    async ({ createCell }) => {
      const created = await createCell({
        name: 'research-desk',
        rootPath: repoRoot,
      });

      assert.equal(created.name, 'research-desk');
      assert.equal(created.branch, '');
      assert.equal(created.attachmentState, 'project_root');
      assert.equal(created.attachedWorktreePath, '');
      assert.equal(createdWorktrees.length, 0);
      const stored = await fs.readFile(
        path.join(repoRoot, '.agency', 'cells', 'research-desk', 'cell.yaml'),
        'utf8'
      );
      assert.match(stored, /preferredRuntimeRoot: project_root/);
    }
  );
});

test('createCell binds an existing branch to its live workspace without creating a duplicate worktree', async (t) => {
  const repoRoot = await createTempDir('agency-cells-existing-branch-attached-');
  const attachedWorktreePath = path.join(repoRoot, 'repo-root');
  const createdWorktrees: Array<{ repoRoot: string; worktreePath: string; branch: string; baseBranch: string }> = [];
  await fs.mkdir(attachedWorktreePath, { recursive: true });

  t.after(async () => {
    await fs.rm(repoRoot, { recursive: true, force: true });
  });

  await withCellsService(
    {
      branchExists: async (_repoRoot: string, branch: string) => branch === 'main',
      listWorktrees: async () => [{ path: attachedWorktreePath, branch: 'main', head: 'abc123' }],
      createWorktree: async (root: string, worktreePath: string, branch: string, baseBranch: string) => {
        createdWorktrees.push({ repoRoot: root, worktreePath, branch, baseBranch });
      },
    },
    async ({ createCell }) => {
      const created = await createCell({
        name: 'mainline-review',
        existingBranch: 'main',
        rootPath: repoRoot,
      });

      assert.equal(created.branch, 'main');
      assert.equal(created.attachmentState, 'attached');
      assert.equal(created.attachedWorktreePath, attachedWorktreePath);
      assert.equal(createdWorktrees.length, 0);
    }
  );
});

test('createCell can explicitly materialize a worktree attachment for an existing project-root cell', async (t) => {
  const repoRoot = await createTempDir('agency-cells-branch-only-attachment-');
  const createdWorktrees: Array<{ repoRoot: string; worktreePath: string; branch: string; baseBranch: string }> = [];
  await fs.mkdir(path.join(repoRoot, '.agency', 'cells', 'mainline-review'), { recursive: true });
  await fs.writeFile(
    path.join(repoRoot, '.agency', 'cells', 'mainline-review', 'cell.yaml'),
    [
      'version: 2',
      'id: mainline-review',
      'name: mainline-review',
      'branch: main',
      'state: ""',
      'attachmentState: project_root',
      'worktreePath: ""',
      'lastKnownWorktreePath: ""',
    ].join('\n'),
    'utf8'
  );

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
        existingBranch: 'main',
        bindToCellId: 'mainline-review',
        rootPath: repoRoot,
      });

      assert.equal(created.id, 'mainline-review');
      assert.equal(created.branch, 'main');
      assert.equal(created.attachmentState, 'attached');
      assert.match(created.attachedWorktreePath, /\.worktrees\/mainline-review$/);
      assert.equal(createdWorktrees.length, 1);
      assert.equal(createdWorktrees[0]?.branch, 'main');
      assert.equal(createdWorktrees[0]?.baseBranch, 'main');
      const stored = await fs.readFile(
        path.join(repoRoot, '.agency', 'cells', 'mainline-review', 'cell.yaml'),
        'utf8'
      );
      assert.match(stored, /preferredRuntimeRoot: project_root/);
    }
  );
});

test('createCell can bind a branch onto an existing project-root cell without materializing a worktree', async (t) => {
  const repoRoot = await createTempDir('agency-cells-project-root-bind-branch-');
  const createdWorktrees: Array<unknown> = [];
  await fs.mkdir(path.join(repoRoot, '.agency', 'cells', 'research-desk'), { recursive: true });
  await fs.writeFile(
    path.join(repoRoot, '.agency', 'cells', 'research-desk', 'cell.yaml'),
    [
      'version: 2',
      'id: research-desk',
      'name: research-desk',
      'branch: ""',
      'state: ""',
      'attachmentState: project_root',
      'worktreePath: ""',
      'lastKnownWorktreePath: ""',
    ].join('\n'),
    'utf8'
  );

  t.after(async () => {
    await fs.rm(repoRoot, { recursive: true, force: true });
  });

  await withCellsService(
    {
      branchExists: async (_repoRoot: string, branch: string) => branch === 'main',
      createWorktree: async (...args: unknown[]) => {
        createdWorktrees.push(args);
      },
    },
    async ({ createCell }) => {
      const updated = await createCell({
        existingBranch: 'main',
        bindBranchToCellId: 'research-desk',
        rootPath: repoRoot,
      });

      assert.equal(updated.id, 'research-desk');
      assert.equal(updated.branch, 'main');
      assert.equal(updated.hasBranch, true);
      assert.equal(updated.attachmentState, 'project_root');
      assert.equal(updated.attachedWorktreePath, '');
      assert.equal(createdWorktrees.length, 0);
    }
  );
});

test('createCell keeps explicit branch binding on a project-root Cell separate from adopting an already-live worktree', async (t) => {
  const repoRoot = await createTempDir('agency-cells-project-root-bind-branch-live-worktree-');
  const liveWorktreePath = path.join(repoRoot, '.worktrees', 'main');
  await fs.mkdir(path.join(repoRoot, '.agency', 'cells', 'research-desk'), { recursive: true });
  await fs.mkdir(liveWorktreePath, { recursive: true });
  await fs.writeFile(
    path.join(repoRoot, '.agency', 'cells', 'research-desk', 'cell.yaml'),
    [
      'version: 2',
      'id: research-desk',
      'name: research-desk',
      'branch: ""',
      'state: ""',
      'attachmentState: project_root',
      'worktreePath: ""',
      'lastKnownWorktreePath: ""',
    ].join('\n'),
    'utf8'
  );

  t.after(async () => {
    await fs.rm(repoRoot, { recursive: true, force: true });
  });

  await withCellsService(
    {
      branchExists: async (_repoRoot: string, branch: string) => branch === 'main',
      listWorktrees: async () => [{ path: liveWorktreePath, branch: 'main', head: 'abc123' }],
    },
    async ({ createCell }) => {
      const updated = await createCell({
        existingBranch: 'main',
        bindBranchToCellId: 'research-desk',
        rootPath: repoRoot,
      });

      assert.equal(updated.id, 'research-desk');
      assert.equal(updated.branch, 'main');
      assert.equal(updated.hasBranch, true);
      assert.equal(updated.attachmentState, 'project_root');
      assert.equal(updated.attachedWorktreePath, '');
    }
  );
});

test('createCell attaches the requested project-root Cell when bindToCellId meets an already-live branch worktree', async (t) => {
  const repoRoot = await createTempDir('agency-cells-bind-live-worktree-to-target-');
  const liveWorktreePath = path.join(repoRoot, '.worktrees', 'main');
  await fs.mkdir(path.join(repoRoot, '.agency', 'cells', 'research-desk'), { recursive: true });
  await fs.mkdir(liveWorktreePath, { recursive: true });
  await fs.writeFile(
    path.join(repoRoot, '.agency', 'cells', 'research-desk', 'cell.yaml'),
    [
      'version: 2',
      'id: research-desk',
      'name: research-desk',
      'branch: main',
      'state: ""',
      'attachmentState: project_root',
      'preferredRuntimeRoot: project_root',
      'worktreePath: ""',
      'lastKnownWorktreePath: ""',
    ].join('\n'),
    'utf8'
  );

  t.after(async () => {
    await fs.rm(repoRoot, { recursive: true, force: true });
  });

  await withCellsService(
    {
      branchExists: async (_repoRoot: string, branch: string) => branch === 'main',
      listWorktrees: async () => [{ path: liveWorktreePath, branch: 'main', head: 'abc123' }],
    },
    async ({ createCell }) => {
      const attached = await createCell({
        existingBranch: 'main',
        bindToCellId: 'research-desk',
        rootPath: repoRoot,
      });

      assert.equal(attached.id, 'research-desk');
      assert.equal(attached.attachmentState, 'attached');
      assert.equal(attached.attachedWorktreePath, liveWorktreePath);
      const stored = await fs.readFile(
        path.join(repoRoot, '.agency', 'cells', 'research-desk', 'cell.yaml'),
        'utf8'
      );
      assert.match(stored, /worktreePath: .*\.worktrees\/main/);
    }
  );
});

test('createCell keeps project-root cells distinct instead of silently reusing the same branch-bound record', async (t) => {
  const repoRoot = await createTempDir('agency-cells-distinct-project-root-');

  t.after(async () => {
    await fs.rm(repoRoot, { recursive: true, force: true });
  });

  await withCellsService(
    {
      branchExists: async (_repoRoot: string, branch: string) => branch === 'main',
    },
    async ({ createCell, listCells }) => {
      const first = await createCell({
        name: 'mainline-review',
        existingBranch: 'main',
        rootPath: repoRoot,
      });
      const second = await createCell({
        name: 'mainline-review',
        existingBranch: 'main',
        rootPath: repoRoot,
      });

      assert.equal(first.id, 'mainline-review');
      assert.equal(second.id, 'mainline-review-2');
      assert.equal(first.attachmentState, 'project_root');
      assert.equal(second.attachmentState, 'project_root');

      const cells = await listCells({ rootPath: repoRoot });
      const projectRootCells = cells.filter((cell) => cell.attachmentState === 'project_root');
      assert.equal(projectRootCells.length, 2);
    }
  );
});

test('createCell creates distinct project-root cells with duplicate names instead of overwriting the existing record', async (t) => {
  const repoRoot = await createTempDir('agency-cells-distinct-name-');

  t.after(async () => {
    await fs.rm(repoRoot, { recursive: true, force: true });
  });

  await withCellsService({}, async ({ createCell, listCells }) => {
    const first = await createCell({
      name: 'research-desk',
      rootPath: repoRoot,
    });
    const second = await createCell({
      name: 'research-desk',
      rootPath: repoRoot,
    });

    assert.equal(first.id, 'research-desk');
    assert.equal(second.id, 'research-desk-2');

    const cells = await listCells({ rootPath: repoRoot });
    assert.equal(cells.filter((cell) => cell.attachmentState === 'project_root').length, 2);
  });
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

test('listCells keeps unmanaged worktrees untracked and exposes them via listUnmanagedWorktrees', async (t) => {
  const repoRoot = await createTempDir('agency-cells-unmanaged-');
  const unmanagedWorktreePath = path.join(repoRoot, '.worktrees', 'scratch');
  await fs.mkdir(unmanagedWorktreePath, { recursive: true });

  t.after(async () => {
    await fs.rm(repoRoot, { recursive: true, force: true });
  });

  await withCellsService(
    {
      listWorktrees: async () => [{ path: unmanagedWorktreePath, branch: 'feat/scratch', head: 'abc123' }],
    },
    async ({ listCells, listUnmanagedWorktrees }) => {
      const cells = await listCells({ rootPath: repoRoot });
      assert.equal(cells.length, 0);

      const unmanaged = await listUnmanagedWorktrees({ rootPath: repoRoot });
      assert.equal(unmanaged.length, 1);
      assert.equal(unmanaged[0].type, 'unmanaged_worktree');
      assert.equal(unmanaged[0].worktreePath, unmanagedWorktreePath);
      assert.equal(unmanaged[0].branch, 'feat/scratch');
      assert.equal(unmanaged[0].tracked, false);
    }
  );
});

test('listUnmanagedWorktrees returns deterministic branch-based bind suggestions', async (t) => {
  const repoRoot = await createTempDir('agency-cells-unmanaged-suggest-');
  const unmanagedWorktreePath = path.join(repoRoot, '.worktrees', 'incoming');
  const detachedPath = path.join(repoRoot, '.worktrees', 'detached-beta');
  await fs.mkdir(path.join(repoRoot, '.agency', 'cells', 'detached-beta'), { recursive: true });
  await fs.mkdir(unmanagedWorktreePath, { recursive: true });
  await fs.writeFile(
    path.join(repoRoot, '.agency', 'cells', 'detached-beta', 'cell.yaml'),
    [
      'version: 2',
      'id: detached-beta',
      'name: Detached Beta',
      'branch: feat/beta',
      'state: ""',
      'attachmentState: detached',
      'worktreePath: ""',
      `lastKnownWorktreePath: ${detachedPath}`,
    ].join('\n'),
    'utf8'
  );

  t.after(async () => {
    await fs.rm(repoRoot, { recursive: true, force: true });
  });

  await withCellsService(
    {
      listWorktrees: async () => [{ path: unmanagedWorktreePath, branch: 'feat/beta', head: 'abc123' }],
    },
    async ({ listUnmanagedWorktrees }) => {
      const unmanaged = await listUnmanagedWorktrees({ rootPath: repoRoot });
      assert.equal(unmanaged.length, 1);
      assert.equal(unmanaged[0].bindSuggestion?.kind, 'unique_branch_match');
      assert.equal(unmanaged[0].bindSuggestion?.cellId, 'detached-beta');
    }
  );
});

test('listUnmanagedWorktrees marks ambiguous branch suggestions without auto-selection', async (t) => {
  const repoRoot = await createTempDir('agency-cells-unmanaged-ambiguous-');
  const unmanagedWorktreePath = path.join(repoRoot, '.worktrees', 'incoming');
  const detachedPaths = [
    path.join(repoRoot, '.worktrees', 'detached-beta-a'),
    path.join(repoRoot, '.worktrees', 'detached-beta-b'),
  ];
  await fs.mkdir(unmanagedWorktreePath, { recursive: true });
  for (const id of ['detached-beta-a', 'detached-beta-b']) {
    await fs.mkdir(path.join(repoRoot, '.agency', 'cells', id), { recursive: true });
  }
  await fs.writeFile(
    path.join(repoRoot, '.agency', 'cells', 'detached-beta-a', 'cell.yaml'),
    [
      'version: 2',
      'id: detached-beta-a',
      'name: Detached Beta A',
      'branch: feat/beta',
      'state: ""',
      'attachmentState: detached',
      'worktreePath: ""',
      `lastKnownWorktreePath: ${detachedPaths[0]}`,
    ].join('\n'),
    'utf8'
  );
  await fs.writeFile(
    path.join(repoRoot, '.agency', 'cells', 'detached-beta-b', 'cell.yaml'),
    [
      'version: 2',
      'id: detached-beta-b',
      'name: Detached Beta B',
      'branch: feat/beta',
      'state: ""',
      'attachmentState: detached',
      'worktreePath: ""',
      `lastKnownWorktreePath: ${detachedPaths[1]}`,
    ].join('\n'),
    'utf8'
  );

  t.after(async () => {
    await fs.rm(repoRoot, { recursive: true, force: true });
  });

  await withCellsService(
    {
      listWorktrees: async () => [{ path: unmanagedWorktreePath, branch: 'feat/beta', head: 'abc123' }],
    },
    async ({ listUnmanagedWorktrees }) => {
      const unmanaged = await listUnmanagedWorktrees({ rootPath: repoRoot });
      assert.equal(unmanaged.length, 1);
      assert.equal(unmanaged[0].bindSuggestion?.kind, 'ambiguous_branch');
      assert.deepEqual(
        [...(unmanaged[0].bindSuggestion?.candidateCellIds || [])].sort(),
        ['detached-beta-a', 'detached-beta-b']
      );
    }
  );
});

test('ignoreUnmanagedWorktree persists user-local ignore state per repository', async (t) => {
  const repoRoot = await createTempDir('agency-cells-unmanaged-ignore-');
  const storeDir = await createTempDir('agency-cells-unmanaged-store-');
  const unmanagedWorktreePath = path.join(repoRoot, '.worktrees', 'ignored-candidate');
  await fs.mkdir(unmanagedWorktreePath, { recursive: true });
  const previousStoreDir = process.env.AGENCY_UNMANAGED_WORKTREE_STORE_DIR;
  process.env.AGENCY_UNMANAGED_WORKTREE_STORE_DIR = storeDir;

  t.after(async () => {
    if (previousStoreDir === undefined) {
      delete process.env.AGENCY_UNMANAGED_WORKTREE_STORE_DIR;
    } else {
      process.env.AGENCY_UNMANAGED_WORKTREE_STORE_DIR = previousStoreDir;
    }
    await fs.rm(repoRoot, { recursive: true, force: true });
    await fs.rm(storeDir, { recursive: true, force: true });
  });

  await withCellsService(
    {
      listWorktrees: async () => [{ path: unmanagedWorktreePath, branch: 'feat/ignored', head: 'abc123' }],
    },
    async ({ listUnmanagedWorktrees, ignoreUnmanagedWorktree, clearIgnoredUnmanagedWorktrees }) => {
      const beforeIgnore = await listUnmanagedWorktrees({ rootPath: repoRoot });
      assert.equal(beforeIgnore.length, 1);

      const afterIgnore = await ignoreUnmanagedWorktree({
        rootPath: repoRoot,
        worktreePath: unmanagedWorktreePath,
        ignored: true,
      });
      assert.equal(afterIgnore.length, 1);
      assert.equal(afterIgnore[0].ignored, true);

      const defaultList = await listUnmanagedWorktrees({ rootPath: repoRoot });
      assert.equal(defaultList.length, 0);

      const includeIgnored = await listUnmanagedWorktrees({
        rootPath: repoRoot,
        includeIgnored: true,
      });
      assert.equal(includeIgnored.length, 1);
      assert.equal(includeIgnored[0].ignored, true);

      const cleared = await clearIgnoredUnmanagedWorktrees({ rootPath: repoRoot });
      assert.equal(Array.isArray(cleared), true);
      assert.equal(cleared.length, 0);

      const afterClear = await listUnmanagedWorktrees({ rootPath: repoRoot });
      assert.equal(afterClear.length, 1);
      assert.equal(afterClear[0].ignored, false);
    }
  );
});

test('createCell can bind an unmanaged worktree to an existing detached Cell record', async (t) => {
  const repoRoot = await createTempDir('agency-cells-bind-unmanaged-');
  const unmanagedWorktreePath = path.join(repoRoot, '.worktrees', 'incoming-beta');
  const detachedPath = path.join(repoRoot, '.worktrees', 'detached-beta');
  await fs.mkdir(path.join(repoRoot, '.agency', 'cells', 'detached-beta'), { recursive: true });
  await fs.mkdir(unmanagedWorktreePath, { recursive: true });
  await fs.writeFile(
    path.join(repoRoot, '.agency', 'cells', 'detached-beta', 'cell.yaml'),
    [
      'version: 2',
      'id: detached-beta',
      'name: Detached Beta',
      'branch: feat/beta',
      'state: ""',
      'attachmentState: detached',
      'worktreePath: ""',
      `lastKnownWorktreePath: ${detachedPath}`,
    ].join('\n'),
    'utf8'
  );

  t.after(async () => {
    await fs.rm(repoRoot, { recursive: true, force: true });
  });

  await withCellsService(
    {
      listWorktrees: async () => [{ path: unmanagedWorktreePath, branch: 'feat/beta', head: 'abc123' }],
    },
    async ({ createCell, listCells }) => {
      const rebound = await createCell({
        rootPath: repoRoot,
        reusePath: unmanagedWorktreePath,
        bindToCellId: 'detached-beta',
      });

      assert.equal(rebound.id, 'detached-beta');
      assert.equal(rebound.attachmentState, 'attached');
      assert.equal(rebound.attachedWorktreePath, unmanagedWorktreePath);

      const cells = await listCells({ rootPath: repoRoot });
      const boundCell = cells.find((cell) => cell.id === 'detached-beta');
      assert.equal(boundCell?.attachedWorktreePath, unmanagedWorktreePath);
    }
  );
});

test('createCell rejects binding an unmanaged worktree to an already attached Cell', async (t) => {
  const repoRoot = await createTempDir('agency-cells-bind-attached-');
  const unmanagedWorktreePath = path.join(repoRoot, '.worktrees', 'incoming-gamma');
  const attachedPath = path.join(repoRoot, '.worktrees', 'attached-gamma');
  await fs.mkdir(path.join(repoRoot, '.agency', 'cells', 'attached-gamma'), { recursive: true });
  await fs.mkdir(unmanagedWorktreePath, { recursive: true });
  await fs.mkdir(attachedPath, { recursive: true });
  await fs.writeFile(
    path.join(repoRoot, '.agency', 'cells', 'attached-gamma', 'cell.yaml'),
    [
      'version: 2',
      'id: attached-gamma',
      'name: Attached Gamma',
      'branch: feat/gamma',
      'state: ""',
      'attachmentState: attached',
      `worktreePath: ${attachedPath}`,
      `lastKnownWorktreePath: ${attachedPath}`,
    ].join('\n'),
    'utf8'
  );

  t.after(async () => {
    await fs.rm(repoRoot, { recursive: true, force: true });
  });

  await withCellsService(
    {
      listWorktrees: async () => [
        { path: attachedPath, branch: 'feat/gamma', head: 'old123' },
        { path: unmanagedWorktreePath, branch: 'feat/gamma', head: 'new123' },
      ],
    },
    async ({ createCell }) => {
      await assert.rejects(
        () =>
          createCell({
            rootPath: repoRoot,
            reusePath: unmanagedWorktreePath,
            bindToCellId: 'attached-gamma',
          }),
        /must not already have a live attached worktree/
      );
    }
  );
});

test('listCells tolerates ignored-worktree store write failures during prune', async (t) => {
  const repoRoot = await createTempDir('agency-cells-prune-resilient-');
  const storeDir = '/dev/null';
  const previousStoreDir = process.env.AGENCY_UNMANAGED_WORKTREE_STORE_DIR;
  process.env.AGENCY_UNMANAGED_WORKTREE_STORE_DIR = storeDir;

  t.after(async () => {
    if (previousStoreDir === undefined) {
      delete process.env.AGENCY_UNMANAGED_WORKTREE_STORE_DIR;
    } else {
      process.env.AGENCY_UNMANAGED_WORKTREE_STORE_DIR = previousStoreDir;
    }
    await fs.rm(repoRoot, { recursive: true, force: true });
  });

  await withCellsService(
    {
      listWorktrees: async () => [],
    },
    async ({ listCells, listUnmanagedWorktrees }) => {
      const cells = await listCells({ rootPath: repoRoot });
      const unmanaged = await listUnmanagedWorktrees({ rootPath: repoRoot });
      assert.deepEqual(cells, []);
      assert.deepEqual(unmanaged, []);
    }
  );
});

export {};
