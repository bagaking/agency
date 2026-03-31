import assert from 'node:assert/strict';
import test from 'node:test';
import { JSDOM } from 'jsdom';
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';

import { useWindowHomeShell } from '../useWindowHomeShell';

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
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: dom.window.navigator,
  });
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

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

function flushEffects() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function HomeShellHarness({
  homePath,
  projectReady,
}: {
  homePath: string;
  projectReady: boolean;
}) {
  const homeShell = useWindowHomeShell({
    homePath,
    projectReady,
  });

  return (
    <div>
      <button id="open-shell" onClick={() => homeShell.openShell()}>
        open
      </button>
      <button id="exit-shell" onClick={() => homeShell.handleShellExit()}>
        exit
      </button>
      <output id="shell-state">{JSON.stringify(homeShell.shellSummary)}</output>
    </div>
  );
}

function readShellState() {
  const raw = document.getElementById('shell-state')?.textContent || '{}';
  return JSON.parse(raw) as {
    visible?: boolean;
    status?: string;
  };
}

test('useWindowHomeShell keeps shell alive across no-project view switches and exits into restartable state', async () => {
  const env = setupDom();

  try {
    const root = createRoot(document.getElementById('root')!);

    await act(async () => {
      root.render(<HomeShellHarness homePath="/Users/bytedance" projectReady={false} />);
      await flushEffects();
    });

    await act(async () => {
      document.getElementById('open-shell')?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
      await flushEffects();
    });
    assert.equal(readShellState().visible, true);
    assert.equal(readShellState().status, 'starting');

    await act(async () => {
      root.render(<HomeShellHarness homePath="/Users/bytedance" projectReady={false} />);
      await flushEffects();
    });
    assert.equal(readShellState().visible, true);

    await act(async () => {
      document.getElementById('exit-shell')?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
      await flushEffects();
    });
    assert.equal(readShellState().visible, false);
    assert.equal(readShellState().status, 'exited');

    await act(async () => {
      root.render(<HomeShellHarness homePath="/Users/bytedance" projectReady={true} />);
      await flushEffects();
    });
    assert.equal(readShellState().visible, false);
    assert.equal(readShellState().status, 'idle');

    await act(async () => {
      root.unmount();
    });
  } finally {
    env.cleanup();
  }
});
