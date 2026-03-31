import assert from 'node:assert/strict';
import test from 'node:test';
import React, { useEffect } from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { JSDOM } from 'jsdom';

import { useAttentionState } from '../useAttentionState';

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
  (globalThis as any).window.agency = {
    setUiState: async () => undefined,
  };
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

function Harness({
  onReady,
  onOpenSessionMap,
  onFocusRun,
  onSelectSessionFromMap,
}: any) {
  const attention = useAttentionState({
    projectRoot: '/tmp/repo',
    selectedCell: { id: 'cell-a', name: 'Alpha' },
    activeSessionId: 'session-a',
    cells: [{ id: 'cell-a', name: 'Alpha' }],
    sessionsByCellId: {
      'cell-a': [{ id: 'session-a', name: 'Session A' }],
    },
    activeSessionByCellId: {
      'cell-a': 'session-a',
    },
    harnessRuns: [],
    openSessionMap: onOpenSessionMap,
    focusRunInUi: onFocusRun,
    selectSessionFromMap: onSelectSessionFromMap,
  });

  useEffect(() => {
    onReady(attention.jumpToAttention);
  }, [attention.jumpToAttention, onReady]);

  return null;
}

test('useAttentionState preserves run focus when opening Session Map from run attention', async () => {
  const env = setupDom();
  try {
    let jumpToAttention: any = null;
    let openCount = 0;
    const focusedRuns: string[] = [];
    const selectedSessions: any[] = [];
    const root = createRoot(document.getElementById('root')!);

    await act(async () => {
      root.render(
        <Harness
          onReady={(handler: any) => {
            jumpToAttention = handler;
          }}
          onOpenSessionMap={() => {
            openCount += 1;
          }}
          onFocusRun={(runId: string) => {
            focusedRuns.push(runId);
          }}
          onSelectSessionFromMap={(cellId: string, sessionId: string, options: any) => {
            selectedSessions.push({ cellId, sessionId, options });
          }}
        />
      );
    });

    assert.ok(jumpToAttention);

    await act(async () => {
      jumpToAttention({
        id: 'run-running',
        kind: 'running',
        ownerKind: 'run',
        severity: 'high',
        label: 'Create Child Agent via Fork',
        detail: 'Create child agent from selected session',
        refs: {
          cellId: 'cell-a',
          sessionId: 'session-a',
          runId: 'run-running',
        },
        source: 'local',
      });
    });

    assert.deepEqual(focusedRuns, ['run-running']);
    assert.deepEqual(selectedSessions, [
      {
        cellId: 'cell-a',
        sessionId: 'session-a',
        options: {
          focusView: false,
          preserveRunFocus: true,
        },
      },
    ]);
    assert.equal(openCount, 1);

    await act(async () => {
      root.unmount();
    });
  } finally {
    env.cleanup();
  }
});

export {};
