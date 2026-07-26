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
  let watchCallback = null;

  fs.watch = function watchStub(_rootPath, _options, callback) {
    watchCallback = callback;
    return {
      close() {},
    };
  };
  process.env.AGENCY_EXPLORER_WATCH_DEBOUNCE_MS = '5';
  delete require.cache[explorerWatchModulePath];
  const explorerWatch = require(explorerWatchModulePath);

  try {
    await run({
      explorerWatch,
      emit(filename) {
        assert.ok(watchCallback, 'watch callback was registered');
        watchCallback('change', filename);
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
    const changes = [];
    explorerWatch.startExplorerWatch('/tmp/agency-project', (payload) => {
      changes.push(payload);
    });

    [
      'node_modules/pkg/index.js',
      '.electron-build/electron/main.js',
      'dist/renderer/assets/index.js',
      '.worktrees/feature/src/file.ts',
      'coverage/lcov.info',
    ].forEach((filename) => emit(filename));

    await wait(25);
    assert.deepEqual(changes, []);

    emit('src/index.ts');
    await wait(25);

    assert.equal(changes.length, 1);
    assert.deepEqual(changes[0].paths, ['src']);
  });
});

export {};
