import assert from 'node:assert/strict';
import test from 'node:test';
import { JSDOM } from 'jsdom';
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';

import { QuickOpenModal } from '../QuickOpenModal';

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

test('QuickOpenModal closes after selecting an open tab target', async () => {
  const env = setupDom();
  try {
    const root = createRoot(document.getElementById('root')!);
    const selections: any[] = [];
    let closeCount = 0;

    await act(async () => {
      root.render(
        <QuickOpenModal
          open={true}
          onClose={() => {
            closeCount += 1;
          }}
          onSelect={(item: any) => {
            selections.push(item);
          }}
          rootPath="/repo"
          openTabs={[
            {
              id: 'tab-1',
              path: 'apps/editor/config.toml',
              title: 'config.toml',
              isPreview: false,
            },
          ]}
          activeTabId="tab-1"
        />
      );
    });

    const tabButton = Array.from(document.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('config.toml')
    ) as HTMLButtonElement | undefined;
    assert.ok(tabButton);

    await act(async () => {
      tabButton?.click();
    });

    assert.equal(selections.length, 1);
    assert.equal(selections[0]?.kind, 'tab');
    assert.equal(closeCount, 1);

    await act(async () => {
      root.unmount();
    });
  } finally {
    env.cleanup();
  }
});
