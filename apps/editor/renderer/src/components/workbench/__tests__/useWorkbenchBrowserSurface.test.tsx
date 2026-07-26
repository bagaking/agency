import assert from 'node:assert/strict';
import test from 'node:test';
import { JSDOM } from 'jsdom';
import React, { useEffect } from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';

import { useWorkbenchBrowserSurface } from '../useWorkbenchBrowserSurface';

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
    ResizeObserver: (globalThis as any).ResizeObserver,
  };

  class FakeResizeObserver {
    callback;
    constructor(callback: ResizeObserverCallback) {
      this.callback = callback;
    }
    observe() {}
    disconnect() {}
  }

  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    HTMLElement: dom.window.HTMLElement,
    Node: dom.window.Node,
    Event: dom.window.Event,
    MouseEvent: dom.window.MouseEvent,
    KeyboardEvent: dom.window.KeyboardEvent,
    ResizeObserver: FakeResizeObserver,
  });
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: dom.window.navigator,
  });

  return {
    async flush() {
      await act(async () => {
        await Promise.resolve();
        await new Promise((resolve) => setTimeout(resolve, 0));
      });
    },
    cleanup() {
      Object.assign(globalThis, {
        window: previous.window,
        document: previous.document,
        HTMLElement: previous.HTMLElement,
        Node: previous.Node,
        Event: previous.Event,
        MouseEvent: previous.MouseEvent,
        KeyboardEvent: previous.KeyboardEvent,
        ResizeObserver: previous.ResizeObserver,
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

test('useWorkbenchBrowserSurface syncs visible bounds, hides cleanly, and disposes on unmount', async () => {
  const env = setupDom();
  try {
    const syncCalls: Array<Record<string, any>> = [];
    const disposeCalls: Array<Record<string, any>> = [];
    let subscriber: ((payload: Record<string, any>) => void) | null = null;
    let latestState: any = null;
    const root = createRoot(document.getElementById('root')!);

    (window as any).agency = {
      syncWorkbenchBrowserSurface: async (payload: Record<string, any>) => {
        syncCalls.push(payload);
        return {
          tabId: payload.tabId,
          url: payload.url,
          title: payload.visible === false ? '' : 'Example View',
          phase: payload.visible === false ? 'hidden' : 'ready',
          error: '',
          visible: payload.visible !== false,
          canGoBack: payload.visible !== false,
          canGoForward: false,
        };
      },
      disposeWorkbenchBrowserSurface: async (payload: Record<string, any>) => {
        disposeCalls.push(payload);
        return { ok: true };
      },
      onWorkbenchBrowserSurfaceEvent: (handler: (payload: Record<string, any>) => void) => {
        subscriber = handler;
        return () => {
          subscriber = null;
        };
      },
    };

    function Harness({
      visible,
      navigationKey,
    }: {
      visible: boolean;
      navigationKey: number;
    }) {
      const browserSurface = useWorkbenchBrowserSurface({
        tabId: 'tab-surface',
        url: 'https://example.com/docs',
        visible,
        navigationKey,
      });

      useEffect(() => {
        latestState = browserSurface.surfaceState;
      }, [browserSurface.surfaceState]);

      return (
        <div
          ref={(node) => {
            browserSurface.hostRef.current = node;
            if (node) {
              node.getBoundingClientRect = () =>
                ({
                  left: 24,
                  top: 36,
                  width: 640,
                  height: 420,
                  right: 664,
                  bottom: 456,
                }) as DOMRect;
            }
          }}
        />
      );
    }

    await act(async () => {
      root.render(<Harness visible={true} navigationKey={0} />);
    });
    await env.flush();

    assert.equal(syncCalls.length >= 1, true);
    assert.deepEqual(syncCalls[0], {
      tabId: 'tab-surface',
      url: 'https://example.com/docs',
      visible: true,
      navigationKey: 0,
      bounds: {
        x: 24,
        y: 36,
        width: 640,
        height: 420,
      },
    });

    await act(async () => {
      subscriber?.({
        tabId: 'tab-surface',
        url: 'https://example.com/docs',
        title: 'Example View',
        phase: 'ready',
        error: '',
        visible: true,
        canGoBack: true,
        canGoForward: false,
      });
    });
    assert.equal(latestState.phase, 'ready');
    assert.equal(latestState.title, 'Example View');
    assert.equal(latestState.canGoBack, true);

    await act(async () => {
      root.render(<Harness visible={false} navigationKey={0} />);
    });
    await env.flush();

    assert.equal(syncCalls.some((call) => call.visible === false), true);

    await act(async () => {
      root.unmount();
    });

    assert.deepEqual(disposeCalls, [{ tabId: 'tab-surface' }]);
    delete (window as any).agency;
  } finally {
    env.cleanup();
  }
});

test('useWorkbenchBrowserSurface can hide on unmount without disposing the native host', async () => {
  const env = setupDom();
  try {
    const syncCalls: Array<Record<string, any>> = [];
    const disposeCalls: Array<Record<string, any>> = [];
    const root = createRoot(document.getElementById('root')!);

    (window as any).agency = {
      syncWorkbenchBrowserSurface: async (payload: Record<string, any>) => {
        syncCalls.push(payload);
        return {
          tabId: payload.tabId,
          url: payload.url,
          title: 'Example View',
          phase: payload.visible === false ? 'hidden' : 'ready',
          error: '',
          visible: payload.visible !== false,
          canGoBack: false,
          canGoForward: false,
        };
      },
      disposeWorkbenchBrowserSurface: async (payload: Record<string, any>) => {
        disposeCalls.push(payload);
        return { ok: true };
      },
      onWorkbenchBrowserSurfaceEvent: () => () => undefined,
    };

    function Harness() {
      const browserSurface = useWorkbenchBrowserSurface({
        tabId: 'tab-persist',
        url: 'https://example.com/docs',
        visible: true,
        navigationKey: 0,
        disposeOnUnmount: false,
      });

      return (
        <div
          ref={(node) => {
            browserSurface.hostRef.current = node;
            if (node) {
              node.getBoundingClientRect = () =>
                ({
                  left: 24,
                  top: 36,
                  width: 640,
                  height: 420,
                  right: 664,
                  bottom: 456,
                }) as DOMRect;
            }
          }}
        />
      );
    }

    await act(async () => {
      root.render(<Harness />);
    });
    await env.flush();

    await act(async () => {
      root.unmount();
    });

    assert.equal(disposeCalls.length, 0);
    assert.equal(syncCalls.some((payload) => payload.tabId === 'tab-persist' && payload.visible === false), true);
    delete (window as any).agency;
  } finally {
    env.cleanup();
  }
});

test('useWorkbenchBrowserSurface coalesces scroll syncs and skips unchanged bounds', async () => {
  const env = setupDom();
  try {
    const syncCalls: Array<Record<string, any>> = [];
    const root = createRoot(document.getElementById('root')!);
    const rafCallbacks: Array<FrameRequestCallback | null> = [];

    (window as any).requestAnimationFrame = (callback: FrameRequestCallback) => {
      rafCallbacks.push(callback);
      return rafCallbacks.length;
    };
    (window as any).cancelAnimationFrame = (frameId: number) => {
      rafCallbacks[frameId - 1] = null;
    };

    async function flushRaf() {
      const callbacks = rafCallbacks.splice(0);
      await act(async () => {
        callbacks.forEach((callback) => callback?.(performance.now()));
        await Promise.resolve();
      });
    }

    (window as any).agency = {
      syncWorkbenchBrowserSurface: async (payload: Record<string, any>) => {
        syncCalls.push(payload);
        return {
          tabId: payload.tabId,
          url: payload.url,
          title: 'Example View',
          phase: payload.visible === false ? 'hidden' : 'ready',
          error: '',
          visible: payload.visible !== false,
          canGoBack: false,
          canGoForward: false,
        };
      },
      disposeWorkbenchBrowserSurface: async () => ({ ok: true }),
      onWorkbenchBrowserSurfaceEvent: () => () => undefined,
    };

    function Harness() {
      const browserSurface = useWorkbenchBrowserSurface({
        tabId: 'tab-scroll',
        url: 'https://example.com/docs',
        visible: true,
        navigationKey: 0,
      });

      return (
        <div
          ref={(node) => {
            browserSurface.hostRef.current = node;
            if (node) {
              node.getBoundingClientRect = () =>
                ({
                  left: 24,
                  top: 36,
                  width: 640,
                  height: 420,
                  right: 664,
                  bottom: 456,
                }) as DOMRect;
            }
          }}
        />
      );
    }

    await act(async () => {
      root.render(<Harness />);
    });

    window.dispatchEvent(new Event('scroll'));
    window.dispatchEvent(new Event('scroll'));
    window.dispatchEvent(new Event('scroll'));

    await flushRaf();
    assert.equal(syncCalls.length, 1);

    window.dispatchEvent(new Event('scroll'));
    await flushRaf();
    assert.equal(syncCalls.length, 1);

    await act(async () => {
      root.unmount();
    });
    delete (window as any).agency;
  } finally {
    env.cleanup();
  }
});
