import assert from 'node:assert/strict';
import test from 'node:test';
import { JSDOM } from 'jsdom';
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';

import { useWorkbenchLanguageOverrides } from '../useWorkbenchLanguageOverrides';

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

type HarnessProps = {
  stateKey: string;
  currentFilePath: string;
  persistDebounceMs?: number;
};

function Harness({ stateKey, currentFilePath, persistDebounceMs = 0 }: HarnessProps) {
  const overrides = useWorkbenchLanguageOverrides({
    stateKey,
    currentFilePath,
    persistDebounceMs,
  });

  return (
    <div>
      <button
        id="set-current-js"
        type="button"
        onClick={() => overrides.setCurrentFileOverride('javascript')}
      >
        set current
      </button>
      <button id="reset-current" type="button" onClick={() => overrides.resetCurrentFileOverride()}>
        reset current
      </button>
      <button
        id="set-utils-go"
        type="button"
        onClick={() => overrides.setOverrideForFile('src/utils.ts', 'go')}
      >
        set utils
      </button>
      <output id="snapshot">
        {JSON.stringify({
          restored: overrides.restored,
          current: overrides.currentFileOverride,
          main: overrides.getOverrideForFile('src/main.ts'),
          utils: overrides.getOverrideForFile('src/utils.ts'),
          all: overrides.overridesByFilePath,
        })}
      </output>
    </div>
  );
}

async function waitFor(check: () => boolean, timeoutMs = 1200) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (check()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error('Timed out waiting for condition.');
}

test('restores per-root overrides and persists set/reset for current file', async () => {
  const env = setupDom();
  const setCalls: any[] = [];
  let uiStateStore: any = {
    workbenchLanguageOverrideStateByRootKey: {
      'agency:root-a': {
        'src/main.ts': 'typescript',
        'src/utils.ts': 'json',
      },
    },
  };

  try {
    (window as any).agency = {
      getUiState: async () => uiStateStore,
      setUiState: async (payload: any) => {
        uiStateStore = { ...uiStateStore, ...payload };
        setCalls.push(payload);
      },
    };

    const root = createRoot(document.getElementById('root')!);

    await act(async () => {
      root.render(<Harness stateKey="agency:root-a" currentFilePath="src/main.ts" />);
      await Promise.resolve();
    });

    assert.match(
      document.getElementById('snapshot')?.textContent || '',
      /"restored":true,"current":"typescript","main":"typescript","utils":"json"/
    );

    await act(async () => {
      (document.getElementById('set-current-js') as HTMLButtonElement).click();
      await Promise.resolve();
    });
    await waitFor(
      () =>
        uiStateStore.workbenchLanguageOverrideStateByRootKey?.['agency:root-a']?.['src/main.ts'] ===
        'javascript'
    );

    assert.ok(setCalls.length > 0);
    assert.equal(
      uiStateStore.workbenchLanguageOverrideStateByRootKey['agency:root-a']['src/main.ts'],
      'javascript'
    );
    assert.equal(
      uiStateStore.workbenchLanguageOverrideStateByRootKey['agency:root-a']['src/utils.ts'],
      'json'
    );

    await act(async () => {
      (document.getElementById('reset-current') as HTMLButtonElement).click();
      await Promise.resolve();
    });
    await waitFor(
      () =>
        uiStateStore.workbenchLanguageOverrideStateByRootKey?.['agency:root-a']?.['src/main.ts'] ===
        undefined
    );

    assert.equal(
      uiStateStore.workbenchLanguageOverrideStateByRootKey['agency:root-a']['src/main.ts'],
      undefined
    );
    assert.equal(
      uiStateStore.workbenchLanguageOverrideStateByRootKey['agency:root-a']['src/utils.ts'],
      'json'
    );
    assert.match(
      document.getElementById('snapshot')?.textContent || '',
      /"current":null,"main":null,"utils":"json"/
    );

    await act(async () => {
      root.unmount();
    });
  } finally {
    env.cleanup();
  }
});

test('keeps overrides isolated by root key and preserves previous root state', async () => {
  const env = setupDom();
  let uiStateStore: any = {
    workbenchLanguageOverrideStateByRootKey: {
      'agency:root-a': {
        'src/main.ts': 'typescript',
      },
      'agency:root-b': {
        'src/main.ts': 'python',
      },
    },
  };
  const setCalls: any[] = [];

  try {
    (window as any).agency = {
      getUiState: async () => uiStateStore,
      setUiState: async (payload: any) => {
        uiStateStore = { ...uiStateStore, ...payload };
        setCalls.push(payload);
      },
    };

    const root = createRoot(document.getElementById('root')!);

    await act(async () => {
      root.render(<Harness stateKey="agency:root-a" currentFilePath="src/main.ts" />);
      await Promise.resolve();
    });

    await act(async () => {
      (document.getElementById('set-utils-go') as HTMLButtonElement).click();
      await Promise.resolve();
    });
    await waitFor(
      () => uiStateStore.workbenchLanguageOverrideStateByRootKey?.['agency:root-a']?.['src/utils.ts'] === 'go'
    );

    const snapshotAfterRootAWrite = document.getElementById('snapshot')?.textContent || '';
    assert.match(snapshotAfterRootAWrite, /"current":"typescript","main":"typescript","utils":"go"/);

    await act(async () => {
      root.render(<Harness stateKey="agency:root-b" currentFilePath="src/main.ts" />);
      await Promise.resolve();
    });

    const snapshotAfterRootSwitch = document.getElementById('snapshot')?.textContent || '';
    assert.match(snapshotAfterRootSwitch, /"current":"python","main":"python","utils":null/);

    await act(async () => {
      (document.getElementById('set-current-js') as HTMLButtonElement).click();
      await Promise.resolve();
    });
    await waitFor(
      () =>
        uiStateStore.workbenchLanguageOverrideStateByRootKey?.['agency:root-b']?.['src/main.ts'] ===
        'javascript'
    );

    assert.ok(setCalls.length > 0);
    const byRoot = uiStateStore.workbenchLanguageOverrideStateByRootKey;
    assert.equal(byRoot['agency:root-a']['src/main.ts'], 'typescript');
    assert.equal(byRoot['agency:root-a']['src/utils.ts'], 'go');
    assert.equal(byRoot['agency:root-b']['src/main.ts'], 'javascript');

    await act(async () => {
      root.unmount();
    });
  } finally {
    env.cleanup();
  }
});
