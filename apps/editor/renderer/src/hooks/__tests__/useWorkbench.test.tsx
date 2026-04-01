import assert from 'node:assert/strict';
import test from 'node:test';
import { JSDOM } from 'jsdom';
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';

import { useWorkbench } from '../useWorkbench';

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
    SVGElement: globalThis.SVGElement,
    Event: globalThis.Event,
    MouseEvent: globalThis.MouseEvent,
    KeyboardEvent: globalThis.KeyboardEvent,
    requestAnimationFrame: globalThis.requestAnimationFrame,
    cancelAnimationFrame: globalThis.cancelAnimationFrame,
  };

  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    HTMLElement: dom.window.HTMLElement,
    Node: dom.window.Node,
    SVGElement: dom.window.SVGElement,
    Event: dom.window.Event,
    MouseEvent: dom.window.MouseEvent,
    KeyboardEvent: dom.window.KeyboardEvent,
  });

  const requestAnimationFrame = (callback: FrameRequestCallback) =>
    setTimeout(() => callback(Date.now()), 0) as unknown as number;
  const cancelAnimationFrame = (handle: number) => clearTimeout(handle);
  globalThis.requestAnimationFrame = requestAnimationFrame;
  globalThis.cancelAnimationFrame = cancelAnimationFrame;
  dom.window.requestAnimationFrame = requestAnimationFrame;
  dom.window.cancelAnimationFrame = cancelAnimationFrame;
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: dom.window.navigator,
  });

  return {
    cleanup() {
      Object.assign(globalThis, {
        window: previous.window,
        document: previous.document,
        HTMLElement: previous.HTMLElement,
        Node: previous.Node,
        SVGElement: previous.SVGElement,
        Event: previous.Event,
        MouseEvent: previous.MouseEvent,
        KeyboardEvent: previous.KeyboardEvent,
      });
      globalThis.requestAnimationFrame = previous.requestAnimationFrame;
      globalThis.cancelAnimationFrame = previous.cancelAnimationFrame;
      Object.defineProperty(globalThis, 'navigator', {
        configurable: true,
        value: previous.navigator,
      });
      delete (globalThis as any).IS_REACT_ACT_ENVIRONMENT;
      dom.window.close();
    },
  };
}

function WorkbenchHarness({
  initialTabsByCellId,
}: {
  initialTabsByCellId?: Record<string, any[]>;
}) {
  const workbench = useWorkbench({
    selectedCell: {
      id: 'cell-1',
      worktreePath: '/repo',
    },
    repoRoot: '/repo',
    cells: [],
    initialTabsByCellId,
    initialActiveTabByCellId: {},
  });

  return (
    <div>
      <button
        id="open-svg-preview"
        type="button"
        onClick={() =>
          workbench.openFile({
            path: 'assets/icon.svg',
            mode: 'preview',
            rootPath: undefined,
            cellId: undefined,
          })
        }
      >
        open-svg-preview
      </button>
      <button
        id="open-gitignore-pinned"
        type="button"
        onClick={() =>
          workbench.openFile({
            path: '.gitignore',
            mode: 'pinned',
            rootPath: undefined,
            cellId: undefined,
          })
        }
      >
        open-gitignore-pinned
      </button>
      <button
        id="open-makefile-pinned"
        type="button"
        onClick={() =>
          workbench.openFile({
            path: 'Makefile',
            mode: 'pinned',
            rootPath: undefined,
            cellId: undefined,
          })
        }
      >
        open-makefile-pinned
      </button>
      <button
        id="open-web-research"
        type="button"
        onClick={() =>
          workbench.openBoundedWebResearch({
            url: 'https://example.com/docs',
            rootPath: '/repo',
            cellId: undefined,
            allowMarkdownSave: false,
            allowMemoCapture: false,
          })
        }
      >
        open-web-research
      </button>
      <output id="tabs">
        {JSON.stringify(
          workbench.tabs.map((tab: any) => ({
            path: tab.path,
            kind: tab.kind,
            isPreview: Boolean(tab.isPreview),
            title: tab.title,
            url: tab.url,
            allowMarkdownSave: tab.allowMarkdownSave,
            allowMemoCapture: tab.allowMemoCapture,
          }))
        )}
      </output>
    </div>
  );
}

