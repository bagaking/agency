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
  resolveExplorerCommandsForSurface,
} from '../explorerCommands';
import {
  EXPLORER_SEARCH_MODE_CONTENT,
  EXPLORER_SEARCH_MODE_PATH,
  EXPLORER_SEARCH_MODE_URL,
  getExplorerSearchModeDescriptor,
  getExplorerContentScopeOptions,
  getExplorerSearchModeOptions,
  isExplorerSupportedPublicUrl,
  normalizeExplorerSupportedPublicUrl,
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
import { resolveExplorerCellAttribution } from '../explorerCellAttribution';

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

test('project policy can hide registered commands without changing registry order', () => {
  const commands = resolveExplorerCommandsForSurface(
    'header',
    {
      selectionTargets: [],
      canPaste: false,
      actions: {},
    },
    {
      hiddenCommandIds: ['explorer.refresh'],
    }
  );

  assert.equal(commands.some((command) => command.id === 'explorer.refresh'), false);
  assert.equal(commands.some((command) => command.id === 'explorer.newFile'), true);
});

test('url mode is a first-class search descriptor with explicit intake semantics', () => {
  const descriptor = getExplorerSearchModeDescriptor(EXPLORER_SEARCH_MODE_URL);

  assert.equal(descriptor.label, 'URL');
  assert.equal(descriptor.inputType, 'url');
  assert.equal(descriptor.submitLabel, 'Open Web');
  assert.equal(descriptor.submitBusyLabel, 'Opening…');
});

test('tree working set keeps path, content, and url intake available', () => {
  const tree = getExplorerWorkingSetDescriptor(EXPLORER_WORKING_SET_TREE);
  const supportedModes = getExplorerSearchModeOptions(tree.supportedSearchModes);

  assert.equal(tree.supportsFilterMenu, true);
  assert.deepEqual(
    supportedModes.map((option) => option.id),
    [EXPLORER_SEARCH_MODE_PATH, EXPLORER_SEARCH_MODE_CONTENT, EXPLORER_SEARCH_MODE_URL]
  );
});

test('changed-files working set advertises content and url search', () => {
  const changedFiles = getExplorerWorkingSetDescriptor(EXPLORER_WORKING_SET_CHANGED_FILES);
  const supportedModes = getExplorerSearchModeOptions(changedFiles.supportedSearchModes);
  const supportedScopes = getExplorerContentScopeOptions(changedFiles.supportedContentScopeKinds);

  assert.equal(changedFiles.supportsFilterMenu, false);
  assert.deepEqual(
    supportedModes.map((option) => option.id),
    [EXPLORER_SEARCH_MODE_CONTENT, EXPLORER_SEARCH_MODE_URL]
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
  assert.equal(normalizeExplorerSearchMode('url'), EXPLORER_SEARCH_MODE_URL);
  assert.equal(normalizeExplorerSearchMode('unknown'), EXPLORER_SEARCH_MODE_PATH);
  assert.equal(normalizeExplorerContentScopeKind('selection'), 'selection');
  assert.equal(normalizeExplorerContentScopeKind('other'), 'project');
  assert.equal(normalizeExplorerWorkingSetId(EXPLORER_WORKING_SET_CHANGED_FILES), 'changed-files');
  assert.equal(normalizeExplorerWorkingSetId('future-view'), EXPLORER_WORKING_SET_TREE);
});

test('public url normalization accepts docs-like urls and rejects local/private hosts', () => {
  assert.equal(
    normalizeExplorerSupportedPublicUrl('example.com/docs'),
    'https://example.com/docs'
  );
  assert.equal(isExplorerSupportedPublicUrl('https://example.com'), true);
  assert.equal(normalizeExplorerSupportedPublicUrl('http://localhost:3000'), '');
  assert.equal(normalizeExplorerSupportedPublicUrl('http://192.168.1.2/docs'), '');
  assert.equal(normalizeExplorerSupportedPublicUrl('notes/internal'), '');
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
        '': { name: '', type: 'dir' },
        'README.md': { name: 'README.md', type: 'file' },
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

test('cell attribution sanitizes sparse entries before badge rendering', () => {
  const attributions = resolveExplorerCellAttribution({
    cellA: undefined,
    cellB: {
      id: 'cell-b',
      name: 'main',
      added: 3,
      deleted: 1,
    },
    cellC: {
      id: 'cell-c',
      added: '2',
      deleted: 0,
    },
  });

  assert.deepEqual(attributions, [
    {
      id: 'cell-b',
      name: 'main',
      added: 3,
      deleted: 1,
    },
    {
      id: 'cell-c',
      name: 'cell-c',
      added: 2,
      deleted: 0,
    },
  ]);
});
