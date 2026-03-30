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
import { getExplorerCommandsForSurface } from '../explorerCommands';
import {
  EXPLORER_SEARCH_MODE_CONTENT,
  EXPLORER_SEARCH_MODE_PATH,
  normalizeExplorerContentScopeKind,
  normalizeExplorerSearchMode,
} from '../explorerSearchModel';
import {
  EXPLORER_WORKING_SET_CHANGED_FILES,
  EXPLORER_WORKING_SET_TREE,
  normalizeExplorerWorkingSetId,
  resolveExplorerWorkingSetOptions,
} from '../explorerWorkingSets';

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
});

test('command registry applies project-level hidden command ids', () => {
  const commands = getExplorerCommandsForSurface('header', {
    selectionTargets: [],
    canPaste: false,
    hasResearchLane: true,
    hiddenCommandIds: ['explorer.refresh', 'explorer.researchLane'],
    actions: {},
  });

  assert.equal(commands.some((command) => command.id === 'explorer.refresh'), false);
  assert.equal(commands.some((command) => command.id === 'explorer.researchLane'), false);
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
