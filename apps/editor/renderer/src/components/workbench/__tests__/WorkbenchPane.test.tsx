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

test('WorkbenchPane keeps quick-open primary and does not expose contextual review tools before code state resolves', () => {
  const html = renderWorkbenchPane('code');

  assert.match(html, /Quick Open/);
  assert.match(html, /aria-label="Quick Open"/);
  assert.doesNotMatch(html, />Split</);
  assert.match(html, /data-workbench-file-tools/);
  assert.doesNotMatch(html, /data-workbench-review-tools/);
  assert.doesNotMatch(html, /aria-pressed=/);
});

test('WorkbenchPane keeps file-tool buttons explicitly named without toggle semantics in static shell markup', () => {
  const html = renderWorkbenchPane('image');

  assert.match(html, /aria-label="Sync from Disk"/);
  assert.match(html, /aria-label="Pinned"/);
  assert.doesNotMatch(html, /aria-pressed=/);
});
