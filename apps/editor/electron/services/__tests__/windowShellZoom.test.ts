const test = require('node:test');
const assert = require('node:assert/strict');

const { toggleEditorWindowZoom } = require('../windowShell.ts');

export {};

test('toggleEditorWindowZoom maximizes, restores, and exits fullscreen in the expected order', () => {
  const calls = [];
  const window = {
    fullscreen: false,
    maximized: false,
    isDestroyed() {
      return false;
    },
    isFullScreen() {
      return this.fullscreen;
    },
    isMaximized() {
      return this.maximized;
    },
    setFullScreen(nextValue) {
      calls.push(`fullscreen:${nextValue}`);
      this.fullscreen = nextValue;
    },
    maximize() {
      calls.push('maximize');
      this.maximized = true;
    },
    unmaximize() {
      calls.push('unmaximize');
      this.maximized = false;
    },
  };

  toggleEditorWindowZoom(window);
  toggleEditorWindowZoom(window);
  window.fullscreen = true;
  toggleEditorWindowZoom(window);

  assert.deepEqual(calls, ['maximize', 'unmaximize', 'fullscreen:false']);
});
