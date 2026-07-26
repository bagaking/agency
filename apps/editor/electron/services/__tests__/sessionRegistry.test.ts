const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');

const {
  readRegistry,
  writeRegistry,
  getLegacySessionRegistryPath,
} = require('../sessionRegistry');

async function createTempWorktree(t) {
  const worktreePath = await fs.mkdtemp(path.join(os.tmpdir(), 'agency-session-registry-'));
  t.after(async () => {
    await fs.rm(worktreePath, { recursive: true, force: true });
  });
  return worktreePath;
}

test('readRegistry self-heals a corrupt registry file instead of failing forever', async (t) => {
  const worktreePath = await createTempWorktree(t);
  const registryPath = getLegacySessionRegistryPath(worktreePath);
  await fs.mkdir(path.dirname(registryPath), { recursive: true });
  await fs.writeFile(registryPath, '{ sessions: [ {', 'utf-8');

  const registry = await readRegistry(worktreePath);
  assert.deepEqual(registry.sessions, []);

  const siblingNames = await fs.readdir(path.dirname(registryPath));
  const backupNames = siblingNames.filter((name) => name.includes('.corrupt-'));
  assert.equal(backupNames.length, 1, 'corrupt file should be preserved as a backup');

  await writeRegistry(worktreePath, {
    version: 1,
    sessions: [{ id: 'sess-1', name: 'Session 1', tmuxSession: 'agency-x', status: 'active' }],
  });
  const reread = await readRegistry(worktreePath);
  assert.equal(reread.sessions.length, 1);
  assert.equal(reread.sessions[0].id, 'sess-1');
});

test('readRegistry round-trips a healthy registry unchanged', async (t) => {
  const worktreePath = await createTempWorktree(t);
  await writeRegistry(worktreePath, {
    version: 1,
    sessions: [{ id: 'sess-a', name: 'A', tmuxSession: 'agency-a', status: 'active' }],
  });
  const registry = await readRegistry(worktreePath);
  assert.equal(registry.sessions.length, 1);
  assert.equal(registry.sessions[0].id, 'sess-a');
});

export {};
