const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

const serviceModulePath = require.resolve('../actionSheets.ts');

async function withActionSheetsService(run) {
  const originalLoad = Module._load;
  const calls = [];

  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === './git') {
      return {
        getRepoRoot: async (cwd) => String(cwd || ''),
      };
    }
    if (request === '@agency/agency-data') {
      return {
        listActionSheets: async (payload) => {
          calls.push({ type: 'list', payload });
          return [{ id: 'sheet-1' }];
        },
        createActionSheet: async (payload) => {
          calls.push({ type: 'create', payload });
          return { id: 'sheet-1' };
        },
      };
    }
    return originalLoad.call(this, request, parent, isMain);
  };

  delete require.cache[serviceModulePath];
  const service = require(serviceModulePath);
  try {
    await run({ service, calls });
  } finally {
    delete require.cache[serviceModulePath];
    Module._load = originalLoad;
  }
}

test('actionSheets service accepts project-root scope without a live worktree path', async () => {
  await withActionSheetsService(async ({ service, calls }) => {
    const listed = await service.listActionSheets({
      rootPath: '/repo',
      includeArchived: true,
    });
    const created = await service.createActionSheet({
      projectRoot: '/repo',
      payload: { title: 'Sheet' },
    });

    assert.deepEqual(listed, [{ id: 'sheet-1' }]);
    assert.equal(created.id, 'sheet-1');
    assert.deepEqual(calls, [
      {
        type: 'list',
        payload: {
          worktreePath: '/repo',
          repoRootPath: '/repo',
          includeArchived: true,
        },
      },
      {
        type: 'create',
        payload: {
          worktreePath: '/repo',
          repoRootPath: '/repo',
          payload: { title: 'Sheet' },
        },
      },
    ]);
  });
});

export {};
