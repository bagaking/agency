import assert from 'node:assert/strict';
import test from 'node:test';
import { JSDOM } from 'jsdom';
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';

import { WindowTitleBar } from '../WindowTitleBar';

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
  };

  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    HTMLElement: dom.window.HTMLElement,
    Node: dom.window.Node,
    SVGElement: dom.window.SVGElement,
  });
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: dom.window.navigator,
  });
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

  return {
    cleanup() {
      Object.assign(globalThis, {
        window: previous.window,
        document: previous.document,
        HTMLElement: previous.HTMLElement,
        Node: previous.Node,
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

function buildWindows(overrides: Array<Record<string, unknown>> = []) {
  const defaults = [
    {
      windowId: 1,
      windowStateId: 'window-a',
      projectRoot: '/tmp/agency/test-cell',
      projectName: 'test-cell',
      title: 'test-cell - Agency',
      isFocused: true,
      isMinimized: false,
      isMaximized: false,
      isFullScreen: false,
      attentionSummary: null,
    },
    {
      windowId: 2,
      windowStateId: 'window-b',
      projectRoot: '/tmp/agency/docs',
      projectName: 'docs',
      title: 'docs - Agency',
      isFocused: false,
      isMinimized: false,
      isMaximized: false,
      isFullScreen: false,
      attentionSummary: null,
    },
  ];
  return defaults.map((value, index) => ({ ...value, ...(overrides[index] || {}) }));
}

test('WindowTitleBar exposes a dedicated drag surface and uses avatar-based window switching chrome', () => {
  const html = renderToStaticMarkup(
    <WindowTitleBar
      projectRoot="/tmp/agency/test-cell"
      windows={buildWindows()}
      onCreateWindow={() => undefined}
      onFocusWindow={() => undefined}
      onToggleWindowZoom={() => undefined}
      onSelectProject={() => undefined}
    />
  );

  assert.match(html, /data-testid="window-titlebar-drag-surface"/);
  assert.match(html, /data-testid="window-titlebar-project-button"/);
  assert.match(html, /data-testid="window-titlebar-project-path"/);
  assert.match(html, /data-testid="window-titlebar-window-avatars"/);
  assert.match(html, /data-testid="window-titlebar-zoom-button"/);
  assert.doesNotMatch(html, />Windows</);
  assert.match(html, /Switch Project/);
});

test('WindowTitleBar copies the project path when the summary rail is clicked', async () => {
  const env = setupDom();
  try {
    const writes: string[] = [];
    (globalThis.navigator as any).clipboard = {
      writeText: async (value: string) => {
        writes.push(value);
      },
    };

    const root = createRoot(document.getElementById('root')!);
    await act(async () => {
      root.render(
        <WindowTitleBar
          projectRoot="/tmp/agency/test-cell"
          windows={buildWindows()}
          onCreateWindow={() => undefined}
          onFocusWindow={() => undefined}
          onToggleWindowZoom={() => undefined}
          onSelectProject={() => undefined}
        />
      );
    });

    const summaryButton = document.querySelector('[data-testid="window-titlebar-project-button"]');
    assert.ok(summaryButton);

    await act(async () => {
      (summaryButton as HTMLButtonElement).click();
    });

    assert.deepEqual(writes, ['/tmp/agency/test-cell']);
    assert.match(document.body.textContent || '', /Copied/);

    await act(async () => {
      root.unmount();
    });
  } finally {
    env.cleanup();
  }
});

test('WindowTitleBar flips the zoom control label when the focused window is already zoomed', () => {
  const html = renderToStaticMarkup(
    <WindowTitleBar
      projectRoot="/tmp/agency/test-cell"
      windows={buildWindows([{ isMaximized: true }])}
      onCreateWindow={() => undefined}
      onFocusWindow={() => undefined}
      onToggleWindowZoom={() => undefined}
      onSelectProject={() => undefined}
    />
  );

  assert.match(html, /aria-label="Restore Window"/);
});
