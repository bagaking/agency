const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');

const { getResolvedTerminusSettings } = require('../terminusSettings');

async function createTempDir(prefix) {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

test('getResolvedTerminusSettings works in plain Node when AGENCY_USER_DATA_PATH is set', async (t) => {
  const userDataPath = await createTempDir('agency-terminus-userdata-');
  const worktreePath = await createTempDir('agency-terminus-worktree-');
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
    path.join(userDataPath, 'terminus-settings.json'),
    JSON.stringify({
      profiles: [
        {
          id: 'codex',
          label: 'codex',
          startCommand: 'codex',
          fork: {
            enabled: true,
            driver: 'codex',
            launchTemplate: 'codex --thread {thread_id}',
            sourceIdleMs: 0,
          },
        },
      ],
    }),
    'utf8'
  );

  const settings = await getResolvedTerminusSettings({ worktreePath });

  const codex = settings.profiles.find((profile) => profile.id === 'codex');
  assert.ok(codex);
  assert.equal(codex.fork.enabled, true);
  assert.equal(codex.fork.driver, 'codex');
  assert.equal(codex.fork.sourceIdleMs, 0);
});

export {};
