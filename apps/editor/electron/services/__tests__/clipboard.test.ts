const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const Module = require('node:module');

const clipboardModulePath = require.resolve('../clipboard.ts');

export {};

function createClipboardMock() {
  const formats = new Map();
  let text = '';
  return {
    clear() {
      formats.clear();
      text = '';
    },
    writeText(value) {
      text = String(value || '');
    },
    writeBuffer(format, buffer) {
      formats.set(format, Buffer.from(buffer));
    },
    availableFormats() {
      return Array.from(formats.keys());
    },
    read(format) {
      const value = formats.get(format);
      return value ? value.toString('utf8') : '';
    },
    readBuffer(format) {
      return formats.get(format) || Buffer.alloc(0);
    },
    readText() {
      return text;
    },
    readHTML() {
      return '';
    },
    readImage() {
      return {
        isEmpty() {
          return true;
        },
      };
    },
  };
}

async function withClipboardService(run) {
  const clipboardMock = createClipboardMock();
  const originalLoad = Module._load;
  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === 'electron') {
      return {
        clipboard: clipboardMock,
      };
    }
    return originalLoad.call(this, request, parent, isMain);
  };

  delete require.cache[clipboardModulePath];
  const clipboardModule = require(clipboardModulePath);

  try {
    await run(clipboardModule, clipboardMock);
  } finally {
    delete require.cache[clipboardModulePath];
    Module._load = originalLoad;
  }
}

async function createRoot() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'agency-clipboard-'));
}

async function writeTextFile(filePath, content) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, 'utf8');
}

test('writeClipboardFileReferences publishes URI-list formats and materializeClipboard preserves explorer-local selection semantics', async (t) => {
  await withClipboardService(async ({ writeClipboardFileReferences, materializeClipboard }, clipboardMock) => {
    const rootDir = await createRoot();
    t.after(async () => {
      await fs.rm(rootDir, { recursive: true, force: true });
    });

    await writeTextFile(path.join(rootDir, 'docs', 'guide.md'), 'guide');

    const result = await writeClipboardFileReferences({
      rootPath: rootDir,
      relativePaths: ['docs/guide.md'],
      mode: 'cut',
    });

    assert.equal(result.type, 'file-references');
    assert.deepEqual(result.paths, ['docs/guide.md']);
    assert.equal(result.mode, 'cut');
    assert.match(clipboardMock.read('text/uri-list'), /file:\/\//);
    assert.match(clipboardMock.readText(), /guide\.md/);
    assert.match(clipboardMock.read('text/plain'), /guide\.md/);
    assert.match(clipboardMock.read('public.utf8-plain-text'), /guide\.md/);
    assert.match(clipboardMock.read('public.url'), /guide\.md/);

    const paste = await materializeClipboard({
      rootPath: rootDir,
      targetDir: 'copied',
      includeText: false,
      relativeTo: rootDir,
    });

    assert.equal(paste.type, 'explorer-selection');
    assert.equal(paste.mode, 'cut');
    assert.deepEqual(paste.paths, ['docs/guide.md']);
  });
});

test('materializeClipboard falls back to file import when explorer clipboard metadata belongs to another root', async (t) => {
  await withClipboardService(async ({ writeClipboardFileReferences, materializeClipboard }) => {
    const sourceRoot = await createRoot();
    const targetRoot = await createRoot();
    t.after(async () => {
      await fs.rm(sourceRoot, { recursive: true, force: true });
      await fs.rm(targetRoot, { recursive: true, force: true });
    });

    await writeTextFile(path.join(sourceRoot, 'docs', 'guide.md'), 'guide');
    await writeClipboardFileReferences({
      rootPath: sourceRoot,
      relativePaths: ['docs/guide.md'],
      mode: 'copy',
    });

    const paste = await materializeClipboard({
      rootPath: targetRoot,
      targetDir: 'copied',
      includeText: false,
      relativeTo: targetRoot,
    });

    assert.equal(paste.type, 'files');
    assert.deepEqual(paste.paths, ['copied/guide.md']);
    assert.equal(await fs.readFile(path.join(targetRoot, 'copied', 'guide.md'), 'utf8'), 'guide');
  });
});

test('writeClipboardFileReferences rejects empty selections', async () => {
  await withClipboardService(async ({ writeClipboardFileReferences }) => {
    await assert.rejects(
      () =>
        writeClipboardFileReferences({
          rootPath: '/tmp/project',
          relativePaths: [],
        }),
      /relativePaths must contain at least one path/
    );
  });
});

test('inspectClipboardPayload reports file references written by Explorer copy', async () => {
  await withClipboardService(async ({ inspectClipboardPayload, writeClipboardFileReferences }) => {
    const rootDir = await createRoot();
    try {
      await writeTextFile(path.join(rootDir, 'docs', 'guide.md'), 'guide');
      await writeClipboardFileReferences({
        rootPath: rootDir,
        relativePaths: ['docs/guide.md'],
      });

      const result = inspectClipboardPayload();
      assert.equal(result.hasFiles, true);
      assert.equal(result.hasImage, false);
      assert.equal(result.fileCount, 1);
      assert.equal(result.explorerSelection?.mode, 'copy');
    } finally {
      await fs.rm(rootDir, { recursive: true, force: true });
    }
  });
});
