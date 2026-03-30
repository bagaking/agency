import assert from 'node:assert/strict';
import test from 'node:test';
import { JSDOM } from 'jsdom';
import React, { useState } from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';

import { useExplorerCapabilityPreferences } from '../useExplorerCapabilityPreferences';

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

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve;
  });
  return { promise, resolve };
}

function Harness({ stateKey, projectPolicy }: { stateKey: string; projectPolicy?: Record<string, any> | null }) {
  const [showHidden, setShowHidden] = useState(true);
  const [showIgnored, setShowIgnored] = useState(false);
  const [showChangesOnly, setShowChangesOnly] = useState(false);
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const [semanticFilters, setSemanticFilters] = useState<string[]>([]);
  const [workingSetViewId, setWorkingSetViewId] = useState('tree');
  const [searchMode, setSearchMode] = useState('path');
  const [contentScopeKind, setContentScopeKind] = useState('project');
  const [contentCaseSensitive, setContentCaseSensitive] = useState(false);
  const [contentWholeWord, setContentWholeWord] = useState(false);
  const [contentUseRegex, setContentUseRegex] = useState(false);

  useExplorerCapabilityPreferences({
    stateKey,
    projectPolicy,
    showHidden,
    setShowHidden,
    showIgnored,
    setShowIgnored,
    showChangesOnly,
    setShowChangesOnly,
    statusFilters,
    setStatusFilters,
    semanticFilters,
    setSemanticFilters,
    workingSetViewId,
    setWorkingSetViewId,
    searchMode,
    setSearchMode,
    contentScopeKind,
    setContentScopeKind,
    contentCaseSensitive,
    setContentCaseSensitive,
    contentWholeWord,
    setContentWholeWord,
    contentUseRegex,
    setContentUseRegex,
  });

  return (
    <div>
      <button id="set-working-set" type="button" onClick={() => setWorkingSetViewId('changed-files')}>
        changed
      </button>
      <button id="set-search-mode" type="button" onClick={() => setSearchMode('content')}>
        content
      </button>
      <output id="snapshot">
        {JSON.stringify({
          workingSetViewId,
          searchMode,
        })}
      </output>
    </div>
  );
}

test('late project policy defaults do not overwrite live capability interaction', async () => {
  const env = setupDom();
  const deferred = createDeferred<any>();
  try {
    (window as any).agency = {
      getUiState: () => deferred.promise,
      setUiState: async () => undefined,
    };

    const root = createRoot(document.getElementById('root')!);

    await act(async () => {
      root.render(<Harness stateKey="agency:explorer:/tmp/project" projectPolicy={null} />);
    });

    await act(async () => {
      (document.getElementById('set-working-set') as HTMLButtonElement).click();
      (document.getElementById('set-search-mode') as HTMLButtonElement).click();
    });

    assert.match(
      document.getElementById('snapshot')?.textContent || '',
      /"workingSetViewId":"changed-files","searchMode":"content"/
    );

    await act(async () => {
      root.render(
        <Harness
          stateKey="agency:explorer:/tmp/project"
          projectPolicy={{
            workingSet: { defaultView: 'tree' },
            search: { defaultMode: 'path' },
          }}
        />
      );
    });

    assert.match(
      document.getElementById('snapshot')?.textContent || '',
      /"workingSetViewId":"changed-files","searchMode":"content"/
    );

    await act(async () => {
      deferred.resolve({
        explorerCapabilityStateByRootKey: {},
        explorerFilterStateByRootKey: {},
      });
      await Promise.resolve();
    });

    assert.match(
      document.getElementById('snapshot')?.textContent || '',
      /"workingSetViewId":"changed-files","searchMode":"content"/
    );

    await act(async () => {
      root.unmount();
    });
  } finally {
    env.cleanup();
  }
});
