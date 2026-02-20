const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const {
  issueMobileSessionProxyToken,
  revokeMobileSessionProxyTokenForSession,
  resetMobileSessionProxyForTests,
} = require('../mobileSessionProxy');

async function setupTestMode(t, prefix) {
  const previousMode = process.env.AGENCY_TEST_MODE;
  process.env.AGENCY_TEST_MODE = '1';
  const worktreePath = await fs.mkdtemp(path.join(os.tmpdir(), prefix));

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

test('issueMobileSessionProxyToken reuses token per live session', async (t) => {
  const { worktreePath } = await setupTestMode(t, 'agency-mobile-proxy-token-');

  const first = await issueMobileSessionProxyToken({
    worktreePath,
    sessionId: 'sess-1',
    sessionName: 'Session 1',
    tmuxSession: 'agency-cell-sess-1',
  });
  const second = await issueMobileSessionProxyToken({
    worktreePath,
    sessionId: 'sess-1',
    sessionName: 'Session 1',
    tmuxSession: 'agency-cell-sess-1',
  });

  assert.equal(first.reused, false);
  assert.equal(second.reused, true);
  assert.equal(second.token, first.token);
  assert.ok(first.endpoint.port > 0);
});

test('revokeMobileSessionProxyTokenForSession invalidates existing token', async (t) => {
  const { worktreePath } = await setupTestMode(t, 'agency-mobile-proxy-revoke-');

  const first = await issueMobileSessionProxyToken({
    worktreePath,
    sessionId: 'sess-1',
    sessionName: 'Session 1',
    tmuxSession: 'agency-cell-sess-1',
  });

  const revoked = revokeMobileSessionProxyTokenForSession({
    worktreePath,
    sessionId: 'sess-1',
  });

  const second = await issueMobileSessionProxyToken({
    worktreePath,
    sessionId: 'sess-1',
    sessionName: 'Session 1',
    tmuxSession: 'agency-cell-sess-1',
  });

  assert.equal(revoked, true);
  assert.notEqual(second.token, first.token);
  assert.equal(second.reused, false);
});

export {};
