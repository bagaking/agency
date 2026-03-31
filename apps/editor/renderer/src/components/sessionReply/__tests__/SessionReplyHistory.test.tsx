import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { JSDOM } from 'jsdom';

import { SessionReplyHistory } from '../SessionReplyHistory';

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

test('SessionReplyHistory keeps recorded replies in-place instead of linking to Memo', async () => {
  const env = setupDom();
  try {
    const jumpCalls: Array<[string, string]> = [];
    const root = createRoot(document.getElementById('root')!);

    await act(async () => {
      root.render(
        <SessionReplyHistory
          loadingReplies={false}
          replyItems={[
            {
              id: 'reply-recorded',
              body: 'Keep this in the session surface',
              createdAt: '2026-03-31T00:00:00.000Z',
              owner: {
                cellId: 'cell-a',
                sessionId: 'session-a',
                sessionName: 'Session A',
              },
              capture: {
                selection: {
                  site: 'recorded-site',
                },
              },
              targets: [
                {
                  type: 'record',
                  at: '2026-03-31T00:00:00.000Z',
                  cellId: 'cell-a',
                  sessionId: 'session-a',
                  cellName: 'Cell A',
                  sessionName: 'Session A',
                  avatar: '',
                },
              ],
            },
            {
              id: 'reply-routed',
              body: 'Jump should still work for routed replies',
              createdAt: '2026-03-31T00:01:00.000Z',
              owner: {
                cellId: 'cell-a',
                sessionId: 'session-a',
                sessionName: 'Session A',
              },
              capture: {
                selection: {
                  site: 'target-site',
                },
              },
              targets: [
                {
                  type: 'other',
                  at: '2026-03-31T00:01:00.000Z',
                  cellId: 'cell-b',
                  sessionId: 'session-b',
                  cellName: 'Cell B',
                  sessionName: 'Session B',
                  avatar: 'astronaut-wave',
                },
              ],
            },
          ]}
          onJumpToSession={(cellId: string, sessionId: string) => {
            jumpCalls.push([cellId, sessionId]);
          }}
          onArchiveReply={() => undefined}
          onReeditReply={() => undefined}
        />
      );
    });

    assert.match(document.body.textContent || '', /Recorded/);
    assert.equal(
      document.querySelector('[aria-label="Open recorded reply in memo"]'),
      null
    );

    const jumpButton = document.querySelector(
      '[aria-label="Jump to Session B"]'
    ) as HTMLButtonElement | null;
    assert.ok(jumpButton);

    await act(async () => {
      jumpButton.click();
    });

    assert.deepEqual(jumpCalls, [['cell-b', 'session-b']]);

    await act(async () => {
      root.unmount();
    });
  } finally {
    env.cleanup();
  }
});
