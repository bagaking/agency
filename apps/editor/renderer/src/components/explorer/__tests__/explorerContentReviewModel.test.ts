import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildExplorerConfirmedContentFilePaths,
  buildExplorerContentReplaceRequest,
} from '../explorerContentReviewModel';

test('buildExplorerConfirmedContentFilePaths keeps reviewed file counts inclusive of match-reviewed files', () => {
  const reviewedPaths = buildExplorerConfirmedContentFilePaths({
    fullFilePaths: ['docs/hidden.md'],
    confirmedMatches: [
      {
        path: 'docs/guide.md',
        line: 3,
        column: 1,
        endColumn: 15,
        text: 'content search',
      },
    ],
  });

  assert.deepEqual(reviewedPaths, ['docs/hidden.md', 'docs/guide.md']);
});

test('buildExplorerContentReplaceRequest keeps confirmedPaths exclusive to explicit full-file review', () => {
  const request = buildExplorerContentReplaceRequest({
    fullFilePaths: ['docs/hidden.md'],
    confirmedMatches: [
      {
        path: 'docs/guide.md',
        line: 3,
        column: 1,
        endColumn: 15,
        text: 'content search',
      },
    ],
  });

  assert.deepEqual(request.confirmedPaths, ['docs/hidden.md']);
  assert.equal(request.confirmedMatches.length, 1);
  assert.equal(request.confirmedMatches[0]?.path, 'docs/guide.md');
});
