import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { ExplorerHeader } from '../ExplorerHeader';

test('ExplorerHeader uses canonical cell naming for scope selection', () => {
  const html = renderToStaticMarkup(
    <ExplorerHeader
      activeRootLabel="main"
      activeFilterCount={0}
      activeFilterSummary=""
      onJumpToAgents={() => undefined}
      onNewFile={() => undefined}
      onNewFolder={() => undefined}
      onRefresh={() => undefined}
      isLoading={false}
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

  assert.match(html, /aria-label="Active cell"/);
  assert.match(html, /Cell: main/);
  assert.match(html, /Cell: api/);
});
