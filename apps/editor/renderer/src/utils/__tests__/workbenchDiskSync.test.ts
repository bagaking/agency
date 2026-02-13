import assert from 'node:assert/strict';
import test from 'node:test';

import {
  hasDiskVersionAdvanced,
  isPathPossiblyChanged,
  resolveExternalReloadStrategy,
} from '../workbenchDiskSync';

test('hasDiskVersionAdvanced compares mtime with epsilon', () => {
  assert.equal(
    hasDiskVersionAdvanced({ knownMtimeMs: 100, diskMtimeMs: 100.5 }),
    false
  );
  assert.equal(
    hasDiskVersionAdvanced({ knownMtimeMs: 100, diskMtimeMs: 102 }),
    true
  );
  assert.equal(
    hasDiskVersionAdvanced({ knownMtimeMs: 0, diskMtimeMs: 50 }),
    true
  );
  assert.equal(
    hasDiskVersionAdvanced({ knownMtimeMs: 200, diskMtimeMs: 0 }),
    false
  );
});

test('resolveExternalReloadStrategy chooses auto reload vs conflict marker', () => {
  assert.deepEqual(
    resolveExternalReloadStrategy({
      knownMtimeMs: 100,
      diskMtimeMs: 200,
      isDirty: false,
    }),
    {
      diskNewer: true,
      shouldAutoReload: true,
      shouldMarkNeedsReload: false,
    }
  );

  assert.deepEqual(
    resolveExternalReloadStrategy({
      knownMtimeMs: 100,
      diskMtimeMs: 200,
      isDirty: true,
    }),
    {
      diskNewer: true,
      shouldAutoReload: false,
      shouldMarkNeedsReload: true,
    }
  );
});

test('isPathPossiblyChanged matches changed dirs around target file', () => {
  assert.equal(
    isPathPossiblyChanged({
      targetPath: 'src/app/main.ts',
      changedDirs: ['src/app'],
    }),
    true
  );

  assert.equal(
    isPathPossiblyChanged({
      targetPath: 'src/app/main.ts',
      changedDirs: ['src'],
    }),
    true
  );

  assert.equal(
    isPathPossiblyChanged({
      targetPath: 'src/app/main.ts',
      changedDirs: ['docs'],
    }),
    false
  );

  assert.equal(
    isPathPossiblyChanged({
      targetPath: 'src/app/main.ts',
      changedDirs: [''],
    }),
    true
  );
});
