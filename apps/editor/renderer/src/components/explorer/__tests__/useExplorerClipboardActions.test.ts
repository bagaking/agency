import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildExplorerClipboardState,
  hasExplorerExternalClipboardPayload,
  shouldUseInternalExplorerClipboard,
} from '../useExplorerClipboardActions';

test('buildExplorerClipboardState clears internal copy state after system clipboard write succeeds', () => {
  assert.equal(
    buildExplorerClipboardState({
      mode: 'copy',
      selectionTargets: ['docs/guide.md'],
      wroteSystemClipboard: true,
    }),
    null
  );
});

test('buildExplorerClipboardState clears internal cut state once the system clipboard carries explorer metadata', () => {
  assert.equal(
    buildExplorerClipboardState({
      mode: 'cut',
      selectionTargets: ['docs/guide.md', 'docs/guide.md'],
      wroteSystemClipboard: true,
    }),
    null
  );
});

test('shouldUseInternalExplorerClipboard prioritizes explicit internal paste state', () => {
  assert.equal(
    shouldUseInternalExplorerClipboard({
      mode: 'cut',
      paths: ['docs/guide.md'],
      preferInternalPaste: true,
    }),
    true
  );
  assert.equal(
    shouldUseInternalExplorerClipboard({
      mode: 'copy',
      paths: ['docs/guide.md'],
      preferInternalPaste: false,
    }),
    false
  );
  assert.equal(shouldUseInternalExplorerClipboard(null), false);
});

test('buildExplorerClipboardState keeps internal copy fallback when system clipboard write fails', () => {
  assert.deepEqual(
    buildExplorerClipboardState({
      mode: 'copy',
      selectionTargets: ['docs/guide.md'],
      wroteSystemClipboard: false,
    }),
    {
      mode: 'copy',
      paths: ['docs/guide.md'],
      preferInternalPaste: true,
    }
  );
});

test('buildExplorerClipboardState keeps internal cut fallback when system clipboard write fails', () => {
  assert.deepEqual(
    buildExplorerClipboardState({
      mode: 'cut',
      selectionTargets: ['docs/guide.md'],
      wroteSystemClipboard: false,
    }),
    {
      mode: 'cut',
      paths: ['docs/guide.md'],
      preferInternalPaste: true,
    }
  );
});

test('hasExplorerExternalClipboardPayload only reports file/image clipboard imports', () => {
  assert.equal(hasExplorerExternalClipboardPayload({ hasFiles: true, hasImage: false }), true);
  assert.equal(hasExplorerExternalClipboardPayload({ hasFiles: false, hasImage: true }), true);
  assert.equal(hasExplorerExternalClipboardPayload({ hasFiles: false, hasImage: false }), false);
  assert.equal(hasExplorerExternalClipboardPayload(null), false);
});
