export const EXPLORER_WORKING_SET_TREE = 'tree';
export const EXPLORER_WORKING_SET_CHANGED_FILES = 'changed-files';

export type ExplorerWorkingSetId =
  | typeof EXPLORER_WORKING_SET_TREE
  | typeof EXPLORER_WORKING_SET_CHANGED_FILES
  | string;

export type ExplorerWorkingSetDescriptor = {
  id: ExplorerWorkingSetId;
  label: string;
  description: string;
  implemented: boolean;
};

export const EXPLORER_WORKING_SET_DESCRIPTORS: ExplorerWorkingSetDescriptor[] = [
  {
    id: EXPLORER_WORKING_SET_TREE,
    label: 'Tree',
    description: 'Canonical project tree',
    implemented: true,
  },
  {
    id: EXPLORER_WORKING_SET_CHANGED_FILES,
    label: 'Changed',
    description: 'Files changed in the active Cell/worktree',
    implemented: true,
  },
  {
    id: 'semantic-files',
    label: 'Semantic',
    description: 'Future semantic-file working set',
    implemented: false,
  },
  {
    id: 'recent-files',
    label: 'Recent',
    description: 'Future recent-file working set',
    implemented: false,
  },
  {
    id: 'session-relevant-files',
    label: 'Session',
    description: 'Future session-relevant working set',
    implemented: false,
  },
];

export const getImplementedExplorerWorkingSets = () =>
  EXPLORER_WORKING_SET_DESCRIPTORS.filter((descriptor) => descriptor.implemented);

export const normalizeExplorerWorkingSetId = (value: unknown): ExplorerWorkingSetId => {
  const normalized = String(value || '').trim();
  if (!normalized) {
    return EXPLORER_WORKING_SET_TREE;
  }
  const known = EXPLORER_WORKING_SET_DESCRIPTORS.find((descriptor) => descriptor.id === normalized);
  if (!known || !known.implemented) {
    return EXPLORER_WORKING_SET_TREE;
  }
  return known.id;
};
