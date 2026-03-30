const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');

const { writeRegistry } = require('../sessionRegistry');
const { prepareSessionContinueOnMobile } = require('../mobileSessionContinuation');
const { resetMobileSessionProxyForTests } = require('../mobileSessionProxy');
const execFileAsync = promisify(execFile);

async function createTempDir(prefix) {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

async function initGitRepo(repoRoot) {
  await execFileAsync('git', ['init'], { cwd: repoRoot });
}

async function setupTestMode(t, prefix) {
  const worktreePath = await createTempDir(prefix);
  const previousMode = process.env.AGENCY_TEST_MODE;
  process.env.AGENCY_TEST_MODE = '1';

  t.after(async () => {
    await resetMobileSessionProxyForTests();
    if (previousMode === undefined) {
      delete process.env.AGENCY_TEST_MODE;
    } else {
      process.env.AGENCY_TEST_MODE = previousMode;
    }
    await fs.rm(worktreePath, { recursive: true, force: true });
  });

  return { worktreePath };
}

test('prepareSessionContinueOnMobile builds ssh+tmux command in test mode', async (t) => {
  const { worktreePath } = await setupTestMode(t, 'agency-mobile-continue-');

  await writeRegistry(worktreePath, {
    version: 1,
    sessions: [
      {
        id: 'sess-1',
        name: 'Session 1',
        tmuxSession: 'agency-cell-sess-1',
        status: 'active',
      },
    ],
  });

  const result = await prepareSessionContinueOnMobile({
    worktreePath,
    sessionId: 'sess-1',
    mode: 'direct',
  });

  assert.equal(result.sessionId, 'sess-1');
  assert.equal(result.sessionName, 'Session 1');
  assert.equal(result.mode, 'direct');
  assert.equal(result.tmuxSession, 'agency-cell-sess-1');
  assert.equal(result.ssh.ready, true);
  assert.equal(result.ssh.port, 22);
  assert.match(result.command, /ssh -p 22 /);
  assert.match(result.command, /tmux attach-session -t .*agency-cell-sess-1/);
});

test('prepareSessionContinueOnMobile builds hub command and artifacts in test mode', async (t) => {
  const { worktreePath } = await setupTestMode(t, 'agency-mobile-hub-');

  await writeRegistry(worktreePath, {
    version: 1,
    sessions: [
      {
        id: 'sess-hub-1',
        name: 'Hub Session 1',
        tmuxSession: 'agency-cell-sess-hub-1',
        status: 'active',
      },
      {
        id: 'sess-hub-2',
        name: 'Hub Session 2',
        tmuxSession: 'agency-cell-sess-hub-2',
        status: 'detached',
      },
    ],
  });

  const result = await prepareSessionContinueOnMobile({
    worktreePath,
    sessionId: 'sess-hub-1',
    mode: 'hub',
  });

  assert.equal(result.mode, 'hub');
  assert.equal(result.ssh.ready, true);
  assert.ok(result.hub);
  assert.match(result.hub.tmuxSession, /^agency-mobile-hub-/);
  assert.match(result.command, /tmux attach-session -t/);
  assert.match(result.command, /continue-on-mobile-hub\.sh/);
  assert.equal(result.hub.catalogSummary.sessions, 2);
  assert.equal(result.hub.catalogSummary.hiddenSessions, 0);

  const catalogRaw = await fs.readFile(result.hub.catalogPath, 'utf-8');
  assert.match(catalogRaw, /session_name/);
  assert.match(catalogRaw, /Hub Session 1/);

  const launcherRaw = await fs.readFile(result.hub.launcherPath, 'utf-8');
  assert.match(launcherRaw, /Agency Mobile Hub/);
  assert.match(launcherRaw, /Select session index/);
});

test('prepareSessionContinueOnMobile builds proxy command and reuses token in test mode', async (t) => {
  const { worktreePath } = await setupTestMode(t, 'agency-mobile-proxy-');

  await writeRegistry(worktreePath, {
    version: 1,
    sessions: [
      {
        id: 'sess-proxy-1',
        name: 'Proxy Session 1',
        tmuxSession: 'agency-cell-sess-proxy-1',
        status: 'active',
      },
    ],
  });

  const first = await prepareSessionContinueOnMobile({
    worktreePath,
    sessionId: 'sess-proxy-1',
    mode: 'proxy',
  });
  const second = await prepareSessionContinueOnMobile({
    worktreePath,
    sessionId: 'sess-proxy-1',
    mode: 'proxy',
  });

  assert.equal(first.mode, 'proxy');
  assert.equal(first.proxy.ready, true);
  assert.match(first.command, /bash -lc/);
  assert.match(first.command, /\| nc /);
  assert.doesNotMatch(first.command, /;;/);
  assert.equal(first.proxy.reusedToken, false);
  assert.ok(first.proxy.token);
  assert.ok(first.proxy.tokenMasked);

  assert.equal(second.proxy.reusedToken, true);
  assert.equal(second.proxy.token, first.proxy.token);
});

test('prepareSessionContinueOnMobile hub catalog excludes stale and closed sessions by default', async (t) => {
  const { worktreePath } = await setupTestMode(t, 'agency-mobile-hub-filter-');

  await writeRegistry(worktreePath, {
    version: 1,
    sessions: [
      {
        id: 'sess-active',
        name: 'Active Session',
        tmuxSession: 'agency-cell-sess-active',
        status: 'active',
      },
      {
        id: 'sess-stale',
        name: 'Stale Session',
        tmuxSession: 'agency-cell-sess-stale',
        status: 'stale',
      },
      {
        id: 'sess-closed',
        name: 'Closed Session',
        tmuxSession: 'agency-cell-sess-closed',
        status: 'closed',
      },
    ],
  });

  const result = await prepareSessionContinueOnMobile({
    worktreePath,
    sessionId: 'sess-active',
    mode: 'hub',
  });

  assert.equal(result.hub.catalogSummary.sessions, 1);
  assert.equal(result.hub.catalogSummary.hiddenSessions, 2);
  assert.match(result.ssh.warnings.join('\n'), /hidden from Hub attach list/);

  const catalogRaw = await fs.readFile(result.hub.catalogPath, 'utf-8');
  assert.match(catalogRaw, /Active Session/);
  assert.doesNotMatch(catalogRaw, /Stale Session/);
  assert.doesNotMatch(catalogRaw, /Closed Session/);
});

test('prepareSessionContinueOnMobile throws when session is missing', async (t) => {
  const { worktreePath } = await setupTestMode(t, 'agency-mobile-continue-missing-');

  await writeRegistry(worktreePath, {
    version: 1,
    sessions: [],
  });

  await assert.rejects(
    () =>
      prepareSessionContinueOnMobile({
        worktreePath,
        sessionId: 'missing',
        mode: 'direct',
      }),
    /Session not found/,
  );
});

test('prepareSessionContinueOnMobile rejects closed session in proxy mode', async (t) => {
  const { worktreePath } = await setupTestMode(t, 'agency-mobile-proxy-closed-');

  await writeRegistry(worktreePath, {
    version: 1,
    sessions: [
      {
        id: 'sess-closed',
        name: 'Closed Session',
        tmuxSession: 'agency-cell-sess-closed',
        status: 'closed',
      },
    ],
  });

  await assert.rejects(
    () =>
      prepareSessionContinueOnMobile({
        worktreePath,
        sessionId: 'sess-closed',
        mode: 'proxy',
      }),
    /not attachable/,
  );
});

test('prepareSessionContinueOnMobile resolves the attached worktree from cell context', async (t) => {
  const repoRoot = await createTempDir('agency-mobile-continue-cell-');
  const worktreePath = path.join(repoRoot, '.worktrees', 'alpha');
  await initGitRepo(repoRoot);
  await fs.mkdir(path.join(worktreePath, '.agency'), { recursive: true });
  await fs.mkdir(path.join(repoRoot, '.agency', 'cells', 'cell-alpha'), { recursive: true });
  await fs.writeFile(
    path.join(repoRoot, '.agency', 'cells', 'cell-alpha', 'cell.yaml'),
    [
      'version: 2',
      'id: cell-alpha',
      'name: Alpha',
      'branch: feat/alpha',
      'state: active',
      'attachmentState: attached',
      `worktreePath: ${worktreePath}`,
      `lastKnownWorktreePath: ${worktreePath}`,
    ].join('\n'),
    'utf8'
  );
  const previousMode = process.env.AGENCY_TEST_MODE;
  process.env.AGENCY_TEST_MODE = '1';

  t.after(async () => {
    await resetMobileSessionProxyForTests();
    if (previousMode === undefined) {
      delete process.env.AGENCY_TEST_MODE;
    } else {
      process.env.AGENCY_TEST_MODE = previousMode;
    }
    await fs.rm(repoRoot, { recursive: true, force: true });
  });

  await writeRegistry(
    {
      projectRoot: repoRoot,
      cellId: 'cell-alpha',
      worktreePath,
    },
    {
      version: 1,
      sessions: [
        {
          id: 'sess-1',
          name: 'Context Session',
          tmuxSession: 'agency-cell-sess-1',
          status: 'active',
        },
      ],
    }
  );

  const result = await prepareSessionContinueOnMobile({
    projectRoot: repoRoot,
    cellId: 'cell-alpha',
    sessionId: 'sess-1',
    mode: 'direct',
  });

  assert.equal(result.sessionId, 'sess-1');
  assert.equal(result.sessionName, 'Context Session');
  assert.match(result.command, /tmux attach-session -t .*agency-cell-sess-1/);
});

export {};
