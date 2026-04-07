import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { WorkbenchBrowserLane } from '../WorkbenchBrowserLane';

test('WorkbenchBrowserLane keeps unavailable fallback inside the lane primitive', () => {
  const html = renderToStaticMarkup(
    <WorkbenchBrowserLane
      browserSurface={{
        browserSurfaceAvailable: false,
        surfaceState: {
          phase: 'hidden',
          error: '',
        },
      }}
      onReload={() => undefined}
      onOpenReader={() => undefined}
      onOpenInBrowser={() => undefined}
    />
  );

  assert.match(html, /Browser Surface Unavailable/);
  assert.match(html, /Open Reader/);
  assert.match(html, /Open in Browser/);
});

test('WorkbenchBrowserLane renders the native host slot when the browser surface is ready', () => {
  const html = renderToStaticMarkup(
    <WorkbenchBrowserLane
      browserSurface={{
        browserSurfaceAvailable: true,
        surfaceState: {
          phase: 'ready',
          error: '',
        },
      }}
      onReload={() => undefined}
      onOpenReader={() => undefined}
      onOpenInBrowser={() => undefined}
    />
  );

  assert.match(html, /workbench-browser-surface-host/);
  assert.doesNotMatch(html, /Browser Surface Unavailable/);
});

test('WorkbenchBrowserLane anchors the live host to the full lane bounds', () => {
  const html = renderToStaticMarkup(
    <WorkbenchBrowserLane
      browserSurface={{
        browserSurfaceAvailable: true,
        surfaceState: {
          phase: 'loading',
        },
      }}
      onReload={() => undefined}
      onOpenReader={() => undefined}
      onOpenInBrowser={() => undefined}
    />
  );

  assert.match(html, /data-testid="workbench-browser-surface-host"/);
  assert.match(html, /class="absolute inset-0 overflow-hidden bg-white"/);
});
