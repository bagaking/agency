const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  getMainAgentHarnessSettings,
  setMainAgentHarnessSettings,
} = require('../mainAgentHarnessSettings');

test('main agent harness settings read/write the global codex provider config in plain Node', async (t) => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'agency-harness-settings-test-'));
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

  const saved = await setMainAgentHarnessSettings({
    settings: {
      providers: {
        codex_cli: {
          baseUrl: 'https://api.example.com/v1',
          model: 'gpt-5.4',
          openAIApiKey: 'sk-test',
          modelReasoningEffort: 'xhigh',
          modelContextWindow: 200000,
          modelAutoCompactTokenLimit: 120000,
        },
      },
    },
  });

  assert.equal(saved.providers.codex_cli.baseUrl, 'https://api.example.com/v1');
  assert.equal(saved.providers.codex_cli.model, 'gpt-5.4');
  assert.equal(saved.providers.codex_cli.openAIApiKey, 'sk-test');
  assert.equal(saved.providers.codex_cli.modelReasoningEffort, 'xhigh');
  assert.equal(saved.providers.codex_cli.modelContextWindow, 200000);
  assert.equal(saved.providers.codex_cli.modelAutoCompactTokenLimit, 120000);

  const loaded = await getMainAgentHarnessSettings();
  assert.deepEqual(loaded, saved);
});

export {};
