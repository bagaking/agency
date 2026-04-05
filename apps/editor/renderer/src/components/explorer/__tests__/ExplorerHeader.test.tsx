import assert from 'node:assert/strict';
import test from 'node:test';
import { JSDOM } from 'jsdom';
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';

import { ExplorerHeader, shouldRunInlineSearchAction } from '../ExplorerHeader';
import {
  EXPLORER_HEADER_INLINE_MIN_WIDTH,
  resolveExplorerHeaderLayout,
} from '../explorerHeaderLayout';

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
    ResizeObserver: (globalThis as any).ResizeObserver,
  };

  class MockResizeObserver {
    callback: ResizeObserverCallback;

    constructor(callback: ResizeObserverCallback) {
      this.callback = callback;
    }

    observe(target: Element) {
      this.callback(
        [
          {
            target,
            contentRect: {
              width: EXPLORER_HEADER_INLINE_MIN_WIDTH - 24,
            } as DOMRectReadOnly,
          } as ResizeObserverEntry,
        ],
        this as unknown as ResizeObserver
      );
    }

    disconnect() {}
  }

  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    HTMLElement: dom.window.HTMLElement,
    Node: dom.window.Node,
    SVGElement: dom.window.SVGElement,
    ResizeObserver: MockResizeObserver,
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
        ResizeObserver: previous.ResizeObserver,
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

test('ExplorerHeader uses canonical cell naming for scope selection', () => {
  const html = renderToStaticMarkup(
    <ExplorerHeader
      activeRootLabel="main"
      activeFilterCount={0}
      activeFilterSummary="Changes only"
      headerCommands={[]}
      hasCells={true}
      cells={[
        { id: 'cell-main', name: 'main' },
        { id: 'cell-api', name: 'api' },
      ]}
      selectedId="cell-main"
      onSelectCell={() => undefined}
      searchQuery=""
      onSearchChange={() => undefined}
      onClearSearch={() => undefined}
      hasActiveFilters={false}
      filterMenuOpen={false}
      filterMenuId="explorer-filters"
      filterMenuButtonRef={{ current: null }}
      onToggleFilterMenu={() => undefined}
      searchTruncated={false}
    />
  );

  assert.match(html, /data-explorer-header-layout="inline"/);
  assert.match(html, /aria-label="Active cell"/);
  assert.match(html, />main</);
  assert.match(html, />api</);
});

test('ExplorerHeader hides unsupported filter affordances for non-tree surfaces', () => {
  const html = renderToStaticMarkup(
    <ExplorerHeader
      activeRootLabel="main"
      activeFilterCount={0}
      activeFilterSummary=""
      headerCommands={[]}
      hasCells={false}
      cells={[]}
      selectedId=""
      onSelectCell={() => undefined}
      workingSetOptions={[]}
      activeWorkingSetViewId="changed-files"
      onWorkingSetChange={() => undefined}
      searchMode="content"
      searchModeOptions={[{ id: 'content', label: 'Content', placeholder: 'Search file contents…' }]}
      onSearchModeChange={() => undefined}
      searchQuery=""
      onSearchChange={() => undefined}
      onClearSearch={() => undefined}
      hasActiveFilters={false}
      showFilterMenuButton={false}
      filterMenuOpen={false}
      filterMenuId="explorer-filters"
      filterMenuButtonRef={{ current: null }}
      onToggleFilterMenu={() => undefined}
      searchTruncated={false}
    />
  );

  assert.doesNotMatch(html, /Explorer filters/);
  assert.doesNotMatch(html, /Changes only/);
  assert.match(html, /Search file contents…/);
  assert.doesNotMatch(html, />Scope</);
  assert.doesNotMatch(html, />View</);
});

