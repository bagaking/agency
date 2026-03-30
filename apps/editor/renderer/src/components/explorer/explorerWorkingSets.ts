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
  panelId: 'tree' | 'changed-files';
  supportsFilterMenu: boolean;
  supportedSearchModes: string[];
  supportedContentScopeKinds: string[];
  title?: string;
};

export const EXPLORER_WORKING_SET_DESCRIPTORS: ExplorerWorkingSetDescriptor[] = [
  {
    id: EXPLORER_WORKING_SET_TREE,
    label: 'Tree',
    description: 'Canonical project tree',
    implemented: true,
    panelId: 'tree',
    supportsFilterMenu: true,
    supportedSearchModes: ['path', 'content'],
    supportedContentScopeKinds: ['project', 'folder', 'selection'],
    title: 'Explorer Tree',
  },
  {
    id: EXPLORER_WORKING_SET_CHANGED_FILES,
    label: 'Changed',
    description: 'Files changed in the active Cell/worktree',
    implemented: true,
    panelId: 'changed-files',
    supportsFilterMenu: false,
    supportedSearchModes: ['content'],
    supportedContentScopeKinds: ['project'],
    title: 'Changed Files',
  },
  {
    id: 'semantic-files',
    label: 'Semantic',
    description: 'Future semantic-file working set',
    implemented: false,
    panelId: 'changed-files',
    supportsFilterMenu: false,
    supportedSearchModes: ['content'],
    supportedContentScopeKinds: ['project'],
  },
  {
    id: 'recent-files',
    label: 'Recent',
    description: 'Future recent-file working set',
    implemented: false,
    panelId: 'changed-files',
    supportsFilterMenu: false,
    supportedSearchModes: ['content'],
    supportedContentScopeKinds: ['project'],
  },
  {
    id: 'session-relevant-files',
    label: 'Session',
    description: 'Future session-relevant working set',
    implemented: false,
    panelId: 'changed-files',
    supportsFilterMenu: false,
    supportedSearchModes: ['content'],
    supportedContentScopeKinds: ['project'],
  },
];

export const getImplementedExplorerWorkingSets = () =>
  EXPLORER_WORKING_SET_DESCRIPTORS.filter((descriptor) => descriptor.implemented);

const normalizeWorkingSetPresetIds = (value: unknown) => {
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
  const normalizedPresetIds = normalizeWorkingSetPresetIds(presetIds);
  const normalizedRequiredIds = normalizeWorkingSetPresetIds(requiredIds);
  if (!normalizedPresetIds.length) {
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

export const getConfiguredExplorerWorkingSets = (workingSetPresetIds?: unknown) => {
  return resolveExplorerWorkingSetOptions(workingSetPresetIds, []);
};

export const getExplorerWorkingSetDescriptor = (value: unknown): ExplorerWorkingSetDescriptor => {
  const normalizedId = normalizeExplorerWorkingSetId(value);
  return (
    EXPLORER_WORKING_SET_DESCRIPTORS.find((descriptor) => descriptor.id === normalizedId) ||
    EXPLORER_WORKING_SET_DESCRIPTORS[0]
  );
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
