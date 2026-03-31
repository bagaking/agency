import assert from 'node:assert/strict';
import test from 'node:test';

import { buildExplorerContentSearchMatchKey } from '../useExplorerContentSearch';

test('buildExplorerContentSearchMatchKey remains stable across identical match references', () => {
  const first = buildExplorerContentSearchMatchKey({
    path: 'docs/guide.md',
    line: 4,
    column: 9,
    endColumn: 16,
    text: 'replace',
  });
  const second = buildExplorerContentSearchMatchKey({
    path: 'docs/guide.md',
    line: 4,
    column: 9,
    endColumn: 16,
    text: 'replace',
  });

  assert.equal(first, second);
});

test('buildExplorerContentSearchMatchKey differentiates same coordinates with different text', () => {
  const before = buildExplorerContentSearchMatchKey({
    path: 'docs/guide.md',
    line: 4,
    column: 9,
    endColumn: 16,
    text: 'replace',
  });
  const after = buildExplorerContentSearchMatchKey({
    path: 'docs/guide.md',
    line: 4,
    column: 9,
    endColumn: 16,
    text: 'preview',
  });

  assert.notEqual(before, after);
});