test('ExplorerHeader exposes explicit submit affordance for url mode', () => {
  const html = renderToStaticMarkup(
    <ExplorerHeader
      activeRootLabel="main"
      activeFilterCount={0}
      activeFilterSummary=""
      headerCommands={[]}
      hasCells={false}
      cells={[]}
      selectedId=""
      onSelectCell={() => undefined}
      workingSetOptions={[]}
      activeWorkingSetViewId="tree"
      onWorkingSetChange={() => undefined}
      searchMode="url"
      searchModeOptions={[
        {
          id: 'url',
          label: 'URL',
          placeholder: 'Paste a documentation or research URL…',
          inputType: 'url',
          submitLabel: 'Open Web',
        },
      ]}
      onSearchModeChange={() => undefined}
      searchQuery=""
      onSearchChange={() => undefined}
      onClearSearch={() => undefined}
      searchInputType="url"
      searchSubmitLabel="Open Web"
      searchSubmitDisabled={false}
      onSearchSubmit={() => undefined}
      hasActiveFilters={false}
      showFilterMenuButton={false}
      filterMenuOpen={false}
      filterMenuId="explorer-filters"
      filterMenuButtonRef={{ current: null }}
      onToggleFilterMenu={() => undefined}
      searchTruncated={false}
    />
  );

  assert.match(html, /type="url"/);
  assert.match(html, />Open Web</);
  assert.match(html, /data-testid="explorer-search-shell"/);
  assert.match(html, /pr-28/);
});

test('ExplorerHeader renders url affordance without switching into url mode', () => {
  const html = renderToStaticMarkup(
    <ExplorerHeader
      activeRootLabel="main"
      activeFilterCount={0}
      activeFilterSummary=""
      headerCommands={[]}
      hasCells={false}
      cells={[]}
      selectedId=""
      onSelectCell={() => undefined}
      workingSetOptions={[]}
      activeWorkingSetViewId="tree"
      onWorkingSetChange={() => undefined}
      searchMode="path"
      searchModeOptions={[
        { id: 'path', label: 'Paths', placeholder: 'Search files…', inputType: 'text' },
        { id: 'url', label: 'URL', placeholder: 'Paste a documentation or research URL…', inputType: 'url', submitLabel: 'Open Web' },
      ]}
      onSearchModeChange={() => undefined}
      searchQuery="example.com/docs"
      onSearchChange={() => undefined}
      onClearSearch={() => undefined}
      showUrlAffordance={true}
      onUrlAffordance={() => undefined}
      hasActiveFilters={false}
      showFilterMenuButton={false}
      filterMenuOpen={false}
      filterMenuId="explorer-filters"
      filterMenuButtonRef={{ current: null }}
      onToggleFilterMenu={() => undefined}
      searchTruncated={false}
    />
  );

  assert.match(html, />Open Web</);
  assert.match(html, /Press Enter to open this URL/);
});

test('ExplorerHeader keeps working-set controls in the compact title rail', () => {
  const html = renderToStaticMarkup(
    <ExplorerHeader
      activeRootLabel="main"
      activeFilterCount={1}
      activeFilterSummary="Changes only"
      headerCommands={[]}
      hasCells={false}
      cells={[]}
      selectedId=""
      onSelectCell={() => undefined}
      workingSetOptions={[
        { id: 'tree', label: 'Tree' },
        { id: 'changed-files', label: 'Changed' },
      ]}
      activeWorkingSetViewId="tree"
      onWorkingSetChange={() => undefined}
      searchMode="path"
      searchModeOptions={[{ id: 'path', label: 'Paths', placeholder: 'Search files…' }]}
      onSearchModeChange={() => undefined}
      searchQuery=""
      onSearchChange={() => undefined}
      onClearSearch={() => undefined}
      hasActiveFilters={true}
      filterMenuOpen={false}
      filterMenuId="explorer-filters"
      filterMenuButtonRef={{ current: null }}
      onToggleFilterMenu={() => undefined}
      searchTruncated={false}
    />
  );

  assert.match(html, /data-testid="explorer-working-set-toggle"/);
  assert.match(html, />Tree</);
  assert.match(html, />Changed</);
  assert.match(html, /Changes only/);
});

test('ExplorerHeader layout resolver stacks secondary controls before the shell gets squeezed', () => {
  assert.equal(resolveExplorerHeaderLayout(EXPLORER_HEADER_INLINE_MIN_WIDTH + 24), 'inline');
  assert.equal(resolveExplorerHeaderLayout(EXPLORER_HEADER_INLINE_MIN_WIDTH - 1), 'stacked');
  assert.equal(resolveExplorerHeaderLayout(undefined), 'inline');
});

