const test = require('node:test');
const assert = require('node:assert/strict');

const {
  executeCli,
  parseArgs,
} = require('../controlBusCli');

function createWritableBuffer() {
  let output = '';
  return {
    stream: {
      write(chunk) {
        output += String(chunk || '');
      },
    },
    getOutput() {
      return output;
    },
  };
}

test('parseArgs parses socket and timeout flags', () => {
  const parsed = parseArgs([
    '--json',
    '{"op":"window.list"}',
    '--socket',
    '/tmp/agency.sock',
    '--timeout',
    '42',
  ]);

  assert.equal(parsed.socket, '/tmp/agency.sock');
  assert.equal(parsed.timeoutMs, 42);
});

test('executeCli passes socket path and timeout to requestControlBusSocket', async () => {
  let captured = null;
  const stdout = createWritableBuffer();
  const stderr = createWritableBuffer();

  const exitCode = await executeCli(
    ['--json', '{"op":"window.list"}', '--socket', '/tmp/agency.sock', '--timeout', '42'],
    {
      requestControlBusSocket: async (input) => {
        captured = input;
        return {
          success: true,
          op: 'window.list',
          warnings: [],
          failures: [],
          data: {},
        };
      },
      stdout: stdout.stream,
      stderr: stderr.stream,
    }
  );

  assert.equal(exitCode, 0);
  assert.equal(captured.socketPath, '/tmp/agency.sock');
  assert.equal(captured.timeoutMs, 42);
  assert.match(stdout.getOutput(), /"success": true/);
  assert.equal(stderr.getOutput(), '');
});

test('executeCli returns exit code 2 for normalized control bus failures', async () => {
  const stdout = createWritableBuffer();
  const stderr = createWritableBuffer();

  const exitCode = await executeCli(['--json', '{"op":"window.list"}'], {
    requestControlBusSocket: async () => ({
      success: false,
      op: 'window.list',
      warnings: [],
      failures: [{ code: 'FATAL', message: 'boom' }],
      data: null,
    }),
    stdout: stdout.stream,
    stderr: stderr.stream,
  });

  assert.equal(exitCode, 2);
  assert.match(stdout.getOutput(), /"success": false/);
  assert.equal(stderr.getOutput(), '');
});

test('executeCli returns CLI_ERROR for malformed json input', async () => {
  const stdout = createWritableBuffer();
  const stderr = createWritableBuffer();

  const exitCode = await executeCli(['--json', '{bad'], {
    stdout: stdout.stream,
    stderr: stderr.stream,
  });

  assert.equal(exitCode, 1);
  assert.match(stderr.getOutput(), /CLI_ERROR/);
  assert.equal(stdout.getOutput(), '');
});

test('executeCli returns CLI_ERROR when transport throws', async () => {
  const stdout = createWritableBuffer();
  const stderr = createWritableBuffer();

  const exitCode = await executeCli(['--json', '{"op":"window.list"}'], {
    requestControlBusSocket: async () => {
      throw new Error('socket offline');
    },
    stdout: stdout.stream,
    stderr: stderr.stream,
  });

  assert.equal(exitCode, 1);
  assert.match(stderr.getOutput(), /socket offline/);
  assert.equal(stdout.getOutput(), '');
});

export {};
