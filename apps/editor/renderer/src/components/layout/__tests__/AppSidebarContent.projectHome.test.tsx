import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { AppSidebarContent } from '../AppSidebarContent';

test('AppSidebarContent prefers Project Home sidebar when no-project home is visible', () => {
  const html = renderToStaticMarkup(
    <AppSidebarContent
      activeView="agent-cells"
      projectHomeVisible={true}
      projectHomeSidebarProps={{
        homePath: '/Users/bytedance',
        recentProjects: [],
      }}
      projectContext={{}}
      agentCellsProps={{}}
      hierarchySidebarProps={{}}
      actionSheetsProps={{}}
      memoSidebarProps={{}}
    />
  );

  assert.match(html, /Project Home/);
  assert.match(html, /Open a repository or start a scratch shell for this window\./);
  assert.doesNotMatch(html, /Agent Cells/);
});
