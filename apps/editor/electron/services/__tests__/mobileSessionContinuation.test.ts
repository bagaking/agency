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
  });

  assert.equal(result.sessionId, 'sess-1');
  assert.equal(result.sessionName, 'Session 1');
  assert.equal(result.tmuxSession, 'agency-cell-sess-1');
  assert.equal(result.ssh.ready, true);
  assert.equal(result.ssh.port, 22);
  assert.match(result.command, /ssh -p 22 /);
  assert.match(result.command, /tmux attach-session -t agency-cell-sess-1/);
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
      }),
    /Session not found/,
  );
});

export {};
