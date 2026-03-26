const test = require('node:test');
const assert = require('node:assert/strict');

const {
  focusEditorWindow,
  orderEditorWindowsByStateId,
  resolveActivatedEditorWindow,
} = require('../windowShell.ts');

test('resolveActivatedEditorWindow returns null for empty input', () => {
  assert.equal(resolveActivatedEditorWindow([], '', false), null);
});

test('resolveActivatedEditorWindow restores the first editor window when none is focused', () => {
  const windows = [
    { windowStateId: 'window-a' },
    { windowStateId: 'window-b' },
  ];
  assert.deepEqual(resolveActivatedEditorWindow(windows, '', false), windows[0]);
});

test('resolveActivatedEditorWindow keeps the current window when activation does not request cycling', () => {
  const windows = [
    { windowStateId: 'window-a' },
    { windowStateId: 'window-b' },
  ];
  assert.deepEqual(resolveActivatedEditorWindow(windows, 'window-b', false), windows[1]);
});

test('resolveActivatedEditorWindow cycles editor windows in stable order when activation occurs with visible windows', () => {
  const windows = [
    { windowStateId: 'window-a' },
    { windowStateId: 'window-b' },
    { windowStateId: 'window-c' },
  ];
  assert.deepEqual(resolveActivatedEditorWindow(windows, 'window-a', true), windows[1]);
  assert.deepEqual(resolveActivatedEditorWindow(windows, 'window-b', true), windows[2]);
  assert.deepEqual(resolveActivatedEditorWindow(windows, 'window-c', true), windows[0]);
});

test('resolveActivatedEditorWindow falls back to the first window when the focused window is not in the stable cycle order', () => {
  const windows = [
    { windowStateId: 'window-a' },
    { windowStateId: 'window-b' },
  ];
  assert.deepEqual(resolveActivatedEditorWindow(windows, 'window-missing', true), windows[0]);
});

test('orderEditorWindowsByStateId preserves the persisted open-window order used for dock activation cycling', () => {
  const windows = [
    { windowId: 30, windowStateId: 'window-c' },
    { windowId: 10, windowStateId: 'window-a' },
    { windowId: 20, windowStateId: 'window-b' },
  ];

  const ordered = orderEditorWindowsByStateId(windows, ['window-b', 'window-c', 'window-a']);

  assert.deepEqual(
    ordered.map((window) => window.windowStateId),
    ['window-b', 'window-c', 'window-a']
  );
});

test('focusEditorWindow restores minimized windows before showing and focusing them', () => {
  const calls = [];
  const window = {
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
  };

  focusEditorWindow(window);

  assert.deepEqual(calls, ['restore', 'show', 'focus']);
});

export {};
