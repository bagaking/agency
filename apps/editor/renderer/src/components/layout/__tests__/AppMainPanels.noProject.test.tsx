import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { AppMainPanels } from '../AppMainPanels';

test('AppMainPanels renders the shared Project Home surface for no-project explorer and agent-cells states', () => {
  const html = renderToStaticMarkup(
    <AppMainPanels
      activeView="explorer"
      projectHomeVisible={true}
      projectHomeViewProps={{
        homePath: '/Users/bytedance',
        recentProjects: [],
        projectError: '',
        shellSummary: {
          visible: false,
          status: 'idle',
          error: '',
          cwd: '/Users/bytedance',
          isRunning: false,
        },
        onSelectProject: () => undefined,
        onOpenRecentProject: () => undefined,
        onOpenHomeShell: () => undefined,
        onCloseHomeShell: () => undefined,
        onHomeShellReady: () => undefined,
        onHomeShellExit: () => undefined,
        onHomeShellError: () => undefined,
      }}
      hierarchySection="actions"
      editorPaneProps={{}}
      explorerPaneProps={{}}
      memoPaneProps={{}}
      actionSheetsProps={{}}
      quickActionsViewProps={{}}
      harnessProviderSettingsViewProps={{}}
      appShortcutsViewProps={{}}
      replyQuickPromptsViewProps={{}}
      sessionNamingViewProps={{}}
      gatesViewProps={{}}
      worktreeLinksViewProps={{}}
      projectSettingsViewProps={{}}
    />
  );

  assert.match(html, /Project Home/);
  assert.match(html, /Open Project/);
  assert.match(html, /Window Scope/);
  assert.match(html, /No Recent Projects/);
  assert.doesNotMatch(html, /Select a project to begin/);
});

test('AppMainPanels exposes a shell-owned browser lane surface when explorer pane supplies browser lane meta', () => {
  const html = renderToStaticMarkup(
    <AppMainPanels
      activeView="explorer"
      projectHomeVisible={false}
      projectHomeViewProps={{}}
      hierarchySection="actions"
      editorPaneProps={{}}
      explorerPaneProps={{
        browserLaneMeta: {
          tabId: 'web-tab',
          cellId: 'cell-main',
          url: 'https://example.com/docs',
          navigationKey: 0,
          rect: { x: 100, y: 120, width: 800, height: 600 },
          visible: true,
          suspended: false,
          surfaceState: { phase: 'loading' },
          browserSurfaceAvailable: true,
        },
      }}
      memoPaneProps={{}}
      actionSheetsProps={{}}
      quickActionsViewProps={{}}
      harnessProviderSettingsViewProps={{}}
      appShortcutsViewProps={{}}
      replyQuickPromptsViewProps={{}}
      sessionNamingViewProps={{}}
      gatesViewProps={{}}
      worktreeLinksViewProps={{}}
      projectSettingsViewProps={{}}
    />
  );

  assert.match(html, /data-shell-main-panels/);
  assert.match(html, /data-shell-browser-lane-surface/);
});
