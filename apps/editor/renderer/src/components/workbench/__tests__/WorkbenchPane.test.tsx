import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { WorkbenchPane } from '../WorkbenchPane';

test('WorkbenchPane exposes truthful quick-open affordance without dead split control', () => {
  const html = renderToStaticMarkup(
    <WorkbenchPane
      workbench={{
        tabs: [
          {
            id: 'tab-1',
            path: 'apps/editor/package.json',
            rootPath: '/repo',
            title: 'package.json',
            kind: 'code',
            isPreview: false,
          },
        ],
        activeTab: {
          id: 'tab-1',
          path: 'apps/editor/package.json',
          rootPath: '/repo',
          title: 'package.json',
          kind: 'code',
          isPreview: false,
        },
        openFile() {},
        closeTab() {},
        closeOtherTabs() {},
        closeAllTabs() {},
        pinTab() {},
        setActiveTab() {},
      }}
      activeRootPath="/repo"
      activeRootLabel="main"
      onTabMetaChange={() => undefined}
      cellId="cell-main"
      projectReady={true}
      projectError=""
      onSelectProject={() => undefined}
      commentLines={[]}
      onOpenComment={() => undefined}
      onCursorPositionChange={() => undefined}
      onSelectionChange={() => undefined}
      pendingJump={null}
      onJumpHandled={() => undefined}
      onRevealPathInExplorer={() => undefined}
    />
  );

  assert.match(html, /Quick Open/);
  assert.doesNotMatch(html, />Split</);
});
