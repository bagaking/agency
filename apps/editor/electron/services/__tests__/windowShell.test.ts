const test = require('node:test');
const assert = require('node:assert/strict');

const { resolveActivatedEditorWindow } = require('../windowShell.ts');

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

export {};
