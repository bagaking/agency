const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

const serviceModulePath = require.resolve('../comments.ts');

async function withCommentsService(run) {
  const originalLoad = Module._load;
  const calls = [];

  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === './hil') {
      return {
        listHilItems: async (payload) => {
          calls.push({ type: 'listHilItems', payload });
          return [
            {
              id: 'comment-1',
              kind: 'comment',
              status: 'open',
              body: 'Needs update',
              anchor: { file: 'src/app.ts', line: 4, column: 1 },
              meta: { todo: true, processed: false },
            },
          ];
        },
        createHilItem: async (payload) => {
          calls.push({ type: 'createHilItem', payload });
          return {
            id: 'comment-2',
            kind: 'comment',
            status: 'open',
            body: payload.body,
            anchor: payload.anchor,
            meta: payload.meta,
          };
        },
      };
    }
    if (request === './workbench') {
      return {
        getFileSnippet: async (payload) => {
          calls.push({ type: 'getFileSnippet', payload });
          return {
            line: payload.line,
            snippet: [
              { line: payload.line - 1, content: 'before' },
              { line: payload.line, content: 'target' },
              { line: payload.line + 1, content: 'after' },
            ],
          };
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

test('listComments forwards repo-owned cell context to HIL storage', async () => {
  await withCommentsService(async ({ service, calls }) => {
    const result = await service.listComments({
      repoRootPath: '/repo',
      cellId: 'cell-alpha',
      worktreePath: '/repo/.worktrees/alpha',
      filePath: 'src/app.ts',
    });

    assert.equal(result.length, 1);
    assert.deepEqual(calls, [
      {
        type: 'listHilItems',
        payload: {
          repoRootPath: '/repo',
          cellId: 'cell-alpha',
          worktreePath: '/repo/.worktrees/alpha',
          kind: 'comment',
          filePath: 'src/app.ts',
        },
      },
    ]);
  });
});

test('submitComment uses repo root snippets and repo-owned cell storage without a live worktree', async () => {
  await withCommentsService(async ({ service, calls }) => {
    const result = await service.submitComment({
      repoRootPath: '/repo',
      cellId: 'cell-alpha',
      filePath: 'src/app.ts',
      line: 7,
      column: 2,
      message: 'Ship it',
      todo: true,
    });

    assert.equal(result.id, 'comment-2');
    assert.equal(calls[0]?.type, 'getFileSnippet');
    assert.deepEqual(calls[0]?.payload, {
      rootPath: '/repo',
      targetPath: 'src/app.ts',
      line: 7,
      context: 3,
    });
    assert.equal(calls[1]?.type, 'createHilItem');
    assert.equal(calls[1]?.payload?.repoRootPath, '/repo');
    assert.equal(calls[1]?.payload?.cellId, 'cell-alpha');
    assert.equal(calls[1]?.payload?.worktreePath, undefined);
    assert.equal(calls[1]?.payload?.kind, 'comment');
    assert.equal(calls[1]?.payload?.body, 'Ship it');
    assert.deepEqual(calls[1]?.payload?.anchor, {
      file: 'src/app.ts',
      line: 7,
      column: 2,
    });
    assert.equal(calls[1]?.payload?.meta?.todo, true);
    assert.equal(calls[1]?.payload?.meta?.context?.line, 7);
    assert.equal(calls[1]?.payload?.meta?.context?.line_text, 'target');
    assert.deepEqual(calls[1]?.payload?.meta?.context?.before_ctx, ['before']);
    assert.deepEqual(calls[1]?.payload?.meta?.context?.after_ctx, ['after']);
    assert.match(String(calls[1]?.payload?.meta?.context?.capturedAt || ''), /^\d{4}-\d{2}-\d{2}T/);
  });
});

export {};
