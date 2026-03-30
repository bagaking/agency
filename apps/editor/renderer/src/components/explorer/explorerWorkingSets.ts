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

const normalizeStringArray = (value: unknown) => {
  if (!Array.isArray(value)) {
    return [];
  }
  const seen = new Set<string>();
  return value
    .map((entry) => String(entry || '').trim())
    .filter((entry) => {
      if (!entry || seen.has(entry)) {
        return false;
      }
      seen.add(entry);
      return true;
    });
};

export const resolveExplorerWorkingSetOptions = (
  presetIds: unknown,
  requiredIds: unknown = []
) => {
  const implemented = getImplementedExplorerWorkingSets();
  const descriptorById = new Map(implemented.map((descriptor) => [descriptor.id, descriptor]));
  const normalizedPresetIds = normalizeStringArray(presetIds);
  const normalizedRequiredIds = normalizeStringArray(requiredIds);
  if (!normalizedPresetIds.length && !normalizedRequiredIds.length) {
    return implemented;
  }

  const next = [];
  const seen = new Set<string>();
  const pushDescriptor = (candidateId: string) => {
    const descriptor = descriptorById.get(candidateId);
    if (!descriptor || seen.has(descriptor.id)) {
      return;
    }
    seen.add(descriptor.id);
    next.push(descriptor);
  };

  pushDescriptor(EXPLORER_WORKING_SET_TREE);
  normalizedPresetIds.forEach(pushDescriptor);
  normalizedRequiredIds.forEach(pushDescriptor);

  return next.length ? next : implemented;
};

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
