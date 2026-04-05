import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { AppSidebarContent } from '../AppSidebarContent';

test('AppSidebarContent uses shared Project Home sidebar for no-project explorer and agent-cells surfaces', () => {
  const html = renderToStaticMarkup(
    <AppSidebarContent
      activeView="agent-cells"
      projectHomeVisible={true}
      projectHomeSidebarProps={{
        projectError: '',
        recentProjects: [],
        shellSummary: {
          cwd: '/Users/bytedance',
          status: 'idle',
        },
        onSelectProject: () => undefined,
        onOpenRecentProject: () => undefined,
        onOpenHomeShell: () => undefined,
      }}
      projectContext={{}}
      agentCellsProps={{}}
      hierarchySidebarProps={{}}
      actionSheetsProps={{}}
      memoSidebarProps={{}}
    />
  );

  assert.match(html, /Project Home/);
  assert.match(html, /Open Project/);
  assert.match(html, /Start Home Shell/);
  assert.doesNotMatch(html, /Agent Cells/);
});
