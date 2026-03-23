const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');

const { getSessionNamingSettings } = require('../sessionNaming');

async function createTempDir(prefix) {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
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

export {};
