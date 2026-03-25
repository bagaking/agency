const test = require('node:test');
const assert = require('node:assert/strict');
const os = require('os');
const path = require('path');

const { buildCodexCliEnv } = require('../mainAgentHarness/runnerProviders/codexCliProvider');

test('buildCodexCliEnv isolates HOME while preserving real CODEX_HOME', () => {
  const env = buildCodexCliEnv({
    HOME: '/Users/example',
    PATH: '/usr/bin:/bin',
  });

  assert.equal(env.CODEX_HOME, '/Users/example/.codex');
  assert.notEqual(env.HOME, '/Users/example');
  assert.ok(env.HOME.includes(path.join('agency-main-agent-harness', 'provider-home', 'codex-cli')));
  assert.equal(env.AGENCY_REAL_HOME, '/Users/example');
  assert.equal(env.PATH, '/usr/bin:/bin');
});

test('buildCodexCliEnv respects explicit CODEX_HOME overrides', () => {
  const env = buildCodexCliEnv({
    HOME: '/Users/example',
    CODEX_HOME: '/tmp/custom-codex-home',
  });

  assert.equal(env.CODEX_HOME, '/tmp/custom-codex-home');
  assert.equal(env.AGENCY_REAL_HOME, '/Users/example');
});

export {};
