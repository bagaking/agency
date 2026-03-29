import assert from 'node:assert/strict';
import test from 'node:test';
import { JSDOM } from 'jsdom';
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';

import { DeferredMount } from '../DeferredMount';

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
  };
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    HTMLElement: dom.window.HTMLElement,
    Node: dom.window.Node,
  });
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

test('DeferredMount retain strategy keeps subtree after first activation', async () => {
  const env = setupDom();
  try {
    const root = createRoot(document.getElementById('root')!);

    await act(async () => {
      root.render(
        <DeferredMount active={false} strategy="retain">
          <div data-testid="panel">panel</div>
        </DeferredMount>
      );
    });
    assert.equal(document.querySelector('[data-testid="panel"]'), null);

    await act(async () => {
      root.render(
        <DeferredMount active={true} strategy="retain">
          <div data-testid="panel">panel</div>
        </DeferredMount>
      );
    });
    assert.ok(document.querySelector('[data-testid="panel"]'));

    await act(async () => {
      root.render(
        <DeferredMount active={false} strategy="retain">
          <div data-testid="panel">panel</div>
        </DeferredMount>
      );
    });
    assert.ok(document.querySelector('[data-testid="panel"]'));

    await act(async () => {
      root.unmount();
    });
  } finally {
    env.cleanup();
  }
});

test('DeferredMount unmount strategy removes subtree when inactive', async () => {
  const env = setupDom();
  try {
    const root = createRoot(document.getElementById('root')!);

    await act(async () => {
      root.render(
        <DeferredMount active={true} strategy="unmount">
          <div data-testid="panel">panel</div>
        </DeferredMount>
      );
    });
    assert.ok(document.querySelector('[data-testid="panel"]'));

    await act(async () => {
      root.render(
        <DeferredMount active={false} strategy="unmount">
          <div data-testid="panel">panel</div>
        </DeferredMount>
      );
    });
    assert.equal(document.querySelector('[data-testid="panel"]'), null);

    await act(async () => {
      root.unmount();
    });
  } finally {
    env.cleanup();
  }
});
