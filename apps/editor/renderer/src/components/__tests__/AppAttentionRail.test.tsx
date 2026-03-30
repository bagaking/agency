import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { JSDOM } from 'jsdom';

import { AttentionLayerProvider } from '../../attention/AttentionLayerContext';
import { AppAttentionRail } from '../layout/AppAttentionRail';

const runningRun = {
  runId: 'run-1',
  status: 'running',
  caller: {
    sourceSurface: 'agent-cells',
    callerId: 'commander-smart-fork',
  },
  goal: {
    title: 'Create Child Agent via Fork',
  },
  runner: {
    providerId: 'codex_cli',
  },
};

const attentionValue = {
  localItems: [
    {
      id: 'failed-run',
      kind: 'failed',
      ownerKind: 'run',
      severity: 'critical',
      label: 'Failed Run',
      detail: 'Primary failure that needs review.',
      refs: {
        cellId: 'cell-a',
        sessionId: 'session-main',
        runId: 'run-failed',
      },
      source: 'local',
      updatedAtMs: 2,
      count: 1,
    },
    {
      id: 'unread-session',
      kind: 'unread',
      ownerKind: 'session',
      severity: 'medium',
      label: 'Unread Session',
      detail: 'Background output arrived.',
      refs: {
        cellId: 'cell-b',
        sessionId: 'session-b',
      },
      source: 'local',
      updatedAtMs: 1,
      count: 1,
    },
  ],
  windowItems: [],
  allItems: [],
  primaryItem: {
    id: 'failed-run',
    kind: 'failed',
    ownerKind: 'run',
    severity: 'critical',
    label: 'Failed Run',
    detail: 'Primary failure that needs review.',
    refs: {
      cellId: 'cell-a',
      sessionId: 'session-main',
      runId: 'run-failed',
    },
    source: 'local',
    updatedAtMs: 2,
    count: 1,
  },
  localSummary: {
    version: 1,
    itemCount: 2,
    highestSeverity: 'critical',
    countsByKind: {
      failed: 1,
      unread: 1,
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

test('AppAttentionRail hosts queue and commander briefing outside Session Map', async () => {
  const env = setupDom();
  try {
    function Harness() {
      return (
        <AttentionLayerProvider value={attentionValue as any}>
          <AppAttentionRail
            focusData={{
              cell: {
                id: 'cell-a',
                name: 'main',
              },
              session: {
                id: 'session-main',
                name: 'UI',
              },
            }}
            harnessRuns={[runningRun]}
            sessionError=""
            onClearSessionError={() => undefined}
            onCancelHarnessRun={() => undefined}
            onResumeHarnessRun={() => undefined}
          />
        </AttentionLayerProvider>
      );
    }

    const root = createRoot(document.getElementById('root')!);
    await act(async () => {
      root.render(<Harness />);
    });

    assert.equal(
      document.querySelector('[data-attention-rail]')?.getAttribute('data-attention-rail'),
      'open'
    );
    assert.ok(document.body.textContent?.includes('Priority Queue'));

    const commanderButton = Array.from(document.querySelectorAll('button')).find((node) =>
      String(node.textContent || '').includes('CODEX CLI')
    ) as HTMLButtonElement | undefined;
    assert.ok(commanderButton);

    await act(async () => {
      commanderButton.click();
    });

    assert.ok(document.querySelector('[data-commander-briefing="true"]'));
    assert.ok(document.body.textContent?.includes('Window Scope'));

    const closeButton = document.querySelector(
      '[aria-label="Close commander briefing"]'
    ) as HTMLButtonElement | null;
    assert.ok(closeButton);

    await act(async () => {
      closeButton.click();
    });

    assert.ok(document.body.textContent?.includes('Priority Queue'));

    await act(async () => {
      root.unmount();
    });
  } finally {
    env.cleanup();
  }
});
