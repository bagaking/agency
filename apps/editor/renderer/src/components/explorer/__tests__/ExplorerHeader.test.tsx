import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { ExplorerHeader } from '../ExplorerHeader';
import {
  EXPLORER_HEADER_INLINE_MIN_WIDTH,
  resolveExplorerHeaderLayout,
} from '../explorerHeaderLayout';

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
