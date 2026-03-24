const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { resolveProviderCommand } = require('../mainAgentHarness/runnerProviders/shared/providerProcess');

function createTempExecutable() {
  const dirPath = fs.mkdtempSync(path.join(os.tmpdir(), 'agency-provider-process-test-'));
  const filePath = path.join(dirPath, 'codex');
  fs.writeFileSync(filePath, '#!/bin/sh\nexit 0\n', 'utf-8');
  fs.chmodSync(filePath, 0o755);
  return { dirPath, filePath };
}

test('resolveProviderCommand keeps executable absolute paths', async () => {
  const { dirPath, filePath } = createTempExecutable();
  try {
    const resolved = await resolveProviderCommand(filePath, {
      env: { ...process.env, PATH: '' },
    });
    assert.equal(resolved, filePath);
  } finally {
    fs.rmSync(dirPath, { recursive: true, force: true });
  }
});

test('resolveProviderCommand can recover command path through login shell lookup', async () => {
  const { dirPath, filePath } = createTempExecutable();
  try {
    const resolved = await resolveProviderCommand('codex', {
      env: { ...process.env, PATH: '' },
      execFileRunner: async () => ({
        stdout: `${filePath}\n`,
      }),
    });
    assert.equal(resolved, filePath);
  } finally {
    fs.rmSync(dirPath, { recursive: true, force: true });
  }
});

export {};
