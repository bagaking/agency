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
