import assert from 'node:assert/strict';
import test from 'node:test';

import { buildTreeFromMatches } from '../projectExplorerSearchTree';

test('buildTreeFromMatches preserves symbolic-link metadata on matched entries', () => {
  const tree = buildTreeFromMatches([
    {
      path: 'docs/guide-link.md',
      name: 'guide-link.md',
      type: 'file',
      isSymbolicLink: true,
    },
  ]);

  assert.equal(tree.nodes['docs/guide-link.md']?.type, 'file');
  assert.equal(tree.nodes['docs/guide-link.md']?.isSymbolicLink, true);
  assert.deepEqual(tree.children[''], ['docs']);
  assert.deepEqual(tree.children.docs, ['docs/guide-link.md']);
});

test('buildTreeFromMatches remains backward-compatible with plain string paths', () => {
  const tree = buildTreeFromMatches(['apps/editor/main.ts']);

  assert.equal(tree.nodes['apps/editor/main.ts']?.type, 'file');
  assert.equal(tree.nodes['apps/editor/main.ts']?.isSymbolicLink, false);
});
