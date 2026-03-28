import assert from 'node:assert/strict';
import test from 'node:test';
import { JSDOM } from 'jsdom';
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';

import { ExplorerItem } from '../ExplorerItem';

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
  };
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    HTMLElement: dom.window.HTMLElement,
    Node: dom.window.Node,
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

test('ExplorerItem exposes treeitem semantics and expander state for directories', async () => {
  const env = setupDom();
  try {
    const root = createRoot(document.getElementById('root')!);

    await act(async () => {
      root.render(
        <ExplorerItem
          item={{ path: 'src', depth: 0, type: 'dir', setSize: 3, posInSet: 2 }}
          node={{ name: 'src', type: 'dir' }}
          treeItemId="explorer-treeitem-src"
          isSelected={true}
          isFocused={true}
          isLoading={false}
          isExpanded={true}
          isSearchActive={false}
          isOpen={false}
          isDirty={false}
          isIgnored={false}
          status="modified"
          added={2}
          deleted={1}
          semanticTags={[]}
          commentCount={0}
          onJumpToComments={() => {}}
          cellBadges={null}
          depth={0}
          onToggle={() => {}}
          onClick={() => {}}
          onDoubleClick={() => {}}
          onContextMenu={() => {}}
          onDragStart={() => {}}
          onDragOver={() => {}}
          onDrop={() => {}}
          renameTarget={null}
          handleRenameSubmit={() => {}}
          setRenameTarget={() => {}}
        />
      );
    });

    const treeItem = document.querySelector('[role="treeitem"]');
    assert.ok(treeItem);
    assert.equal(treeItem?.getAttribute('id'), 'explorer-treeitem-src');
    assert.equal(treeItem?.getAttribute('aria-level'), '1');
    assert.equal(treeItem?.getAttribute('aria-selected'), 'true');
    assert.equal(treeItem?.getAttribute('aria-expanded'), 'true');
    assert.equal(treeItem?.getAttribute('aria-setsize'), '3');
    assert.equal(treeItem?.getAttribute('aria-posinset'), '2');

    const expander = document.querySelector('button[aria-label="Collapse src"]');
    assert.ok(expander);
    assert.equal(expander?.getAttribute('aria-expanded'), 'true');

    await act(async () => {
      root.unmount();
    });
  } finally {
    env.cleanup();
  }
});
