const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const Module = require('node:module');
const yaml = require('js-yaml');

const helperPath = require.resolve('../scopedConfigPaths.ts');

async function createTempDir(prefix) {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

async function withScopedConfigPaths({ repoRoot }, run) {
  const originalLoad = Module._load;
  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === './projectRoot') {
      return {
        resolveProjectRoot: async ({ rootPath = '', worktreePath = '' } = {}) => {
          if (rootPath) {
            return path.resolve(rootPath);
          }
          if (worktreePath) {
            return path.resolve(worktreePath);
          }
          return path.resolve(repoRoot);
        },
      };
    }
    return originalLoad.call(this, request, parent, isMain);
  };
  delete require.cache[helperPath];
  const helper = require(helperPath);
  try {
    await run(helper);
  } finally {
    delete require.cache[helperPath];
    Module._load = originalLoad;
  }
}

test('resolveProjectConfigPath respects repo root and filenames', async (t) => {
  const repoRoot = await createTempDir('agency-scope-root-');
  t.after(async () => {
    await fs.rm(repoRoot, { recursive: true, force: true });
  });
  const agencyDir = path.join(repoRoot, '.agency');
  await fs.mkdir(agencyDir, { recursive: true });
  const settingsPath = path.join(agencyDir, 'scoped.yaml');
  await fs.writeFile(settingsPath, 'foo: bar\n', 'utf8');

  await withScopedConfigPaths({ repoRoot }, async (scoped) => {
    const result = await scoped.resolveProjectConfigPath({
      rootPath: repoRoot,
      filenames: ['scoped.yaml'],
    });
    assert.equal(result.filePath, settingsPath);
  });
});

test('resolveAgentConfigPath builds cell file path for explicit cell id', async (t) => {
  const repoRoot = await createTempDir('agency-scope-cell-');
  t.after(async () => {
    await fs.rm(repoRoot, { recursive: true, force: true });
  });
  const cellId = 'cell-alpha';
  const cellDir = path.join(repoRoot, '.agency', 'cells', cellId);
  await fs.mkdir(cellDir, { recursive: true });

  await withScopedConfigPaths({ repoRoot }, async (scoped) => {
    const result = await scoped.resolveAgentConfigPath({
      rootPath: repoRoot,
      cellId,
      filename: 'app.yaml',
    });
    assert.equal(result.filePath, path.join(cellDir, 'app.yaml'));
  });
});

test('resolveAgentConfigPath discovers cell by worktree path record', async (t) => {
  const repoRoot = await createTempDir('agency-scope-worktree-');
  t.after(async () => {
    await fs.rm(repoRoot, { recursive: true, force: true });
  });
  const worktreePath = path.join(repoRoot, 'worktree-a');
  await fs.mkdir(worktreePath, { recursive: true });
  const normalizedCellId = 'cell-record';
  const cellDir = path.join(repoRoot, '.agency', 'cells', normalizedCellId);
  await fs.mkdir(cellDir, { recursive: true });
  const record = {
    id: normalizedCellId,
    worktreePath,
  };
  await fs.writeFile(path.join(cellDir, 'cell.yaml'), yaml.dump(record), 'utf8');

  await withScopedConfigPaths({ repoRoot }, async (scoped) => {
    const resolved = await scoped.resolveCellIdForWorktree(repoRoot, worktreePath);
    assert.equal(resolved, normalizedCellId);

    const agent = await scoped.resolveAgentConfigPath({
      rootPath: repoRoot,
      worktreePath,
      filename: 'prompt.yaml',
    });
    assert.equal(agent.cellDir, cellDir);
    assert.equal(agent.filePath, path.join(cellDir, 'prompt.yaml'));
  });
});

test('resolveLegacyAgentConfigPath returns worktree-local path', (t) => {
  const worktreePath = '/tmp/worktree';
  const result = require('../scopedConfigPaths.ts').resolveLegacyAgentConfigPath(
    worktreePath,
    'prefix-',
    '.yaml'
  );
  assert.equal(result, path.join(worktreePath, '.agency', 'prefix-worktree.yaml'));
});

export {};
