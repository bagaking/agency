import assert from 'node:assert/strict';
import test from 'node:test';

import { extractFileReferences, resolveFileReferenceTarget } from '../fileReferences';

test('resolveFileReferenceTarget keeps relative path inside root', () => {
  const rootPath = '/tmp/agency/worktree';

  const relative = resolveFileReferenceTarget({
    path: 'src/app.ts:12:3',
    rootPath,
  });
  assert.deepEqual(relative, {
    relativePath: 'src/app.ts:12:3',
    absolutePath: '/tmp/agency/worktree/src/app.ts:12:3',
  });

  const absolute = resolveFileReferenceTarget({
    path: '/tmp/agency/worktree/src/app.ts',
    rootPath,
  });
  assert.deepEqual(absolute, {
    relativePath: 'src/app.ts',
    absolutePath: '/tmp/agency/worktree/src/app.ts',
  });

  const outside = resolveFileReferenceTarget({
    path: '/tmp/other/app.ts',
    rootPath,
  });
  assert.equal(outside, null);
});

test('extractFileReferences parses line/column and deduplicates entries', () => {
  const rootPath = '/tmp/agency/worktree';
  const output = [
    'error at src/main.ts:33:5',
    'and src/main.ts:33:5 again',
    'open /tmp/agency/worktree/docs/guide.md:18',
    'ignore /tmp/outside/path.ts:1',
  ].join('\n');

  const refs = extractFileReferences(output, { rootPath, limit: 5 });

  assert.equal(refs.length, 2);
  assert.equal(refs[0]?.relativePath, 'src/main.ts');
  assert.equal(refs[0]?.line, 33);
  assert.equal(refs[0]?.column, 5);
  assert.equal(refs[1]?.relativePath, 'docs/guide.md');
  assert.equal(refs[1]?.line, 18);
  assert.equal(refs[1]?.column, null);
});
