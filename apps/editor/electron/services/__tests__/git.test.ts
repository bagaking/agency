const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

const serviceModulePath = require.resolve('../git.ts');

async function withGitService(stdout, run) {
  const originalLoad = Module._load;

  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === 'child_process') {
      return {
        execFile(_command, _args, _options, callback) {
          callback(null, { stdout, stderr: '' });
        },
      };
    }
    return originalLoad.call(this, request, parent, isMain);
  };

  delete require.cache[serviceModulePath];
  const service = require(serviceModulePath);
  try {
    await run(service);
  } finally {
    delete require.cache[serviceModulePath];
    Module._load = originalLoad;
  }
}

test('listWorktrees parses detached HEAD entries from git porcelain output', async () => {
  await withGitService(
    [
      'worktree /repo/.worktrees/detached',
      'HEAD 0123456789abcdef',
      '',
      'worktree /repo/.worktrees/feature',
      'HEAD abcdef0123456789',
      'branch refs/heads/feat/polish',
      '',
    ].join('\n'),
    async ({ listWorktrees }) => {
      const worktrees = await listWorktrees('/repo');
      assert.deepEqual(worktrees, [
        {
          path: '/repo/.worktrees/detached',
          head: '0123456789abcdef',
        },
        {
          path: '/repo/.worktrees/feature',
          head: 'abcdef0123456789',
          branch: 'feat/polish',
        },
      ]);
    }
  );
});

export {};
