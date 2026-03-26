const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('path');

const {
  buildCodexCliConfigArgs,
  buildCodexCliEnv,
  createCodexCliProvider,
  isRetryableCodexProviderError,
  resolveCodexHome,
} = require('../mainAgentHarness/runnerProviders/codexCliProvider');

test('buildCodexCliEnv isolates HOME and defaults CODEX_HOME to the isolated provider home', () => {
  const env = buildCodexCliEnv({
    HOME: '/Users/example',
    PATH: '/usr/bin:/bin',
  });

  assert.notEqual(env.HOME, '/Users/example');
  assert.ok(env.HOME.includes(path.join('agency-main-agent-harness', 'provider-home', 'codex-cli')));
  assert.equal(env.CODEX_HOME, path.join(env.HOME, '.codex'));
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

test('buildCodexCliEnv prefers the worktree-local .codex directory when available', (t) => {
  const worktreePath = fs.mkdtempSync(path.join(os.tmpdir(), 'agency-codex-provider-worktree-'));
  const localCodexHome = path.join(worktreePath, '.codex');
  fs.mkdirSync(localCodexHome, { recursive: true });
  t.after(() => {
    fs.rmSync(worktreePath, { recursive: true, force: true });
  });

  const env = buildCodexCliEnv(
    {
      HOME: '/Users/example',
    },
    {
      workingDirectory: worktreePath,
    }
  );

  assert.equal(env.CODEX_HOME, localCodexHome);
  assert.notEqual(env.HOME, '/Users/example');
});

test('resolveCodexHome falls back to the isolated provider home when no explicit or local .codex exists', () => {
  const codexHome = resolveCodexHome(
    {
      HOME: '/Users/example',
    },
    {
      isolatedHome: '/tmp/agency-provider-home',
      workingDirectory: '/tmp/agency-no-local-codex',
    }
  );

  assert.equal(codexHome, '/tmp/agency-provider-home/.codex');
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

test('isRetryableCodexProviderError treats upstream 502 failures as retryable', () => {
  const error = Object.assign(new Error('Provider process exited with code 1'), {
    code: 'PROVIDER_PROCESS_FAILED',
    data: {
      stderr: '502 Bad Gateway: Upstream request failed',
    },
  });

  assert.equal(isRetryableCodexProviderError(error), true);
});

test('isRetryableCodexProviderError does not retry invalid api key failures', () => {
  const error = Object.assign(new Error('Provider process exited with code 1'), {
    code: 'PROVIDER_PROCESS_FAILED',
    data: {
      stderr: '401 Unauthorized: {"code":"INVALID_API_KEY","message":"Invalid API key"}',
    },
  });

  assert.equal(isRetryableCodexProviderError(error), false);
});

test('codex provider retries transient upstream failures and eventually succeeds', async () => {
  let attempts = 0;
  const provider = createCodexCliProvider({
    getSettings: async () => ({
      providers: {
        codex_cli: {
          baseUrl: 'https://api.example.com/v1',
          model: 'gpt-5.4',
          openAIApiKey: 'sk-test',
          modelReasoningEffort: 'medium',
        },
      },
    }),
    runProcess: async () => {
      attempts += 1;
      if (attempts < 3) {
        const error = Object.assign(new Error('Provider process exited with code 1'), {
          code: 'PROVIDER_PROCESS_FAILED',
          data: {
            stderr: '502 Bad Gateway: Upstream request failed',
          },
        });
        throw error;
      }
      return {
        events: [
          { type: 'thread.started', thread_id: 'thread-123' },
          {
            type: 'item.completed',
            item: {
              type: 'agent_message',
              text: '{"ok":true}',
            },
          },
        ],
        stderr: '',
      };
    },
  });

  const result = await provider.decideStep({
    run: {},
    step: {},
    skillPack: {
      buildDecisionSchema: () => ({
        type: 'object',
        properties: {
          ok: { type: 'boolean' },
        },
        required: ['ok'],
      }),
      validateDecision: () => undefined,
      resolveWorkingDirectory: () => process.cwd(),
    },
    preparedContext: {},
    abortSignal: null,
  });

  assert.equal(attempts, 3);
  assert.equal(result.threadId, 'thread-123');
  assert.deepEqual(result.decision, { ok: true });
});

test('codex provider falls back to deterministic skill-pack decision after retryable upstream failures', async () => {
  let attempts = 0;
  const provider = createCodexCliProvider({
    getSettings: async () => ({
      providers: {
        codex_cli: {
          baseUrl: 'https://api.example.com/v1',
          model: 'gpt-5.4',
          openAIApiKey: 'sk-test',
        },
      },
    }),
    runProcess: async () => {
      attempts += 1;
      const error = Object.assign(new Error('Provider process exited with code 1'), {
        code: 'PROVIDER_PROCESS_FAILED',
        data: {
          stderr: '502 Bad Gateway: Upstream request failed',
        },
      });
      throw error;
    },
  });

  const result = await provider.decideStep({
    run: {},
    step: {},
    skillPack: {
      buildDecisionSchema: () => ({
        type: 'object',
        properties: {
          ok: { type: 'boolean' },
        },
        required: ['ok'],
      }),
      buildDeterministicDecision: () => ({ ok: true }),
      validateDecision: () => undefined,
      resolveWorkingDirectory: () => process.cwd(),
    },
    preparedContext: {},
    abortSignal: null,
  });

  assert.equal(attempts, 3);
  assert.deepEqual(result.decision, { ok: true });
  assert.equal(result.fallbackUsed, true);
  assert.match(String(result.fallbackReason || ''), /Provider process exited with code 1/i);
});

test('codex provider does not retry invalid api key failures', async () => {
  let attempts = 0;
  const provider = createCodexCliProvider({
    getSettings: async () => ({
      providers: {
        codex_cli: {
          baseUrl: 'https://api.example.com/v1',
          model: 'gpt-5.4',
          openAIApiKey: 'sk-test',
        },
      },
    }),
    runProcess: async () => {
      attempts += 1;
      const error = Object.assign(new Error('Provider process exited with code 1'), {
        code: 'PROVIDER_PROCESS_FAILED',
        data: {
          stderr: '401 Unauthorized: {"code":"INVALID_API_KEY","message":"Invalid API key"}',
        },
      });
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
    /Provider process exited with code 1/i
  );
  assert.equal(attempts, 1);
});

export {};
