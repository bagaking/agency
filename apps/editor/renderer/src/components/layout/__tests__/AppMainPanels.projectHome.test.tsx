import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { AppMainPanels } from '../AppMainPanels';

test('AppMainPanels renders Project Home ahead of explorer and agent panes when visible', () => {
  const html = renderToStaticMarkup(
    <AppMainPanels
      activeView="explorer"
      projectHomeVisible={true}
      projectHomeViewProps={{
        recentProjects: [
          {
            name: 'agency',
            path: '/repo/agency',
            lastOpenedAt: new Date().toISOString(),
            exists: true,
          },
        ],
        shellSummary: {
          visible: false,
          cwd: '/Users/bytedance',
        },
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
  assert.match(html, /Pick up a repository fast, or open one clean scratch shell for this window\./);
  assert.match(html, /agency/);
});
