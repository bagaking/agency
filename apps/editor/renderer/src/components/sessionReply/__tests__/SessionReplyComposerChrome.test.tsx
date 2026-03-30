import assert from 'node:assert/strict';
import test from 'node:test';
import { JSDOM } from 'jsdom';
import React, { useRef, useState } from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';

import { SessionReplyComposerChrome } from '../SessionReplyComposerChrome';

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
    FocusEvent: globalThis.FocusEvent,
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
    FocusEvent: dom.window.FocusEvent,
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
        FocusEvent: previous.FocusEvent,
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

const QUICK_PROMPTS = [
  {
    id: 'prompt-1',
    title: 'Ship It',
    text: 'Please summarize the decision and proceed.',
    sources: ['global'],
  },
];

const TARGETS = [
  {
    cellId: 'cell-alpha',
    cellName: 'Alpha',
    sessionId: 'session-beta',
    sessionName: 'Beta',
    avatar: 'astronaut-wave',
  },
];

function TestHarness() {
  const quickPromptMenuRef = useRef<HTMLDivElement | null>(null);
  const quickPromptTriggerRef = useRef<HTMLButtonElement | null>(null);
  const [quickPromptMenuOpen, setQuickPromptMenuOpen] = useState(false);
  const [sendMenuOpen, setSendMenuOpen] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<any>(null);

  return (
    <SessionReplyComposerChrome
      quickPromptMenuRef={quickPromptMenuRef}
      quickPromptTriggerRef={quickPromptTriggerRef}
      availableQuickPrompts={QUICK_PROMPTS}
      quickPromptMenuOpen={quickPromptMenuOpen}
      setQuickPromptMenuOpen={setQuickPromptMenuOpen}
      handleInsertQuickPrompt={() => {}}
      selectedTarget={selectedTarget}
      setSelectedTarget={setSelectedTarget}
      otherTargets={TARGETS}
      sendMenuOpen={sendMenuOpen}
      setSendMenuOpen={setSendMenuOpen}
      hasContent={true}
      submitting={false}
      handleCreateReply={() => {}}
      selectionContext={null}
      siteText=""
      onClearSelection={() => {}}
    />
  );
}

test('SessionReplyComposerChrome uses dialog semantics and dismisses on focus outside', async () => {
  const env = setupDom();
  try {
    const root = createRoot(document.getElementById('root')!);
    await act(async () => {
      root.render(<TestHarness />);
    });

    const routeTrigger = Array.from(document.querySelectorAll('button')).find(
      (button) => button.getAttribute('aria-label') === 'Select reply target'
    ) as HTMLButtonElement | undefined;
    assert.ok(routeTrigger);
    assert.equal(routeTrigger.getAttribute('aria-haspopup'), 'dialog');

    await act(async () => {
      routeTrigger.click();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    const routeDialog = document.querySelector(
      '[role="dialog"][aria-label="Reply route chooser"]'
    ) as HTMLDivElement | null;
    assert.ok(routeDialog);
    assert.equal(document.querySelector('[role="menu"]'), null);

    const outside = document.getElementById('outside') as HTMLButtonElement | null;
    assert.ok(outside);
    await act(async () => {
      outside.focus();
      outside.dispatchEvent(new window.FocusEvent('focusin', { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    assert.equal(
      document.querySelector('[role="dialog"][aria-label="Reply route chooser"]'),
      null
    );

    const quickReplyTrigger = Array.from(document.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Quick Reply')
    ) as HTMLButtonElement | undefined;
    assert.ok(quickReplyTrigger);
    assert.equal(quickReplyTrigger.getAttribute('aria-haspopup'), 'dialog');

    await act(async () => {
      quickReplyTrigger.click();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    const quickReplyDialog = document.querySelector(
      '[role="dialog"][aria-label="Quick reply suggestions"]'
    ) as HTMLDivElement | null;
    assert.ok(quickReplyDialog);
    assert.equal(document.querySelector('[role="menu"]'), null);

    await act(async () => {
      outside.focus();
      outside.dispatchEvent(new window.FocusEvent('focusin', { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    assert.equal(
      document.querySelector('[role="dialog"][aria-label="Quick reply suggestions"]'),
      null
    );

    await act(async () => {
      root.unmount();
    });
  } finally {
    env.cleanup();
  }
});
