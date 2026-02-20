const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');

const { writeRegistry } = require('../sessionRegistry');
const { prepareSessionContinueOnMobile } = require('../mobileSessionContinuation');

async function createTempDir(prefix) {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

test('prepareSessionContinueOnMobile builds ssh+tmux command in test mode', async (t) => {
  const worktreePath = await createTempDir('agency-mobile-continue-');
  const previousMode = process.env.AGENCY_TEST_MODE;
  process.env.AGENCY_TEST_MODE = '1';

  t.after(async () => {
    if (previousMode === undefined) {
      delete process.env.AGENCY_TEST_MODE;
    } else {
      process.env.AGENCY_TEST_MODE = previousMode;
    }
    await fs.rm(worktreePath, { recursive: true, force: true });
  });

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
  const worktreePath = await createTempDir('agency-mobile-hub-');
  const previousMode = process.env.AGENCY_TEST_MODE;
  process.env.AGENCY_TEST_MODE = '1';

  t.after(async () => {
    if (previousMode === undefined) {
      delete process.env.AGENCY_TEST_MODE;
    } else {
      process.env.AGENCY_TEST_MODE = previousMode;
    }
    await fs.rm(worktreePath, { recursive: true, force: true });
  });

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

test('prepareSessionContinueOnMobile hub catalog excludes stale and closed sessions by default', async (t) => {
  const worktreePath = await createTempDir('agency-mobile-hub-filter-');
  const previousMode = process.env.AGENCY_TEST_MODE;
  process.env.AGENCY_TEST_MODE = '1';

  t.after(async () => {
    if (previousMode === undefined) {
      delete process.env.AGENCY_TEST_MODE;
    } else {
      process.env.AGENCY_TEST_MODE = previousMode;
    }
    await fs.rm(worktreePath, { recursive: true, force: true });
  });

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
  const worktreePath = await createTempDir('agency-mobile-continue-missing-');
  const previousMode = process.env.AGENCY_TEST_MODE;
  process.env.AGENCY_TEST_MODE = '1';

  t.after(async () => {
    if (previousMode === undefined) {
      delete process.env.AGENCY_TEST_MODE;
    } else {
      process.env.AGENCY_TEST_MODE = previousMode;
    }
    await fs.rm(worktreePath, { recursive: true, force: true });
  });

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

export {};
