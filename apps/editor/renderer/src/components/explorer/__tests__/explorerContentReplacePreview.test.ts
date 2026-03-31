import assert from 'node:assert/strict';
import test from 'node:test';

import { buildExplorerContentReplacePreview } from '../explorerContentReplacePreview';

test('buildExplorerContentReplacePreview renders a replacement preview for matching snippets', () => {
  assert.equal(
    buildExplorerContentReplacePreview({
      snippet: 'const searchTerm = "hello";',
      query: 'hello',
      replacement: 'world',
    }),
    'const searchTerm = "world";'
  );
});

test('buildExplorerContentReplacePreview returns empty string when there is no match', () => {
  assert.equal(
    buildExplorerContentReplacePreview({
      snippet: 'const searchTerm = "hello";',
      query: 'goodbye',
      replacement: 'world',
    }),
    ''
  );
});
