import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildExplorerFilterSummary,
  countActiveExplorerFilters,
  EXPLORER_FILTER_SEMANTIC,
  EXPLORER_FILTER_STATUS,
  EXPLORER_FILTER_VISIBILITY_CHANGES_ONLY,
  getDefaultExplorerFilterDescriptorState,
} from '../explorerFilterDescriptors';
import {
  getExplorerCommandsForSurface,
  resolveExplorerCommandsForSurface,
} from '../explorerCommands';
import {
  EXPLORER_SEARCH_MODE_CONTENT,
  EXPLORER_SEARCH_MODE_PATH,
  getExplorerContentScopeOptions,
  getExplorerSearchModeOptions,
  normalizeExplorerContentScopeKindForSupportedScopes,
  normalizeExplorerContentScopeKind,
  normalizeExplorerSearchMode,
  normalizeExplorerSearchModeForSupportedModes,
} from '../explorerSearchModel';
import {
  EXPLORER_WORKING_SET_CHANGED_FILES,
  EXPLORER_WORKING_SET_TREE,
  getExplorerWorkingSetDescriptor,
  normalizeExplorerWorkingSetId,
  resolveExplorerWorkingSetOptions,
} from '../explorerWorkingSets';
import { buildExplorerVisibleItems } from '../explorerVisibleItems';

test('filter descriptor helpers preserve readable summaries and counts', () => {
  const descriptorState = getDefaultExplorerFilterDescriptorState();
  descriptorState[EXPLORER_FILTER_VISIBILITY_CHANGES_ONLY] = true;
  descriptorState[EXPLORER_FILTER_STATUS] = ['modified'];
  descriptorState[EXPLORER_FILTER_SEMANTIC] = ['agency'];

  assert.equal(countActiveExplorerFilters(descriptorState), 3);
  assert.equal(
    buildExplorerFilterSummary(descriptorState, {
      statusLabels: { modified: 'Modified' },
      semanticRuleLabelById: new Map([['agency', 'Agency Files']]),
    }),
    'Changes only · Modified · Agency Files'
  );
});

test('command registry hides research actions unless the lane is enabled', () => {
  const hiddenCommands = getExplorerCommandsForSurface('header', {
    selectionTargets: [],
    canPaste: false,
    hasResearchLane: false,
    hiddenCommandIds: [],
    actions: {},
  });
  const visibleCommands = getExplorerCommandsForSurface('header', {
    selectionTargets: [],
    canPaste: false,
    hasResearchLane: true,
    hiddenCommandIds: [],
    actions: {},
  });

  assert.equal(
    hiddenCommands.some((command) => command.id === 'explorer.researchLane'),
    false
  );
  assert.equal(
    visibleCommands.some((command) => command.id === 'explorer.researchLane'),
    true
  );
  const researchLane = visibleCommands.find((command) => command.id === 'explorer.researchLane');
  assert.equal(researchLane?.placement, 'secondary');
});

test('project policy can hide registered commands without changing registry order', () => {
  const commands = resolveExplorerCommandsForSurface(
    'header',
    {
      selectionTargets: [],
      canPaste: false,
      hasResearchLane: true,
      actions: {},
    },
    {
      hiddenCommandIds: ['explorer.refresh', 'explorer.researchLane'],
    }
  );

  assert.equal(commands.some((command) => command.id === 'explorer.refresh'), false);
  assert.equal(commands.some((command) => command.id === 'explorer.researchLane'), false);
  assert.equal(commands.some((command) => command.id === 'explorer.newFile'), true);
});

test('changed-files working set advertises content search only', () => {
  const changedFiles = getExplorerWorkingSetDescriptor(EXPLORER_WORKING_SET_CHANGED_FILES);
  const supportedModes = getExplorerSearchModeOptions(changedFiles.supportedSearchModes);
  const supportedScopes = getExplorerContentScopeOptions(changedFiles.supportedContentScopeKinds);

  assert.equal(changedFiles.supportsFilterMenu, false);
  assert.deepEqual(
    supportedModes.map((option) => option.id),
    [EXPLORER_SEARCH_MODE_CONTENT]
  );
  assert.deepEqual(
    supportedScopes.map((option) => option.id),
    ['project']
  );
  assert.equal(
    normalizeExplorerSearchModeForSupportedModes(
      EXPLORER_SEARCH_MODE_PATH,
      changedFiles.supportedSearchModes
    ),
    EXPLORER_SEARCH_MODE_CONTENT
  );
  assert.equal(
    normalizeExplorerContentScopeKindForSupportedScopes(
      'selection',
      changedFiles.supportedContentScopeKinds
    ),
    'project'
  );
});

test('platform normalization falls back to safe built-in defaults', () => {
  assert.equal(normalizeExplorerSearchMode('content'), EXPLORER_SEARCH_MODE_CONTENT);
  assert.equal(normalizeExplorerSearchMode('unknown'), EXPLORER_SEARCH_MODE_PATH);
  assert.equal(normalizeExplorerContentScopeKind('selection'), 'selection');
  assert.equal(normalizeExplorerContentScopeKind('other'), 'project');
  assert.equal(normalizeExplorerWorkingSetId(EXPLORER_WORKING_SET_CHANGED_FILES), 'changed-files');
  assert.equal(normalizeExplorerWorkingSetId('future-view'), EXPLORER_WORKING_SET_TREE);
});

test('working-set presets can narrow and order visible working-set options', () => {
  const workingSets = resolveExplorerWorkingSetOptions(['changed-files'], []);
  assert.deepEqual(
    workingSets.map((entry) => entry.id),
    [EXPLORER_WORKING_SET_TREE, EXPLORER_WORKING_SET_CHANGED_FILES]
  );
});

test('working-set resolution keeps the full implemented baseline when no presets exist', () => {
  const workingSets = resolveExplorerWorkingSetOptions([], [EXPLORER_WORKING_SET_TREE]);
  assert.deepEqual(
    workingSets.map((entry) => entry.id),
    [EXPLORER_WORKING_SET_TREE, EXPLORER_WORKING_SET_CHANGED_FILES]
  );
});

test('root-level draft entries stay visible when creating a new item at repository root', () => {
  const items = buildExplorerVisibleItems({
    tree: {
      nodes: {
        '': { path: '', name: '', type: 'dir' },
        'README.md': { path: 'README.md', name: 'README.md', type: 'file' },
      },
      children: {
        '': ['README.md'],
      },
    },
    expandedPaths: new Set(['']),
    isSearchActive: false,
    showHidden: true,
    showIgnored: true,
    draftEntry: { parentPath: '', type: 'file' },
    folderStatusByPath: {},
    statusByPath: {},
    getScopedEntry: (entry: any) => entry,
    hasChangeFilter: false,
    hasStatusFilters: false,
    statusFilterSet: new Set(),
    matchesSemanticFilter: () => true,
    isPathIgnored: () => false,
  });

  assert.equal(items[0]?.draft, true);
  assert.equal(items[0]?.path, '__d__root');
  assert.equal(items[0]?.depth, 0);
});