test('ExplorerHeader renders stacked secondary rail when the sidebar width is constrained', async () => {
  const env = setupDom();
  try {
    const root = createRoot(document.getElementById('root')!);

    await act(async () => {
      root.render(
        <ExplorerHeader
          activeRootLabel="main"
          activeFilterCount={1}
          activeFilterSummary="Changes only"
          headerCommands={[]}
          hasCells={true}
          cells={[{ id: 'cell-main', name: 'main' }]}
          selectedId="cell-main"
          onSelectCell={() => undefined}
          workingSetOptions={[
            { id: 'tree', label: 'Tree' },
            { id: 'changed-files', label: 'Changed' },
          ]}
          activeWorkingSetViewId="tree"
          onWorkingSetChange={() => undefined}
          searchMode="path"
          searchModeOptions={[{ id: 'path', label: 'Paths', placeholder: 'Search files…' }]}
          onSearchModeChange={() => undefined}
          searchQuery=""
          onSearchChange={() => undefined}
          onClearSearch={() => undefined}
          hasActiveFilters={true}
          filterMenuOpen={false}
          filterMenuId="explorer-filters"
          filterMenuButtonRef={{ current: null }}
          onToggleFilterMenu={() => undefined}
          searchTruncated={false}
        />
      );
    });

    const header = document.querySelector('[data-testid="explorer-header"]');
    const secondaryRail = document.querySelector('[data-testid="explorer-secondary-rail"]');
    assert.equal(header?.getAttribute('data-explorer-header-layout'), 'stacked');
    assert.ok(secondaryRail);

    await act(async () => {
      root.unmount();
    });
  } finally {
    env.cleanup();
  }
});

test('ExplorerHeader search-mode control supports arrow-key selection inside the radio group', async () => {
  const env = setupDom();
  try {
    let activeMode = 'path';
    const root = createRoot(document.getElementById('root')!);

    const renderView = () => (
      <ExplorerHeader
        activeRootLabel="main"
        activeFilterCount={0}
        activeFilterSummary=""
        headerCommands={[]}
        hasCells={false}
        cells={[]}
        selectedId=""
        onSelectCell={() => undefined}
        workingSetOptions={[]}
        activeWorkingSetViewId="tree"
        onWorkingSetChange={() => undefined}
        searchMode={activeMode}
        searchModeOptions={[
          { id: 'path', label: 'Paths', placeholder: 'Search files…' },
          { id: 'content', label: 'Content', placeholder: 'Search content…' },
        ]}
        onSearchModeChange={(nextMode: string) => {
          activeMode = nextMode;
        }}
        searchQuery=""
        onSearchChange={() => undefined}
        onClearSearch={() => undefined}
        hasActiveFilters={false}
        showFilterMenuButton={false}
        filterMenuOpen={false}
        filterMenuId="explorer-filters"
        filterMenuButtonRef={{ current: null }}
        onToggleFilterMenu={() => undefined}
        searchTruncated={false}
      />
    );

    await act(async () => {
      root.render(renderView());
    });

    const radios = Array.from(document.querySelectorAll('[role="radio"]')) as HTMLButtonElement[];
    assert.equal(radios.length, 2);
    await act(async () => {
      radios[0].focus();
      radios[0].dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
      root.render(renderView());
    });

    assert.equal(activeMode, 'content');

    await act(async () => {
      root.unmount();
    });
  } finally {
    env.cleanup();
  }
});

test('ExplorerHeader Enter shortcut helper respects disabled inline submit state', () => {
  assert.equal(
    shouldRunInlineSearchAction({
      key: 'Enter',
      hasInlineSearchAction: true,
      disabled: true,
    }),
    false
  );
  assert.equal(
    shouldRunInlineSearchAction({
      key: 'Enter',
      hasInlineSearchAction: true,
      disabled: false,
    }),
    true
  );
  assert.equal(
    shouldRunInlineSearchAction({
      key: 'Escape',
      hasInlineSearchAction: true,
      disabled: false,
    }),
    false
  );
});
