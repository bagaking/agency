import assert from 'node:assert/strict';
import test from 'node:test';
import { JSDOM } from 'jsdom';
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';

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

test('ExplorerItem shows a single prioritized row state badge and status indicator', async () => {
  const env = setupDom();
  try {
    const root = createRoot(document.getElementById('root')!);

    await act(async () => {
      root.render(
        <ExplorerItem
          item={{ path: 'src/app.ts', depth: 1, type: 'file' }}
          node={{ name: 'app.ts', type: 'file' }}
          treeItemId="explorer-treeitem-app"
          isSelected={false}
          isFocused={false}
          isLoading={false}
          isExpanded={false}
          isSearchActive={false}
          isOpen={true}
          isDirty={false}
          isIgnored={false}
          status="modified"
          added={0}
          deleted={0}
          semanticTags={[]}
          commentCount={0}
          onJumpToComments={() => {}}
          cellBadges={null}
          depth={1}
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

    const openBadge = document.querySelector('[data-explorer-state="open"]');
    const dirtyBadge = document.querySelector('[data-explorer-state="dirty"]');
    const statusIndicator = document.querySelector('[data-explorer-status="modified"][title="Modified"]');

    assert.ok(openBadge);
    assert.equal(openBadge?.textContent, 'Open');
    assert.equal(dirtyBadge, null);
    assert.ok(statusIndicator);
    assert.equal(statusIndicator?.textContent?.trim(), 'M');

    await act(async () => {
      root.unmount();
    });
  } finally {
    env.cleanup();
  }
});

test('ExplorerItem keeps ignored entries legible and prioritizes dirty over open state badges', () => {
  const html = renderToStaticMarkup(
    <ExplorerItem
      item={{ path: 'ignored.log', depth: 0, type: 'file' }}
      node={{ name: 'ignored.log', type: 'file' }}
      treeItemId="explorer-treeitem-ignored-log"
      isSelected={false}
      isFocused={false}
      isLoading={false}
      isExpanded={false}
      isOpen={true}
      isDirty={true}
      isIgnored={true}
      status={undefined}
      added={0}
      deleted={0}
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

  assert.doesNotMatch(html, /line-through/);
  assert.match(html, />Dirty</);
  assert.doesNotMatch(html, />Open</);
  assert.match(html, /ignored\.log/);
  assert.match(html, /data-explorer-ignored="true"/);
  assert.doesNotMatch(html, /data-explorer-status="ignored"/);
  assert.doesNotMatch(html, /text-muted-foreground\/56/);
  assert.match(html, /text-muted-foreground\/78/);
});

test('ExplorerItem constrains the metadata rail so status labels do not collide with file names', () => {
  const html = renderToStaticMarkup(
    <ExplorerItem
      item={{ path: 'apps', depth: 0, type: 'dir' }}
      node={{ name: 'apps', type: 'dir' }}
      treeItemId="explorer-treeitem-apps"
      isSelected={false}
      isFocused={false}
      isLoading={false}
      isExpanded={false}
      isOpen={false}
      isDirty={false}
      isIgnored={false}
      status="modified"
      added={4}
      deleted={4}
      semanticTags={[]}
      commentCount={0}
      onJumpToComments={() => {}}
      cellBadges={
        <div className="flex min-w-0 items-center gap-1">
          <span className="truncate">MAIN</span>
          <span className="shrink-0">+2</span>
        </div>
      }
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

  assert.match(html, /data-explorer-status="modified"/);
  assert.match(html, /data-explorer-meta-rail="true"/);
  assert.match(html, /max-w-\[45%\]/);
});

test('ExplorerItem routes filename double click through the dedicated rename affordance', async () => {
  const env = setupDom();
  try {
    const root = createRoot(document.getElementById('root')!);
    const events: string[] = [];

    await act(async () => {
      root.render(
        <ExplorerItem
          item={{ path: 'docs/guide.md', depth: 0, type: 'file' }}
          node={{ name: 'guide.md', type: 'file' }}
          treeItemId="explorer-treeitem-guide"
          isSelected={true}
          isFocused={true}
          isLoading={false}
          isExpanded={false}
          isOpen={false}
          isDirty={false}
          isIgnored={false}
          status={undefined}
          added={0}
          deleted={0}
          semanticTags={[]}
          commentCount={0}
          onJumpToComments={() => {}}
          cellBadges={null}
          depth={0}
          onToggle={() => {}}
          onClick={() => {}}
          onDoubleClick={() => {
            events.push('row');
          }}
          onNameDoubleClick={() => {
            events.push('name');
          }}
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

    const name = document.querySelector('[data-explorer-name="true"]');
    assert.ok(name);
    await act(async () => {
      name?.dispatchEvent(new window.MouseEvent('dblclick', { bubbles: true }));
    });

    assert.deepEqual(events, ['name']);

    await act(async () => {
      root.unmount();
    });
  } finally {
    env.cleanup();
  }
});

test('ExplorerItem hides the expander for restricted symbolic-link directories', () => {
  const html = renderToStaticMarkup(
    <ExplorerItem
      item={{ path: 'outside-dir', depth: 0, type: 'dir', isSymbolicLink: true }}
      node={{ name: 'outside-dir', type: 'dir', symlinkBoundaryState: 'outside-root' }}
      treeItemId="explorer-treeitem-outside-dir"
      isSelected={false}
      isFocused={false}
      isLoading={false}
      isExpanded={false}
      isOpen={false}
      isDirty={false}
      isIgnored={false}
      status={undefined}
      added={0}
      deleted={0}
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

  assert.doesNotMatch(html, /Expand outside-dir/);
  assert.match(html, /symbolic link resolves outside workspace/);
});

test('ExplorerItem falls back to the path basename when node.name is missing', () => {
  const html = renderToStaticMarkup(
    <ExplorerItem
      item={{ path: 'apps/editor/config.toml', depth: 0, type: 'file' }}
      node={{ type: 'file' }}
      treeItemId="explorer-treeitem-config-toml"
      isSelected={false}
      isFocused={false}
      isLoading={false}
      isExpanded={false}
      isOpen={false}
      isDirty={false}
      isIgnored={false}
      status={undefined}
      added={0}
      deleted={0}
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

  assert.match(html, /config\.toml/);
  assert.match(html, /aria-label="config\.toml, file"/);
});
