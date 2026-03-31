import assert from 'node:assert/strict';
import test from 'node:test';
import { JSDOM } from 'jsdom';
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
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

function setupDom() {
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
    url: 'http://localhost/',
  });
  const previous = {
    window: globalThis.window,
    document: globalThis.document,
    navigator: globalThis.navigator,
    HTMLElement: globalThis.HTMLElement,
    Node: globalThis.Node,
    Event: globalThis.Event,
    MouseEvent: globalThis.MouseEvent,
    KeyboardEvent: globalThis.KeyboardEvent,
    SVGElement: globalThis.SVGElement,
  };
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    HTMLElement: dom.window.HTMLElement,
    Node: dom.window.Node,
    Event: dom.window.Event,
    MouseEvent: dom.window.MouseEvent,
    KeyboardEvent: dom.window.KeyboardEvent,
    SVGElement: dom.window.SVGElement,
  });
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: dom.window.navigator,
  });
  (dom.window as any).agency = {
    getUiState: async () => ({}),
    setUiState: async () => ({}),
    getWorkbenchProjectPolicy: async () => ({ policy: { languages: { overrides: [] } } }),
    onExplorerChanged: () => () => undefined,
    readWorkbenchEntry: async ({ targetPath }: { targetPath: string }) => ({
      content: `content for ${targetPath}\n`,
      size: 24,
      mtimeMs: 1,
    }),
    statWorkbenchEntry: async () => ({
      size: 24,
      mtimeMs: 1,
    }),
    diffWorkbenchEntry: async () => [],
    blameWorkbenchEntry: async () => [],
  };

  return {
    async flush() {
      await act(async () => {
        await Promise.resolve();
        await new Promise((resolve) => setTimeout(resolve, 0));
      });
    },
    cleanup() {
      delete (dom.window as any).agency;
      Object.assign(globalThis, {
        window: previous.window,
        document: previous.document,
        HTMLElement: previous.HTMLElement,
        Node: previous.Node,
        Event: previous.Event,
        MouseEvent: previous.MouseEvent,
        KeyboardEvent: previous.KeyboardEvent,
        SVGElement: previous.SVGElement,
      });
      Object.defineProperty(globalThis, 'navigator', {
        configurable: true,
        value: previous.navigator,
      });
      delete (globalThis as any).IS_REACT_ACT_ENVIRONMENT;
      dom.window.close();
    },
  };
}

async function mountWorkbenchPane(path: string, kind: string) {
  const root = createRoot(document.getElementById('root')!);
  await act(async () => {
    root.render(
      <WorkbenchPane
        workbench={{
          tabs: [
            {
              id: 'tab-1',
              path,
              rootPath: '/repo',
              title: path.split('/').pop(),
              kind,
              isPreview: false,
            },
          ],
          activeTab: {
            id: 'tab-1',
            path,
            rootPath: '/repo',
            title: path.split('/').pop(),
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
  });
  return root;
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

test('WorkbenchPane shows contextual review tools once the active document resolves to code', async () => {
  const env = setupDom();
  try {
    const root = await mountWorkbenchPane('apps/editor/package.json', 'code');
    await env.flush();

    const reviewTools = document.querySelector('[data-workbench-review-tools]');
    assert.ok(reviewTools);
    assert.equal(
      document.querySelector('button[aria-label="Show Diff"]')?.getAttribute('aria-pressed'),
      'false'
    );
    assert.equal(
      document.querySelector('button[aria-label="Show Blame"]')?.getAttribute('aria-pressed'),
      'false'
    );
    assert.equal(
      document.querySelector('button[aria-label="Sync from Disk"]')?.hasAttribute('aria-pressed'),
      false
    );
    assert.equal(
      document
        .querySelector('button[aria-label="Add HIL Comment"]')
        ?.hasAttribute('aria-pressed'),
      false
    );

    await act(async () => {
      root.unmount();
    });
  } finally {
    env.cleanup();
  }
});

test('WorkbenchPane reveals review tools after unlocking an unknown document into code mode', async () => {
  const env = setupDom();
  try {
    const root = await mountWorkbenchPane('secrets/custom.binary', 'unknown');
    await env.flush();

    assert.equal(document.querySelector('[data-workbench-review-tools]'), null);

    const unlockButton = Array.from(document.querySelectorAll('button')).find((button) =>
      /Bypass & Edit/.test(button.textContent || '')
    ) as HTMLButtonElement | undefined;
    assert.ok(unlockButton);

    await act(async () => {
      unlockButton.click();
    });
    await env.flush();

    assert.ok(document.querySelector('[data-workbench-review-tools]'));

    await act(async () => {
      root.unmount();
    });
  } finally {
    env.cleanup();
  }
});
