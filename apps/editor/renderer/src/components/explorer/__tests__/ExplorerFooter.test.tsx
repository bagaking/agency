import assert from 'node:assert/strict';
import test from 'node:test';
import { JSDOM } from 'jsdom';
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';

import { ExplorerFooter } from '../ExplorerFooter';

function setupDom() {
  const dom = new JSDOM(
    '<!doctype html><html><body><button id="outside">outside</button><div id="root"></div></body></html>',
    {
      url: 'http://localhost/',
    }
  );
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
    HTMLIFrameElement: (globalThis as any).HTMLIFrameElement,
    requestAnimationFrame: globalThis.requestAnimationFrame,
    cancelAnimationFrame: globalThis.cancelAnimationFrame,
    PointerEvent: (globalThis as any).PointerEvent,
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
    HTMLIFrameElement: dom.window.HTMLIFrameElement,
  });
  const requestAnimationFrame = (callback: FrameRequestCallback) =>
    setTimeout(() => callback(Date.now()), 0) as unknown as number;
  const cancelAnimationFrame = (handle: number) => clearTimeout(handle);
  globalThis.requestAnimationFrame = requestAnimationFrame;
  globalThis.cancelAnimationFrame = cancelAnimationFrame;
  dom.window.requestAnimationFrame = requestAnimationFrame;
  dom.window.cancelAnimationFrame = cancelAnimationFrame;
  (dom.window as any).PointerEvent = dom.window.MouseEvent;
  (globalThis as any).PointerEvent = dom.window.MouseEvent;
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: dom.window.navigator,
  });
  if (!(dom.window.HTMLElement.prototype as any).attachEvent) {
    (dom.window.HTMLElement.prototype as any).attachEvent = () => undefined;
  }
  if (!(dom.window.HTMLElement.prototype as any).detachEvent) {
    (dom.window.HTMLElement.prototype as any).detachEvent = () => undefined;
  }
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
        HTMLIFrameElement: previous.HTMLIFrameElement,
      });
      globalThis.requestAnimationFrame = previous.requestAnimationFrame;
      globalThis.cancelAnimationFrame = previous.cancelAnimationFrame;
      (globalThis as any).PointerEvent = previous.PointerEvent;
      Object.defineProperty(globalThis, 'navigator', {
        configurable: true,
        value: previous.navigator,
      });
      delete (globalThis as any).IS_REACT_ACT_ENVIRONMENT;
      dom.window.close();
    },
  };
}

test('ExplorerFooter selection hierarchy uses explicit popover lifecycle', async () => {
  const env = setupDom();
  try {
    const root = createRoot(document.getElementById('root')!);
    const now = Date.now();

    await act(async () => {
      root.render(
        <ExplorerFooter
          selectionCount={2}
          selectionTargets={['apps/editor/README.md', 'docs/notes-file-interaction-system.md']}
          nodesByPath={{
            apps: { type: 'dir', name: 'apps' },
            'apps/editor': { type: 'dir', name: 'editor' },
            'apps/editor/README.md': { type: 'file', name: 'README.md' },
            docs: { type: 'dir', name: 'docs' },
            'docs/notes-file-interaction-system.md': {
              type: 'file',
              name: 'notes-file-interaction-system.md',
            },
          }}
          statusByPath={{}}
          folderStatusByPath={{}}
          onClearSelection={() => {}}
          sessions={[{ id: 'session-1', name: 'Main Session', status: 'active' }]}
          activeSessionId="session-1"
          sessionActivityByKey={{ 'cell-main:session-1': now - 1000 }}
          now={now}
          onDispatchFeed={async () => {}}
          explorerDeliverySummary={null}
          onOpenDeliveryTimeline={() => {}}
          activeCell={{ id: 'cell-main', name: 'main', state: 'active' }}
          onToggleSessionMap={() => {}}
          sessionMapOpen={false}
        />
      );
    });

    const trigger = document.querySelector(
      'button[aria-label="Show selection hierarchy"]'
    ) as HTMLButtonElement | null;
    assert.ok(trigger);

    await act(async () => {
      trigger?.click();
    });

    const dialog = document.querySelector(
      '[role="dialog"][aria-label="Selection hierarchy"]'
    ) as HTMLDivElement | null;
    assert.ok(dialog);
    assert.equal(trigger?.getAttribute('aria-expanded'), 'true');

    await act(async () => {
      dialog?.dispatchEvent(new window.PointerEvent('pointerdown', { bubbles: true }));
    });
    assert.ok(
      document.querySelector('[role="dialog"][aria-label="Selection hierarchy"]'),
      'popover should stay open for pointer interaction inside the popover'
    );

    const outside = document.getElementById('outside');
    await act(async () => {
      outside?.dispatchEvent(new window.PointerEvent('pointerdown', { bubbles: true }));
    });

    assert.equal(
      document.querySelector('[role="dialog"][aria-label="Selection hierarchy"]'),
      null
    );
    assert.equal(trigger?.getAttribute('aria-expanded'), 'false');

    await act(async () => {
      root.unmount();
    });
  } finally {
    env.cleanup();
  }
});
