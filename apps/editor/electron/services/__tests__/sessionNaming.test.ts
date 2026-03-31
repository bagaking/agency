const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');

const { getSessionNamingSettings, setSessionNamingSettings } = require('../sessionNaming');
const execFileAsync = promisify(execFile);

async function createTempDir(prefix) {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

async function initGitRepo(repoRoot) {
  await execFileAsync('git', ['init'], { cwd: repoRoot });
}

test('getSessionNamingSettings works in plain Node when AGENCY_USER_DATA_PATH is set', async (t) => {
  const userDataPath = await createTempDir('agency-session-naming-userdata-');
  const worktreePath = await createTempDir('agency-session-naming-worktree-');
  const previousUserData = process.env.AGENCY_USER_DATA_PATH;

  process.env.AGENCY_USER_DATA_PATH = userDataPath;

  t.after(async () => {
    if (previousUserData === undefined) {
      delete process.env.AGENCY_USER_DATA_PATH;
    } else {
      process.env.AGENCY_USER_DATA_PATH = previousUserData;
    }
    await fs.rm(userDataPath, { recursive: true, force: true });
    await fs.rm(worktreePath, { recursive: true, force: true });
  });

  await fs.writeFile(
    path.join(userDataPath, 'session-naming.json'),
    JSON.stringify({
      rule: '{project}-{branch}-{profile}-{absolute}',
      nameLists: {
        adjectives: ['steady'],
        nouns: ['otter'],
      },
    }),
    'utf8'
  );

  const settings = await getSessionNamingSettings({ scope: 'global', worktreePath });

  assert.equal(settings.rule, '{project}-{branch}-{profile}-{absolute}');
  assert.deepEqual(settings.nameLists?.adjectives || [], ['steady']);
});

test('session naming project and agent scopes resolve from repo-owned storage', async (t) => {
  const repoRoot = await createTempDir('agency-session-naming-repo-');
  const worktreePath = path.join(repoRoot, '.worktrees', 'alpha');
  await initGitRepo(repoRoot);
  await fs.mkdir(path.join(worktreePath, '.agency'), { recursive: true });
  await fs.mkdir(path.join(repoRoot, '.agency', 'cells', 'cell-alpha'), { recursive: true });
  await fs.writeFile(
    path.join(repoRoot, '.agency', 'session-naming.yaml'),
    ['rule: "{project}-project"', 'nameLists:', '  adjectives:', '    - stable'].join('\n'),
    'utf8'
  );
  await fs.writeFile(
    path.join(repoRoot, '.agency', 'cells', 'cell-alpha', 'session-naming.yaml'),
    ['rule: "{project}-agent"', 'nameLists:', '  nouns:', '    - otter'].join('\n'),
    'utf8'
  );

  t.after(async () => {
    await fs.rm(repoRoot, { recursive: true, force: true });
  });

  const projectSettings = await getSessionNamingSettings({
    scope: 'project',
    rootPath: repoRoot,
    worktreePath,
  });
  const agentSettings = await getSessionNamingSettings({
    scope: 'agent',
    rootPath: repoRoot,
    worktreePath,
    cellId: 'cell-alpha',
  });

  assert.equal(projectSettings.rule, '{project}-project');
  assert.deepEqual(projectSettings.nameLists?.adjectives || [], ['stable']);
  assert.equal(agentSettings.rule, '{project}-agent');
  assert.deepEqual(agentSettings.nameLists?.nouns || [], ['otter']);
});

test('session naming agent scope falls back to legacy worktree-local settings', async (t) => {
  const repoRoot = await createTempDir('agency-session-naming-legacy-');
  const worktreePath = path.join(repoRoot, '.worktrees', 'alpha');
  await initGitRepo(repoRoot);
  await fs.mkdir(path.join(worktreePath, '.agency'), { recursive: true });
  await fs.writeFile(
    path.join(worktreePath, '.agency', 'session-naming-alpha.yaml'),
    ['rule: "{project}-legacy"', 'nameLists:', '  adjectives:', '    - amber'].join('\n'),
    'utf8'
  );

  t.after(async () => {
    await fs.rm(repoRoot, { recursive: true, force: true });
  });

  const agentSettings = await getSessionNamingSettings({
    scope: 'agent',
    rootPath: repoRoot,
    worktreePath,
    cellId: 'cell-alpha',
  });

  assert.equal(agentSettings.rule, '{project}-legacy');
  assert.deepEqual(agentSettings.nameLists?.adjectives || [], ['amber']);
});

test('setSessionNamingSettings writes repo-owned agent settings', async (t) => {
  const repoRoot = await createTempDir('agency-session-naming-write-');
  const worktreePath = path.join(repoRoot, '.worktrees', 'alpha');
  await initGitRepo(repoRoot);
  await fs.mkdir(path.join(worktreePath, '.agency'), { recursive: true });

  t.after(async () => {
    await fs.rm(repoRoot, { recursive: true, force: true });
  });

  await setSessionNamingSettings({
    scope: 'agent',
    rootPath: repoRoot,
    worktreePath,
    cellId: 'cell-alpha',
    settings: {
      rule: '{project}-saved',
      nameLists: {
        nouns: ['fox'],
      },
    },
  });

  const savedPath = path.join(repoRoot, '.agency', 'cells', 'cell-alpha', 'session-naming.yaml');
  const saved = await fs.readFile(savedPath, 'utf8');
  assert.match(saved, /rule: '\{project\}-saved'/);
  assert.match(saved, /- fox/);
});

export {};
