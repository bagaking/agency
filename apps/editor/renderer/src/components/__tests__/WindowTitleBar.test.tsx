import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { WindowTitleBar } from '../WindowTitleBar';

test('WindowTitleBar exposes a dedicated drag surface and keeps display text pointer-transparent', () => {
  const html = renderToStaticMarkup(
    <WindowTitleBar
      projectRoot="/tmp/agency/test-cell"
      windows={[]}
      onCreateWindow={() => undefined}
      onFocusWindow={() => undefined}
      onSelectProject={() => undefined}
    />
  );

  assert.match(html, /data-testid="window-titlebar-drag-surface"/);
  assert.match(html, /data-testid="window-titlebar-drag-surface"[^>]*class="app-drag-region absolute inset-0"/);
  assert.match(html, /class="pointer-events-none relative z-10 min-w-0 flex flex-1 select-none items-center overflow-hidden px-2"/);
  assert.match(html, />Windows</);
  assert.match(html, />(Open|Switch) Project</);
});
