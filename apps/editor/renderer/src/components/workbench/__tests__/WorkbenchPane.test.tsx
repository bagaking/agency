import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { WorkbenchPane } from '../WorkbenchPane';

function renderWorkbenchPane(kind: string) {
  return renderToStaticMarkup(
    <WorkbenchPane
      workbench={{
        tabs: [
          {
            id: 'tab-1',
            path: 'apps/editor/package.json',
            rootPath: '/repo',
            title: 'package.json',
            kind,
            isPreview: false,
          },
        ],
        activeTab: {
          id: 'tab-1',
          path: 'apps/editor/package.json',
          rootPath: '/repo',
          title: 'package.json',
          kind,
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
}

test('WorkbenchPane keeps quick-open and demotes review tools to contextual secondary actions', () => {
  const html = renderWorkbenchPane('code');

  assert.match(html, /Quick Open/);
  assert.doesNotMatch(html, />Split</);
  assert.match(html, /data-workbench-file-tools/);
  assert.match(html, /data-workbench-review-tools/);
  assert.ok(
    html.indexOf('data-workbench-file-tools') < html.indexOf('data-workbench-review-tools')
  );
});

test('WorkbenchPane hides review tools when active tab is not code', () => {
  const html = renderWorkbenchPane('image');

  assert.match(html, /Quick Open/);
  assert.doesNotMatch(html, /data-workbench-review-tools/);
});
