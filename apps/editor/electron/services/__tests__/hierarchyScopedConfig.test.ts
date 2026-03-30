const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { execFileSync } = require('node:child_process');
const yaml = require('js-yaml');

const { getSessionNamingSettings } = require('../sessionNaming');
const { getResolvedTerminusSettings } = require('../terminusSettings');

async function createTempDir(prefix) {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

async function initRepo(repoRoot) {
  execFileSync('git', ['init'], {
    cwd: repoRoot,
    stdio: 'ignore',
  });
}

function commitInitialTree(repoRoot) {
  execFileSync('git', ['config', 'user.name', 'Agency Test'], {
    cwd: repoRoot,
    stdio: 'ignore',
  });
  execFileSync('git', ['config', 'user.email', 'agency@example.com'], {
    cwd: repoRoot,
    stdio: 'ignore',
  });
  execFileSync('git', ['add', '.'], {
    cwd: repoRoot,
    stdio: 'ignore',
  });
  execFileSync('git', ['commit', '-m', 'init'], {
    cwd: repoRoot,
    stdio: 'ignore',
  });
}

test('project-scoped hierarchy config resolves from repository root without a selected cell', async (t) => {
  const repoRoot = await createTempDir('agency-hierarchy-project-root-');
  const userDataPath = await createTempDir('agency-hierarchy-userdata-');
  const previousUserData = process.env.AGENCY_USER_DATA_PATH;

  process.env.AGENCY_USER_DATA_PATH = userDataPath;
  await initRepo(repoRoot);
  await fs.mkdir(path.join(repoRoot, '.agency'), { recursive: true });
  await fs.writeFile(
    path.join(repoRoot, '.agency', 'session-naming.yaml'),
    yaml.dump({
      rule: '{project}-{profile}-{absolute}',
      nameLists: {
        nouns: ['atlas'],
      },
    }),
    'utf8'
  );

  t.after(async () => {
    if (previousUserData === undefined) {
      delete process.env.AGENCY_USER_DATA_PATH;
    } else {
      process.env.AGENCY_USER_DATA_PATH = previousUserData;
    }
    await fs.rm(repoRoot, { recursive: true, force: true });
    await fs.rm(userDataPath, { recursive: true, force: true });
  });

  const settings = await getSessionNamingSettings({
    scope: 'project',
    projectRoot: repoRoot,
  });

  assert.equal(settings.rule, '{project}-{profile}-{absolute}');
  assert.deepEqual(settings.nameLists?.nouns || [], ['atlas']);
});

test('project-scoped hierarchy config falls back to the newest legacy worktree file when canonical storage is absent', async (t) => {
  const repoRoot = await createTempDir('agency-hierarchy-project-legacy-');
  const userDataPath = await createTempDir('agency-hierarchy-userdata-');
  const worktreePath = path.join(repoRoot, '.worktrees', 'cell-one');
  const previousUserData = process.env.AGENCY_USER_DATA_PATH;

  process.env.AGENCY_USER_DATA_PATH = userDataPath;
  await initRepo(repoRoot);
  await fs.writeFile(path.join(repoRoot, 'README.md'), 'seed\n', 'utf8');
  commitInitialTree(repoRoot);
  await fs.mkdir(path.join(repoRoot, '.worktrees'), { recursive: true });
  execFileSync('git', ['worktree', 'add', worktreePath, '-b', 'cell-one'], {
    cwd: repoRoot,
    stdio: 'ignore',
  });
  await fs.mkdir(path.join(worktreePath, '.agency'), { recursive: true });
  await fs.writeFile(
    path.join(worktreePath, '.agency', 'session-naming.yaml'),
    yaml.dump({
      rule: '{branch}-{absolute}',
      nameLists: {
        adjectives: ['legacy'],
      },
    }),
    'utf8'
  );

  t.after(async () => {
    if (previousUserData === undefined) {
      delete process.env.AGENCY_USER_DATA_PATH;
    } else {
      process.env.AGENCY_USER_DATA_PATH = previousUserData;
    }
    await fs.rm(repoRoot, { recursive: true, force: true });
    await fs.rm(userDataPath, { recursive: true, force: true });
  });

  const settings = await getSessionNamingSettings({
    scope: 'project',
    projectRoot: repoRoot,
  });

  assert.equal(settings.rule, '{branch}-{absolute}');
  assert.deepEqual(settings.nameLists?.adjectives || [], ['legacy']);
});

test('agent-scoped canonical config resolves through lifecycle cell id when only worktreePath is known', async (t) => {
  const repoRoot = await createTempDir('agency-hierarchy-agent-root-');
  const userDataPath = await createTempDir('agency-hierarchy-userdata-');
  const worktreePath = path.join(repoRoot, '.worktrees', 'cell-one');
  const previousUserData = process.env.AGENCY_USER_DATA_PATH;

  process.env.AGENCY_USER_DATA_PATH = userDataPath;
  await initRepo(repoRoot);
  await fs.mkdir(path.join(worktreePath, '.agency'), { recursive: true });
  await fs.mkdir(path.join(repoRoot, '.agency', 'cells', 'alpha-cell'), { recursive: true });
  await fs.writeFile(
    path.join(worktreePath, '.agency', 'cell-cell-one.yaml'),
    yaml.dump({
      id: 'alpha-cell',
      name: 'Alpha Cell',
    }),
    'utf8'
  );
  await fs.writeFile(
    path.join(repoRoot, '.agency', 'cells', 'alpha-cell', 'terminus-settings.yaml'),
    yaml.dump({
      profiles: [
        {
          id: 'reviewer',
          label: 'Reviewer',
          startCommand: 'codex --profile reviewer',
          shortcuts: { bindings: [] },
        },
      ],
    }),
    'utf8'
  );

  t.after(async () => {
    if (previousUserData === undefined) {
      delete process.env.AGENCY_USER_DATA_PATH;
    } else {
      process.env.AGENCY_USER_DATA_PATH = previousUserData;
    }
    await fs.rm(repoRoot, { recursive: true, force: true });
    await fs.rm(userDataPath, { recursive: true, force: true });
  });

  const settings = await getResolvedTerminusSettings({ worktreePath });
  const reviewer = settings.profiles.find((profile) => profile.id === 'reviewer');

  assert.ok(reviewer);
  assert.equal(reviewer.label, 'Reviewer');
  assert.equal(reviewer.startCommand, 'codex --profile reviewer');
});

export {};
