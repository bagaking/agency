const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { createFileHarnessRunStore } = require('../mainAgentHarness/store');

test('file harness run store treats malformed run JSON as missing instead of throwing', async (t) => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'agency-harness-store-test-'));
  const previousUserDataPath = process.env.AGENCY_USER_DATA_PATH;
  process.env.AGENCY_USER_DATA_PATH = tempRoot;
  t.after(() => {
    if (previousUserDataPath === undefined) {
      delete process.env.AGENCY_USER_DATA_PATH;
    } else {
      process.env.AGENCY_USER_DATA_PATH = previousUserDataPath;
    }
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  const runsDir = path.join(tempRoot, 'main-agent-harness', 'runs');
  fs.mkdirSync(runsDir, { recursive: true });
  fs.writeFileSync(path.join(runsDir, 'run-bad.json'), '<html>oops</html>', 'utf8');

  const store = createFileHarnessRunStore();
  const run = await store.read('run-bad');
  const list = await store.list({ limit: 5 });

  assert.equal(run, null);
  assert.deepEqual(list, []);
});

export {};
