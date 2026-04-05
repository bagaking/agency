const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildWindowDisplayAnchor,
  focusEditorWindow,
  orderEditorWindowsByStateId,
  resolveWindowBoundsFromDisplayAnchor,
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

test('buildWindowDisplayAnchor captures relative geometry for a display work area', () => {
  const anchor = buildWindowDisplayAnchor(
    { x: 1000, y: 80, width: 960, height: 800 },
    {
      id: 'display-2',
      workArea: { x: 960, y: 24, width: 1920, height: 1056 },
    }
  );

  assert.equal(anchor?.displayId, 'display-2');
  assert.equal(anchor?.relativeBounds?.x, (1000 - 960) / 1920);
  assert.equal(anchor?.relativeBounds?.y, (80 - 24) / 1056);
  assert.equal(anchor?.relativeBounds?.width, 960 / 1920);
  assert.equal(anchor?.relativeBounds?.height, 800 / 1056);
});

test('resolveWindowBoundsFromDisplayAnchor restores bounds on the anchored display', () => {
  const restored = resolveWindowBoundsFromDisplayAnchor({
    bounds: { x: 10, y: 10, width: 1200, height: 840 },
    anchor: {
      displayId: 'display-2',
      relativeBounds: {
        x: 0.5,
        y: 0.1,
        width: 0.5,
        height: 0.75,
      },
    },
    displays: [
      { id: 'display-1', workArea: { x: 0, y: 24, width: 1600, height: 876 } },
      { id: 'display-2', workArea: { x: 1600, y: 24, width: 1600, height: 876 } },
    ],
    minWidth: 600,
    minHeight: 500,
  });

  assert.deepEqual(restored, {
    x: 2400,
    y: 112,
    width: 800,
    height: 657,
  });
});

test('resolveWindowBoundsFromDisplayAnchor returns null when anchored display is unavailable', () => {
  const restored = resolveWindowBoundsFromDisplayAnchor({
    bounds: { x: 100, y: 100, width: 1200, height: 820 },
    anchor: {
      displayId: 'display-2',
      relativeBounds: { x: 0.4, y: 0.2, width: 0.7, height: 0.7 },
    },
    displays: [{ id: 'display-1', workArea: { x: 0, y: 24, width: 1728, height: 1080 } }],
  });

  assert.equal(restored, null);
});

export {};
