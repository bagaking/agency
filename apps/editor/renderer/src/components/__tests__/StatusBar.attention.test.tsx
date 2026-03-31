import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { JSDOM } from 'jsdom';

import { AttentionLayerProvider } from '../../attention/AttentionLayerContext';
import { StatusBar } from '../StatusBar';

const attentionValue = {
  localItems: [],
  windowItems: [],
  allItems: [
    {
      id: 'run-running',
      kind: 'running',
      ownerKind: 'run',
      severity: 'high',
      label: 'Create Child Agent via Fork',
      detail: 'Create child agent from selected session',
      refs: {
        cellId: 'cell-a',
        sessionId: 'session-main',
        runId: 'run-running',
      },
      source: 'local',
      updatedAtMs: 0,
      count: 1,
    },
  ],
  primaryItem: {
    id: 'run-running',
    kind: 'running',
    ownerKind: 'run',
    severity: 'high',
    label: 'Create Child Agent via Fork',
    detail: 'Create child agent from selected session',
    refs: {
      cellId: 'cell-a',
      sessionId: 'session-main',
      runId: 'run-running',
    },
    source: 'local',
    updatedAtMs: 0,
    count: 1,
  },
  localSummary: {
    version: 1,
    itemCount: 1,
    highestSeverity: 'high',
    countsByKind: {
      running: 1,
    },
    primary: null,
    updatedAt: '',
  },
  byCellId: {},
  bySessionKey: {},
  jumpToAttention: () => undefined,
};

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

test('StatusBar renders a clickable primary attention item', () => {
  const originalConsoleError = console.error;
  console.error = (...args: any[]) => {
    const [firstArg] = args;
    if (
      typeof firstArg === 'string' &&
      firstArg.includes('useLayoutEffect does nothing on the server')
    ) {
      return;
    }
    originalConsoleError(...args);
  };

  try {
    const html = renderToStaticMarkup(
      <AttentionLayerProvider value={attentionValue as any}>
        <StatusBar
          loading={false}
          onRefresh={() => undefined}
          tmuxStatus={{ available: true, version: 'tmux 3.4' }}
          ipcAvailable={true}
        />
      </AttentionLayerProvider>
    );

    assert.match(html, /data-testid="statusbar-attention"/);
    assert.match(html, /Create Child Agent via Fork/);
    assert.match(html, /Running/);
    assert.doesNotMatch(
      html,
      /data-testid="statusbar-attention"[^>]*title=/
    );
  } finally {
    console.error = originalConsoleError;
  }
});

test('StatusBar shows the NEXT tooltip on focus', async () => {
  const env = setupDom();
  try {
    let jumpTarget: any = null;
    const root = createRoot(document.getElementById('root')!);
    await act(async () => {
      root.render(
        <AttentionLayerProvider
          value={{
            ...attentionValue,
            jumpToAttention: (item: any) => {
              jumpTarget = item;
            },
          } as any}
        >
          <StatusBar
            loading={false}
            onRefresh={() => undefined}
            tmuxStatus={{ available: true, version: 'tmux 3.4' }}
            ipcAvailable={true}
          />
        </AttentionLayerProvider>
      );
    });

    const button = document.querySelector('[data-testid="statusbar-attention"]') as HTMLButtonElement | null;
    assert.ok(button);

    await act(async () => {
      button.focus();
    });

    const tooltip = document.querySelector('[role="tooltip"]');
    assert.ok(tooltip);
    assert.equal(
      tooltip?.textContent,
      'Next: Running. Create child agent from selected session. Open evidence in Session Map.'
    );
    assert.ok(button.getAttribute('aria-describedby'));
    assert.equal(button.getAttribute('aria-describedby'), tooltip?.id);

    await act(async () => {
      button.parentElement?.dispatchEvent(
        new window.MouseEvent('mouseleave', { bubbles: true })
      );
    });

    assert.ok(document.querySelector('[role="tooltip"]'));

    await act(async () => {
      button.click();
    });

    assert.equal(jumpTarget?.id, 'run-running');

    await act(async () => {
      root.unmount();
    });
  } finally {
    env.cleanup();
  }
});
