const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

const tmuxModulePath = require.resolve('../tmux.ts');

async function withTmuxService(execFileImpl, run) {
  const originalLoad = Module._load;
  const originalTestMode = process.env.AGENCY_TEST_MODE;
  delete process.env.AGENCY_TEST_MODE;

  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === 'child_process') {
      return {
        execFile: execFileImpl,
      };
    }
    return originalLoad.call(this, request, parent, isMain);
  };

  delete require.cache[tmuxModulePath];
  const tmux = require(tmuxModulePath);
  try {
    await run(tmux);
  } finally {
    delete require.cache[tmuxModulePath];
    Module._load = originalLoad;
    if (originalTestMode === undefined) {
      delete process.env.AGENCY_TEST_MODE;
    } else {
      process.env.AGENCY_TEST_MODE = originalTestMode;
    }
  }
}

test('listTmuxSessionStates batches pane activity by tmux session', async () => {
  const calls = [];
  await withTmuxService((command, args, callback) => {
    calls.push({ command, args });
    callback(
      null,
      {
        stdout: [
          'agency-a\t1700000000',
          'agency-a\t1700000015',
          'agency-b\t1700000005',
        ].join('\n'),
        stderr: '',
      }
    );
  }, async ({ listTmuxSessionStates }) => {
    const states = await listTmuxSessionStates();

    assert.deepEqual(calls, [
      {
        command: 'tmux',
        args: ['list-panes', '-a', '-F', '#{session_name}\t#{pane_activity}'],
      },
    ]);
    assert.deepEqual(states, [
      {
        tmuxSession: 'agency-a',
        lastActivityAt: '2023-11-14T22:13:35.000Z',
      },
      {
        tmuxSession: 'agency-b',
        lastActivityAt: '2023-11-14T22:13:25.000Z',
      },
    ]);
  });
});

test('listTmuxSessionStates returns null when tmux listing is unavailable', async () => {
  await withTmuxService((_command, _args, callback) => {
    callback(new Error('tmux unavailable'));
  }, async ({ listTmuxSessionStates }) => {
    assert.equal(await listTmuxSessionStates(), null);
  });
});

export {};
