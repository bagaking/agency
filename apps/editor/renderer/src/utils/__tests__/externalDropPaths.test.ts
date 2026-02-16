import assert from 'node:assert/strict';
import test from 'node:test';

import { hasExternalDropEntries, readExternalDropPaths, __testExternalDropPaths } from '../externalDropPaths';

test('hasExternalDropEntries returns false for empty inputs', () => {
  assert.equal(hasExternalDropEntries(null), false);
  assert.equal(hasExternalDropEntries(undefined), false);
  assert.equal(hasExternalDropEntries({}), false);
});

test('hasExternalDropEntries detects file and MIME-based external drops', () => {
  assert.equal(hasExternalDropEntries({ files: [{ path: '/tmp/a.txt' }] }), true);
  assert.equal(hasExternalDropEntries({ items: [{ kind: 'file' }] }), true);
  assert.equal(hasExternalDropEntries({ types: ['text/uri-list'] }), true);
  assert.equal(hasExternalDropEntries({ types: ['DownloadURL'] }), true);
  assert.equal(hasExternalDropEntries({ types: ['text/plain'] }), true);
});

test('readExternalDropPaths deduplicates and preserves insertion order', () => {
  const fileA = { path: '/tmp/a.txt' };
  const itemFile = {};
  const dataTransfer = {
    files: [fileA],
    items: [
      {
        kind: 'file',
        getAsFile() {
          return itemFile;
        },
      },
    ],
    types: ['text/uri-list', 'DownloadURL', 'text/plain'],
    getData(type: string) {
      if (type === 'text/uri-list') {
        return ['file:///tmp/b.txt', '# ignored comment', 'file:///tmp/a.txt'].join('\n');
      }
      if (type === 'DownloadURL') {
        return 'text/plain:notes:file:///tmp/c.txt';
      }
      if (type === 'text/plain') {
        return ['/tmp/d.txt', 'file:///tmp/e.txt', '/tmp/a.txt'].join('\n');
      }
      return '';
    },
  };

  const paths = readExternalDropPaths(dataTransfer, {
    getPathForDroppedFile(file: any) {
      if (file === itemFile) {
        return '/tmp/from-bridge.txt';
      }
      return '';
    },
  });

  assert.deepEqual(paths, [
    '/tmp/a.txt',
    '/tmp/from-bridge.txt',
    '/tmp/b.txt',
    '/tmp/c.txt',
    '/tmp/d.txt',
    '/tmp/e.txt',
  ]);
});

test('readExternalDropPaths falls back to legacy file.path before bridge', () => {
  const fileWithPath = { path: '/tmp/legacy.txt' };
  const paths = readExternalDropPaths(
    {
      files: [fileWithPath],
      getData() {
        return '';
      },
    },
    {
      getPathForDroppedFile() {
        return '/tmp/from-bridge.txt';
      },
    }
  );

  assert.deepEqual(paths, ['/tmp/legacy.txt']);
});

test('parsePlainTextPaths accepts Windows-style absolute paths', () => {
  const parsed = __testExternalDropPaths.parsePlainTextPaths(
    ['C:\\tmp\\a.txt', 'C:/tmp/b.txt'].join('\n')
  );
  assert.deepEqual(parsed, ['C:\\tmp\\a.txt', 'C:/tmp/b.txt']);
});
