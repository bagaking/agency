import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { JSDOM } from 'jsdom';

import { SessionMapOverlay } from '../SessionMapOverlay';

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
    HTMLIFrameElement: (globalThis as any).HTMLIFrameElement,
    requestAnimationFrame: globalThis.requestAnimationFrame,
    cancelAnimationFrame: globalThis.cancelAnimationFrame,
    PointerEvent: (globalThis as any).PointerEvent,
    ResizeObserver: (globalThis as any).ResizeObserver,
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
  (globalThis as any).ResizeObserver = class {
    observe() {}
    disconnect() {}
    unobserve() {}
  };
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
      (globalThis as any).ResizeObserver = previous.ResizeObserver;
      Object.defineProperty(globalThis, 'navigator', {
        configurable: true,
        value: previous.navigator,
      });
      delete (globalThis as any).IS_REACT_ACT_ENVIRONMENT;
      dom.window.close();
    },
  };
}

const model = {
  clusters: [
    {
      cell: { id: 'cell-main', name: 'main', state: 'active' },
      sessions: [
        {
          id: 'session-ui',
          name: 'UI',
          status: 'active',
          isActive: true,
          isOffline: false,
          lastActivityAt: null,
          lastVisitedAt: null,
        },
      ],
      color: '#34d399',
      typeLabel: 'active',
      isOffline: false,
    },
  ],
  stats: {
    online: 1,
    offline: 0,
    cells: 1,
    sessions: 1,
  },
};

test('Escape closes the Session Map when overlay-local surfaces are inactive', async () => {
  const env = setupDom();
  try {
    const root = createRoot(document.getElementById('root')!);
    let closeCount = 0;

    await act(async () => {
      root.render(
        <SessionMapOverlay
          open={true}
          mode="dock"
          model={model}
          onSelectSession={() => undefined}
          onClose={() => {
            closeCount += 1;
          }}
          resolveFontSize={() => 13}
          terminusProfiles={[]}
          onCreateSession={async () => undefined}
          onDispatchCommand={() => undefined}
          onRenameSession={() => undefined}
          onUpdateSessionAvatar={() => undefined}
          onOpenFileShortcut={() => undefined}
          onRevealFileShortcut={() => undefined}
          harnessRuns={[]}
          sessionError=""
          onClearSessionError={() => undefined}
          onCancelHarnessRun={async () => undefined}
          onResumeHarnessRun={async () => undefined}
        />
      );
    });

    assert.equal(document.querySelector('[data-commander-trigger="true"]'), null);
    assert.ok(document.querySelector('[aria-label="Session map"]'));

    await act(async () => {
      window.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });

    assert.equal(closeCount, 1);

    await act(async () => {
      root.unmount();
    });
  } finally {
    env.cleanup();
  }
});

test('close button closes the Session Map overlay', async () => {
  const env = setupDom();
  try {
    const root = createRoot(document.getElementById('root')!);
    let closeCount = 0;

    await act(async () => {
      root.render(
        <SessionMapOverlay
          open={true}
          mode="dock"
          model={model}
          onSelectSession={() => undefined}
          onClose={() => {
            closeCount += 1;
          }}
          resolveFontSize={() => 13}
          terminusProfiles={[]}
          onCreateSession={async () => undefined}
          onDispatchCommand={() => undefined}
          onRenameSession={() => undefined}
          onUpdateSessionAvatar={() => undefined}
          onOpenFileShortcut={() => undefined}
          onRevealFileShortcut={() => undefined}
          harnessRuns={[]}
          sessionError=""
          onClearSessionError={() => undefined}
          onCancelHarnessRun={async () => undefined}
          onResumeHarnessRun={async () => undefined}
        />
      );
    });

    const closeButton = document.querySelector(
      'button[aria-label="Close Session Map"]'
    ) as HTMLButtonElement | null;
    assert.ok(closeButton);

    await act(async () => {
      closeButton?.click();
    });

    assert.equal(closeCount, 1);

    await act(async () => {
      root.unmount();
    });
  } finally {
    env.cleanup();
  }
});