function readTabs() {
  const text = document.getElementById('tabs')?.textContent || '[]';
  return JSON.parse(text) as Array<{ path: string; kind: string; isPreview: boolean }>;
}

test('useWorkbench.openFile follows shared file kind detection for svg tabs', async () => {
  const env = setupDom();
  try {
    const root = createRoot(document.getElementById('root')!);

    await act(async () => {
      root.render(<WorkbenchHarness />);
    });

    await act(async () => {
      (document.getElementById('open-svg-preview') as HTMLButtonElement).click();
    });

    assert.deepEqual(readTabs(), [
      {
        path: 'assets/icon.svg',
        kind: 'vector',
        isPreview: true,
        title: 'icon.svg',
      },
    ]);

    await act(async () => {
      root.unmount();
    });
  } finally {
    env.cleanup();
  }
});

test('useWorkbench.openFile keeps special no-extension text files as code tabs', async () => {
  const env = setupDom();
  try {
    const root = createRoot(document.getElementById('root')!);

    await act(async () => {
      root.render(<WorkbenchHarness />);
    });

    await act(async () => {
      (document.getElementById('open-gitignore-pinned') as HTMLButtonElement).click();
      (document.getElementById('open-makefile-pinned') as HTMLButtonElement).click();
    });

    assert.deepEqual(readTabs(), [
      {
        path: '.gitignore',
        kind: 'code',
        isPreview: false,
        title: '.gitignore',
      },
      {
        path: 'Makefile',
        kind: 'code',
        isPreview: false,
        title: 'Makefile',
      },
    ]);

    await act(async () => {
      root.unmount();
    });
  } finally {
    env.cleanup();
  }
});

test('useWorkbench hydrates initial tabs with the same shared file kind detection', async () => {
  const env = setupDom();
  try {
    const root = createRoot(document.getElementById('root')!);

    await act(async () => {
      root.render(
        <WorkbenchHarness
          initialTabsByCellId={{
            'cell-1': [
              { path: 'assets/logo.svg', rootPath: '/repo', isPreview: false },
              { path: 'Makefile', rootPath: '/repo', isPreview: true },
            ],
          }}
        />
      );
    });

    assert.deepEqual(readTabs(), [
      {
        path: 'assets/logo.svg',
        kind: 'vector',
        isPreview: false,
        title: 'logo.svg',
      },
      {
        path: 'Makefile',
        kind: 'code',
        isPreview: true,
        title: 'Makefile',
      },
    ]);

    await act(async () => {
      root.unmount();
    });
  } finally {
    env.cleanup();
  }
});

test('useWorkbench opens bounded web research tabs as explicit non-file objects', async () => {
  const env = setupDom();
  try {
    const root = createRoot(document.getElementById('root')!);

    await act(async () => {
      root.render(<WorkbenchHarness />);
    });

    await act(async () => {
      (document.getElementById('open-web-research') as HTMLButtonElement).click();
    });

    assert.deepEqual(readTabs(), [
      {
        kind: 'bounded-web-research',
        isPreview: false,
        title: 'example.com',
        url: 'https://example.com/docs',
        allowMarkdownSave: false,
        allowMemoCapture: false,
      },
    ]);

    await act(async () => {
      root.unmount();
    });
  } finally {
    env.cleanup();
  }
});

test('useWorkbench hydrates bounded web research tabs without pretending they are files', async () => {
  const env = setupDom();
  try {
    const root = createRoot(document.getElementById('root')!);

    await act(async () => {
      root.render(
        <WorkbenchHarness
          initialTabsByCellId={{
            'cell-1': [
              {
                kind: 'bounded-web-research',
                url: 'https://example.com/spec',
                rootPath: '/repo',
                isPreview: false,
                title: 'Spec Docs',
                allowMarkdownSave: true,
                allowMemoCapture: false,
              },
            ],
          }}
        />
      );
    });

    assert.deepEqual(readTabs(), [
      {
        kind: 'bounded-web-research',
        isPreview: false,
        title: 'Spec Docs',
        url: 'https://example.com/spec',
        allowMarkdownSave: true,
        allowMemoCapture: false,
      },
    ]);

    await act(async () => {
      root.unmount();
    });
  } finally {
    env.cleanup();
  }
});
