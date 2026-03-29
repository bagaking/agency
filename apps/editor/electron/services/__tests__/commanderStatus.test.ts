const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');

const { getCommanderStatus } = require('../commanderStatus');
const { setMainAgentHarnessSettings } = require('../mainAgentHarnessSettings');
const { createCodexCliProvider } = require('../mainAgentHarness/runnerProviders/codexCliProvider');

test('getCommanderStatus reports ready when provider settings, command, and probe all succeed', async (t) => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'agency-commander-status-'));
  const previousUserDataPath = process.env.AGENCY_USER_DATA_PATH;
  const previousCliCommand = process.env.AGENCY_CLI_COMMAND;
  process.env.AGENCY_USER_DATA_PATH = tempRoot;
  process.env.AGENCY_CLI_COMMAND = '/bin/echo';

  const server = http.createServer((request, response) => {
    if (request.url === '/v1/models') {
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ data: [{ id: 'gpt-5.4' }] }));
      return;
    }
    response.writeHead(404);
    response.end();
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 0;

  t.after(() => {
    server.close();
    if (previousUserDataPath === undefined) {
      delete process.env.AGENCY_USER_DATA_PATH;
    } else {
      process.env.AGENCY_USER_DATA_PATH = previousUserDataPath;
    }
    if (previousCliCommand === undefined) {
      delete process.env.AGENCY_CLI_COMMAND;
    } else {
      process.env.AGENCY_CLI_COMMAND = previousCliCommand;
    }
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  await setMainAgentHarnessSettings({
    settings: {
      providers: {
        codex_cli: {
          baseUrl: `http://127.0.0.1:${port}/v1`,
          model: 'gpt-5.4',
          openAIApiKey: 'sk-test',
        },
      },
    },
  });

  const status = await getCommanderStatus({
    forceRefresh: true,
  });

  assert.equal(status.ready, true);
  assert.equal(status.configured, true);
  assert.equal(status.commandAvailable, true);
  assert.equal(status.connected, true);
});

test('getCommanderStatus reports not ready when required settings are missing', async (t) => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'agency-commander-status-missing-'));
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

  const status = await getCommanderStatus({
    forceRefresh: true,
  });

  assert.equal(status.ready, false);
  assert.equal(status.configured, false);
  assert.match(String(status.reason || ''), /Missing required Harness provider settings/i);
});

test('getCommanderStatus stays ready after a recent provider failure when config and probe still succeed', async (t) => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'agency-commander-status-recent-failure-'));
  const previousUserDataPath = process.env.AGENCY_USER_DATA_PATH;
  const previousCliCommand = process.env.AGENCY_CLI_COMMAND;
  const previousMaxAttempts = process.env.AGENCY_HARNESS_PROVIDER_MAX_ATTEMPTS;
  const previousTimeoutMs = process.env.AGENCY_HARNESS_PROVIDER_TIMEOUT_MS;
  process.env.AGENCY_USER_DATA_PATH = tempRoot;
  process.env.AGENCY_CLI_COMMAND = '/bin/echo';
  process.env.AGENCY_HARNESS_PROVIDER_MAX_ATTEMPTS = '1';
  process.env.AGENCY_HARNESS_PROVIDER_TIMEOUT_MS = '20';

  const server = http.createServer((request, response) => {
    if (request.url === '/v1/models') {
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ data: [{ id: 'gpt-5.4' }] }));
      return;
    }
    response.writeHead(404);
    response.end();
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 0;

  t.after(() => {
    server.close();
    if (previousUserDataPath === undefined) {
      delete process.env.AGENCY_USER_DATA_PATH;
    } else {
      process.env.AGENCY_USER_DATA_PATH = previousUserDataPath;
    }
    if (previousCliCommand === undefined) {
      delete process.env.AGENCY_CLI_COMMAND;
    } else {
      process.env.AGENCY_CLI_COMMAND = previousCliCommand;
    }
    if (previousMaxAttempts === undefined) {
      delete process.env.AGENCY_HARNESS_PROVIDER_MAX_ATTEMPTS;
    } else {
      process.env.AGENCY_HARNESS_PROVIDER_MAX_ATTEMPTS = previousMaxAttempts;
    }
    if (previousTimeoutMs === undefined) {
      delete process.env.AGENCY_HARNESS_PROVIDER_TIMEOUT_MS;
    } else {
      process.env.AGENCY_HARNESS_PROVIDER_TIMEOUT_MS = previousTimeoutMs;
    }
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  await setMainAgentHarnessSettings({
    settings: {
      providers: {
        codex_cli: {
          baseUrl: `http://127.0.0.1:${port}/v1`,
          model: 'gpt-5.4',
          openAIApiKey: 'sk-test',
        },
      },
    },
  });

  const provider = createCodexCliProvider({
    getSettings: async () => ({
      providers: {
        codex_cli: {
          baseUrl: `http://127.0.0.1:${port}/v1`,
          model: 'gpt-5.4',
          openAIApiKey: 'sk-test',
        },
      },
    }),
    runProcess: async ({ abortSignal }) => {
      await new Promise((resolve, reject) => {
        const onAbort = () => {
          const error = new Error('Provider execution was cancelled.') as Error & {
            code?: string;
            data?: Record<string, any>;
          };
          error.code = 'RUN_CANCELLED';
          error.data = {
            events: [
              {
                type: 'error',
                message: 'unexpected status 502 Bad Gateway: Upstream request failed',
              },
            ],
          };
          reject(error);
        };
        abortSignal?.addEventListener?.('abort', onAbort, { once: true });
      });
      return null;
    },
  });

  await provider.decideStep({
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

  const status = await getCommanderStatus({
    forceRefresh: true,
  });

  assert.equal(status.ready, true);
  assert.equal(status.commandAvailable, true);
  assert.equal(String(status.reason || ''), '');
});

export {};
