const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const explorerWatchModulePath = require.resolve('../explorerWatch.ts');

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function withStubbedWatch(run) {
  const originalWatch = fs.watch;
  const originalDebounce = process.env.AGENCY_EXPLORER_WATCH_DEBOUNCE_MS;
  const watchers = new Map();

  fs.watch = function watchStub(rootPath, _options, callback) {
    const record = {
      callback,
      closed: false,
    };
    watchers.set(rootPath, record);
    return {
      close() {
        record.closed = true;
      },
    };
  };
  process.env.AGENCY_EXPLORER_WATCH_DEBOUNCE_MS = '5';
  delete require.cache[explorerWatchModulePath];
  const explorerWatch = require(explorerWatchModulePath);

  try {
    await run({
      explorerWatch,
      emit(rootPath, filename) {
        const watcher = watchers.get(rootPath);
        assert.ok(watcher, `watch callback was registered for ${rootPath}`);
        watcher.callback('change', filename);
      },
      watcherFor(rootPath) {
        return watchers.get(rootPath);
      },
    });
  } finally {
    explorerWatch.stopExplorerWatch();
    delete require.cache[explorerWatchModulePath];
    fs.watch = originalWatch;
    if (originalDebounce === undefined) {
      delete process.env.AGENCY_EXPLORER_WATCH_DEBOUNCE_MS;
    } else {
      process.env.AGENCY_EXPLORER_WATCH_DEBOUNCE_MS = originalDebounce;
    }
  }
}

test('startExplorerWatch suppresses generated workspace noise before dispatching changes', async () => {
  await withStubbedWatch(async ({ explorerWatch, emit }) => {
    const rootPath = '/tmp/agency-project';
    const changes = [];
    explorerWatch.startExplorerWatch(rootPath, (payload) => {
      changes.push(payload);
    });

    [
      'node_modules/pkg/index.js',
      '.electron-build/electron/main.js',
      'dist/renderer/assets/index.js',
      '.worktrees/feature/src/file.ts',
      'coverage/lcov.info',
    ].forEach((filename) => emit(rootPath, filename));

    await wait(25);
    assert.deepEqual(changes, []);

    emit(rootPath, 'src/index.ts');
    await wait(25);

    assert.equal(changes.length, 1);
    assert.deepEqual(changes[0].paths, ['src']);
  });
});

test('startExplorerWatch keeps independent root watchers active', async () => {
  await withStubbedWatch(async ({ explorerWatch, emit, watcherFor }) => {
    const rootA = '/tmp/agency-project-a';
    const rootB = '/tmp/agency-project-b';
    const changes = [];
    const onChange = (payload) => {
      changes.push(payload);
    };

    explorerWatch.startExplorerWatch(rootA, onChange);
    explorerWatch.startExplorerWatch(rootB, onChange);

    assert.equal(watcherFor(rootA)?.closed, false);
    assert.equal(watcherFor(rootB)?.closed, false);

    emit(rootA, 'src/a.ts');
    emit(rootB, 'docs/b.ts');
    await wait(25);

    assert.deepEqual(
      changes.map((entry) => [entry.rootPath, entry.paths]),
      [
        [rootA, ['src']],
        [rootB, ['docs']],
      ]
    );

    explorerWatch.stopExplorerWatch(rootA);
    assert.equal(watcherFor(rootA)?.closed, true);
    assert.equal(watcherFor(rootB)?.closed, false);

    emit(rootB, 'docs/c.ts');
    await wait(25);

    assert.deepEqual(changes.at(-1)?.rootPath, rootB);
    assert.deepEqual(changes.at(-1)?.paths, ['docs']);
  });
});

export {};
