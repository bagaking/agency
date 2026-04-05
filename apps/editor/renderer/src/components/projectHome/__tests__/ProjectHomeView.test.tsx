import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { ProjectHomeView } from '../ProjectHomeView';

test('ProjectHomeView separates the primary project action from window scope summary', () => {
  const html = renderToStaticMarkup(
    <ProjectHomeView
      homePath="/Users/bytedance"
      recentProjects={[]}
      projectError=""
      shellSummary={{
        visible: false,
        status: 'idle',
        error: '',
        cwd: '/Users/bytedance',
        isRunning: false,
      }}
      onSelectProject={() => undefined}
      onOpenRecentProject={() => undefined}
      onOpenHomeShell={() => undefined}
      onCloseHomeShell={() => undefined}
      onHomeShellReady={() => undefined}
      onHomeShellExit={() => undefined}
      onHomeShellError={() => undefined}
    />
  );

  assert.match(html, /Project Home/);
  assert.match(html, /Window-owned/);
  assert.match(html, /Open Project/);
  assert.match(html, /Window Scope/);
  assert.match(html, /Home shell idle/);
});

test('ProjectHomeView keeps home-shell failure visible in the window scope summary', () => {
  const html = renderToStaticMarkup(
    <ProjectHomeView
      homePath="/Users/bytedance"
      recentProjects={[]}
      projectError=""
      shellSummary={{
        visible: false,
        status: 'error',
        error: 'Home shell failed to start.',
        cwd: '/Users/bytedance',
        isRunning: false,
      }}
      onSelectProject={() => undefined}
      onOpenRecentProject={() => undefined}
      onOpenHomeShell={() => undefined}
      onCloseHomeShell={() => undefined}
      onHomeShellReady={() => undefined}
      onHomeShellExit={() => undefined}
      onHomeShellError={() => undefined}
    />
  );

  assert.match(html, /Home shell failed/);
  assert.match(html, /Home shell failed to start\./);
});
