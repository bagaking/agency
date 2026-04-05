import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { ProjectSettingsView } from '../ProjectSettingsView';

test('ProjectSettingsView foregrounds workspace summary before the action grid', () => {
  const html = renderToStaticMarkup(
    <ProjectSettingsView
      projectRoot="/repo/agency"
      projectError=""
      projectReady={true}
      recentProjects={[]}
      tmuxStatus={{ available: true, version: 'tmux 3.4' }}
      onOpenProject={() => undefined}
      onOpenRecent={() => undefined}
      onOpenActions={() => undefined}
      onOpenHarnessProviders={() => undefined}
      onOpenAppShortcuts={() => undefined}
      onOpenReplyQuickPrompts={() => undefined}
      onOpenSoftlinks={() => undefined}
    />
  );

  assert.match(html, /Workspace Settings/);
  assert.match(html, /Repository linked/);
  assert.match(html, /System Status/);
  assert.match(html, /Repository Root/);
  assert.match(html, /Config Scope/);
  assert.match(html, /Switch Project/);
});
