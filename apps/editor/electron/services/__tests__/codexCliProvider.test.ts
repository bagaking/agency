const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const {
  buildCodexCliConfigArgs,
  buildCodexCliEnv,
  createCodexCliProvider,
} = require('../mainAgentHarness/runnerProviders/codexCliProvider');

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

test('buildCodexCliConfigArgs converts global provider settings into codex overrides', () => {
  const result = buildCodexCliConfigArgs({
    baseUrl: 'https://api.example.com/v1',
    model: 'gpt-5.4',
    openAIApiKey: 'sk-test',
    modelReasoningEffort: 'high',
    modelContextWindow: 180000,
    modelAutoCompactTokenLimit: 120000,
  });

  assert.equal(result.env.OPENAI_API_KEY, 'sk-test');
  assert.deepEqual(result.args, [
    '-c',
    'model_provider="openai"',
    '-c',
    'openai_base_url="https://api.example.com/v1"',
    '-c',
    'model="gpt-5.4"',
    '-c',
    'model_reasoning_effort="high"',
    '-c',
    'model_context_window=180000',
    '-c',
    'model_auto_compact_token_limit=120000',
  ]);
});

test('buildCodexCliConfigArgs rejects incomplete required provider settings', () => {
  assert.throws(
    () =>
      buildCodexCliConfigArgs({
        baseUrl: 'https://api.example.com/v1',
        model: '',
        openAIApiKey: 'sk-test',
      }),
    /Missing: model/i
  );
});

test('codex provider rewrites missing ambient provider env into a clear Agency settings error', async () => {
  const provider = createCodexCliProvider({
    getSettings: async () => ({
      providers: {
        codex_cli: {
          baseUrl: '',
          model: '',
          openAIApiKey: '',
        },
      },
    }),
    runProcess: async () => {
      const error = new Error('Provider process exited with code 1: Missing environment variable: `PP_CODEX`.');
      throw error;
    },
  });

  await assert.rejects(
    provider.decideStep({
      run: {},
      step: {},
      skillPack: {
        buildDecisionSchema: () => ({}),
        resolveWorkingDirectory: () => process.cwd(),
      },
      preparedContext: {},
      abortSignal: null,
    }),
    /Harness Codex provider is not configured for Agency/i
  );
});

export {};
