import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { ActivityBar } from '../ActivityBar';

test('ActivityBar exposes a shell-level sidebar toggle only for sidebar-backed views', () => {
  const html = renderToStaticMarkup(
    <ActivityBar
      activeView="explorer"
      onSwitchView={() => undefined}
      sidebarVisible={true}
      sidebarCollapsed={false}
      onToggleSidebar={() => undefined}
    />
  );

  assert.match(html, /Collapse left sidebar/);
});

test('ActivityBar hides the sidebar toggle when the current view has no docked sidebar', () => {
  const html = renderToStaticMarkup(
    <ActivityBar
      activeView="settings"
      onSwitchView={() => undefined}
      sidebarVisible={false}
      sidebarCollapsed={false}
      onToggleSidebar={() => undefined}
    />
  );

  assert.doesNotMatch(html, /Collapse left sidebar/);
  assert.doesNotMatch(html, /Expand left sidebar/);
});

test('ActivityBar reports the expand label when the docked sidebar is collapsed', () => {
  const html = renderToStaticMarkup(
    <ActivityBar
      activeView="memo"
      onSwitchView={() => undefined}
      sidebarVisible={true}
      sidebarCollapsed={true}
      onToggleSidebar={() => undefined}
    />
  );

  assert.match(html, /Expand left sidebar/);
});
