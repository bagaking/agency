import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { JSDOM } from 'jsdom';

import { TerminalArea } from '../TerminalArea';

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

function renderArea(props: Record<string, unknown> = {}) {
  return (
    <TerminalArea
      cell={{ id: 'cell-a', name: 'Alpha' }}
      sessions={[]}
      activeSessionId=""
      sessionTargets={[]}
      terminalOpen={true}
      terminalMode="shell"
      pendingCommand={null}
      onCommandSent={() => undefined}
      onSessionActivity={() => undefined}
      onSendSessionText={() => undefined}
      onOpenWorkbenchFile={() => undefined}
      onSelectionContext={() => undefined}
      onReplySelection={() => undefined}
      activityDiffThreshold={12}
      terminalFontSize={13}
      onSessionAttached={() => undefined}
      isVisible={true}
      sessionLoading={false}
      onOpenTerminal={() => undefined}
      shortcutBindings={[]}
      {...props}
    />
  );
}

test('TerminalArea advertises explicit session creation when a Cell has no sessions', () => {
  const html = renderToStaticMarkup(renderArea({ onCreateSession: async () => null }));
  assert.match(html, /No active terminal session/);
  assert.match(html, /CREATE SESSION/);
});

test('TerminalArea empty-state button prefers onCreateSession over onOpenTerminal', async () => {
  const env = setupDom();
  try {
    let createCount = 0;
    let openCount = 0;
    const root = createRoot(document.getElementById('root')!);

    await act(async () => {
      root.render(
        renderArea({
          onCreateSession: async () => {
            createCount += 1;
            return null;
          },
          onOpenTerminal: () => {
            openCount += 1;
          },
        })
      );
    });

    const button = Array.from(document.querySelectorAll('button')).find((node) =>
      node.textContent?.includes('CREATE SESSION')
    ) as HTMLButtonElement | undefined;
    assert.ok(button);

    await act(async () => {
      button.click();
    });

    assert.equal(createCount, 1);
    assert.equal(openCount, 0);

    await act(async () => {
      root.unmount();
    });
  } finally {
    env.cleanup();
  }
});
