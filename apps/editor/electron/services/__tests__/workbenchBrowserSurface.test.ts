const test = require('node:test');
const assert = require('node:assert/strict');

const {
  normalizeBrowserSurfaceUrl,
  normalizeWorkbenchBrowserSurfaceBounds,
} = require('../workbenchBrowserSurface.ts');

test('normalizeBrowserSurfaceUrl keeps browser-surface navigation on public http urls', () => {
  assert.equal(
    normalizeBrowserSurfaceUrl('https://example.com/docs'),
    'https://example.com/docs'
  );
  assert.equal(
    normalizeBrowserSurfaceUrl('http://example.com/docs'),
    'http://example.com/docs'
  );
  assert.equal(normalizeBrowserSurfaceUrl('ftp://example.com/file.txt'), '');
  assert.equal(normalizeBrowserSurfaceUrl('about:blank'), '');
});

test('normalizeWorkbenchBrowserSurfaceBounds clamps and rejects empty rects', () => {
  assert.deepEqual(
    normalizeWorkbenchBrowserSurfaceBounds({
      x: 12.8,
      y: 20.1,
      width: 500.9,
      height: 320.4,
    }),
    {
      x: 12,
      y: 20,
      width: 500,
      height: 320,
    }
  );

  assert.equal(
    normalizeWorkbenchBrowserSurfaceBounds({
      x: 0,
      y: 0,
      width: 0,
      height: 100,
    }),
    null
  );
});

export {};
