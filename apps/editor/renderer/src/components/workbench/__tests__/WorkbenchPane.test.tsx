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

async function mountWorkbenchPane(
  path: string,
  kind: string,
  options: { onOpenComment?: ((payload: { line: number; column: number }) => void) | null } = {}
) {
  const root = createRoot(document.getElementById('root')!);
  const onOpenComment =
    Object.prototype.hasOwnProperty.call(options, 'onOpenComment')
      ? options.onOpenComment || undefined
      : () => undefined;
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
        onOpenComment={onOpenComment}
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

async function mountInteractiveWorkbenchPane() {
  const root = createRoot(document.getElementById('root')!);
  const initialTabs = [
    {
      id: 'tab-1',
      path: 'apps/editor/package.json',
      rootPath: '/repo',
      title: 'package.json',
      kind: 'code',
      isPreview: false,
    },
    {
      id: 'tab-2',
      path: 'apps/editor/README.md',
      rootPath: '/repo',
      title: 'README.md',
      kind: 'code',
      isPreview: false,
    },
  ];

  function Harness() {
    const [tabs, setTabs] = React.useState(initialTabs);
    const [activeTabId, setActiveTabId] = React.useState<string | null>(initialTabs[0].id);
    const activeTab = tabs.find((tab) => tab.id === activeTabId) || tabs[0] || null;
    return (
      <WorkbenchPane
        workbench={{
          tabs,
          activeTab,
          openFile() {},
          closeTab(tabId: string) {
            setTabs((current) => current.filter((tab) => tab.id !== tabId));
            setActiveTabId((current) =>
              current === tabId ? initialTabs.find((tab) => tab.id !== tabId)?.id || null : current
            );
          },
          closeOtherTabs() {},
          closeAllTabs() {},
          pinTab() {},
          setActiveTab(tabId: string) {
            setActiveTabId(tabId);
          },
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

  await act(async () => {
    root.render(<Harness />);
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

  assert.match(html, /role="tablist"/);
  assert.match(html, /role="tab"/);
  assert.match(html, /aria-selected="true"/);
  assert.match(html, /aria-label="Sync from Disk"/);
  assert.match(html, /aria-label="Pinned"/);
  assert.match(html, /aria-label="Close package.json"/);
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

test('WorkbenchPane hides review tools when host review capabilities are unavailable', async () => {
  const env = setupDom();
  try {
    delete (window as any).agency.diffWorkbenchEntry;
    delete (window as any).agency.blameWorkbenchEntry;
    const root = await mountWorkbenchPane('apps/editor/package.json', 'code', {
      onOpenComment: null,
    });
    await env.flush();

    assert.equal(document.querySelector('[data-workbench-review-tools]'), null);

    await act(async () => {
      root.unmount();
    });
  } finally {
    env.cleanup();
  }
});

test('WorkbenchPane tablist supports keyboard tab navigation', async () => {
  const env = setupDom();
  try {
    const root = await mountInteractiveWorkbenchPane();
    await env.flush();

    const tabs = Array.from(document.querySelectorAll('[role="tab"]')) as HTMLDivElement[];
    assert.equal(tabs.length, 2);
    assert.equal(tabs[0]?.getAttribute('aria-selected'), 'true');

    await act(async () => {
      tabs[0]?.dispatchEvent(
        new window.KeyboardEvent('keydown', {
          key: 'ArrowRight',
          bubbles: true,
        })
      );
    });
    await env.flush();

    const selectedTab = document.querySelector('[role="tab"][aria-selected="true"]');
    assert.ok(selectedTab);
    assert.match(selectedTab.textContent || '', /README\.md/);

    await act(async () => {
      root.unmount();
    });
  } finally {
    env.cleanup();
  }
});

test('WorkbenchPane close button does not bubble tab-navigation keys back into the parent tab', async () => {
  const env = setupDom();
  try {
    const root = await mountInteractiveWorkbenchPane();
    await env.flush();

    const closeButton = document.querySelector(
      'button[aria-label="Close package.json"]'
    ) as HTMLButtonElement | null;
    assert.ok(closeButton);

    await act(async () => {
      closeButton.dispatchEvent(
        new window.KeyboardEvent('keydown', {
          key: 'ArrowRight',
          bubbles: true,
        })
      );
    });
    await env.flush();

    const selectedTab = document.querySelector('[role="tab"][aria-selected="true"]');
    assert.ok(selectedTab);
    assert.match(selectedTab.textContent || '', /package\.json/);

    await act(async () => {
      root.unmount();
    });
  } finally {
    env.cleanup();
  }
});
