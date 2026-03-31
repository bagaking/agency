import assert from 'node:assert/strict';
import test from 'node:test';

import { isProjectBackedCell, isWindowHomeCell } from '../windowHomeCell';

test('isWindowHomeCell matches explicit window-owned home cells', () => {
  assert.equal(
    isWindowHomeCell({
      id: 'local-terminal',
      ownerKind: 'window-home',
      isVirtual: true,
    }),
    true
  );
});

test('isWindowHomeCell preserves compatibility for legacy local-terminal placeholder data', () => {
  assert.equal(
    isWindowHomeCell({
      id: 'local-terminal',
      isVirtual: true,
    }),
    true
  );
});

test('isProjectBackedCell rejects window-owned placeholders and keeps real cells valid', () => {
  assert.equal(
    isProjectBackedCell({
      id: 'local-terminal',
      ownerKind: 'window-home',
      isVirtual: true,
    }),
    false
  );
  assert.equal(
    isProjectBackedCell({
      id: 'cell-alpha',
      ownerKind: 'cell',
      isVirtual: false,
    }),
    true
  );
});
