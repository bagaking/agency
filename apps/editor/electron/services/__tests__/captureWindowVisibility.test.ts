const test = require('node:test');
const assert = require('node:assert/strict');

const {
  focusAgencyWindow,
  restoreAgencyAppVisibility,
  showAgencyWindows,
} = require('../screenshotCapture/windowVisibility.ts');

test('restoreAgencyAppVisibility re-shows the docked app on darwin', () => {
  const calls = [];
  restoreAgencyAppVisibility(
    {
      show() {
        calls.push('app.show');
      },
      dock: {
        show() {
          calls.push('dock.show');
        },
      },
    },
    { platform: 'darwin' }
  );

  assert.deepEqual(calls, ['dock.show', 'app.show']);
});

test('restoreAgencyAppVisibility is a no-op outside darwin', () => {
  const calls = [];
  restoreAgencyAppVisibility(
    {
      show() {
        calls.push('app.show');
      },
      dock: {
        show() {
          calls.push('dock.show');
        },
      },
    },
    { platform: 'linux' }
  );

  assert.deepEqual(calls, []);
});

test('showAgencyWindows only restores non-destroyed windows', () => {
  const calls = [];
  showAgencyWindows([
    {
      isDestroyed() {
        return false;
      },
      show() {
        calls.push('visible.show');
      },
    },
    {
      isDestroyed() {
        return true;
      },
      show() {
        calls.push('destroyed.show');
      },
    },
  ]);

  assert.deepEqual(calls, ['visible.show']);
});

test('focusAgencyWindow restores minimized windows before showing and focusing them', () => {
  const calls = [];
  focusAgencyWindow({
    isDestroyed() {
      return false;
    },
    isMinimized() {
      return true;
    },
    restore() {
      calls.push('restore');
    },
    show() {
      calls.push('show');
    },
    focus() {
      calls.push('focus');
    },
  });

  assert.deepEqual(calls, ['restore', 'show', 'focus']);
});

export {};
