import assert from 'node:assert/strict';
import test from 'node:test';
import { JSDOM } from 'jsdom';
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';

import { ExplorerContentSearchView } from '../ExplorerContentSearchView';

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
    Event: globalThis.Event,
    MouseEvent: globalThis.MouseEvent,
    KeyboardEvent: globalThis.KeyboardEvent,
    SVGElement: globalThis.SVGElement,
  };
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    HTMLElement: dom.window.HTMLElement,
    Node: dom.window.Node,
    Event: dom.window.Event,
    MouseEvent: dom.window.MouseEvent,
    KeyboardEvent: dom.window.KeyboardEvent,
    SVGElement: dom.window.SVGElement,
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
        Event: previous.Event,
        MouseEvent: previous.MouseEvent,
        KeyboardEvent: previous.KeyboardEvent,
        SVGElement: previous.SVGElement,
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

test('ExplorerContentSearchView uses a real indeterminate checkbox for partially reviewed files', async () => {
  const env = setupDom();
  try {
    const root = createRoot(document.getElementById('root')!);
    await act(async () => {
      root.render(
        <ExplorerContentSearchView
          query="content search"
          replaceText="workspace search"
          setReplaceText={() => undefined}
          scopeOptions={[{ id: 'project', label: 'Project' }]}
          activeScopeKind="project"
          onScopeChange={() => undefined}
          caseSensitive={false}
          wholeWord={false}
          useRegex={false}
          onToggleCaseSensitive={() => undefined}
          onToggleWholeWord={() => undefined}
          onToggleUseRegex={() => undefined}
          replacementPreviewEnabled={true}
          results={[
            {
              path: 'docs/guide.md',
              matchCount: 2,
              matches: [
                { line: 1, column: 1, endColumn: 15, text: 'content search', snippet: 'content search one' },
                { line: 2, column: 1, endColumn: 15, text: 'content search', snippet: 'content search two' },
              ],
            },
          ]}
          loading={false}
          replacing={false}
          truncated={false}
          totalResultFiles={1}
          totalResultMatches={2}
          scannedFiles={1}
          skippedBinaryCount={0}
          skippedLargeCount={0}
          error=""
          selectedPaths={['docs/guide.md']}
          fullFilePaths={[]}
          selectedMatchKeys={[JSON.stringify(['docs/guide.md', 1, 1, 15, 'content search'])]}
          selectedFileCount={1}
          selectedMatchCount={1}
          onToggleResult={() => undefined}
          onToggleMatch={() => undefined}
          onSelectAllVisible={() => undefined}
          onClearSelection={() => undefined}
          onOpenResult={() => undefined}
          onRevealResult={() => undefined}
          onApplyReplace={() => undefined}
        />
      );
    });

    const checkbox = document.querySelector(
      'input[aria-label="Confirm replace target docs/guide.md"]'
    ) as HTMLInputElement | null;
    assert.ok(checkbox);
    assert.equal(checkbox.indeterminate, true);

    await act(async () => {
      root.unmount();
    });
  } finally {
    env.cleanup();
  }
});
