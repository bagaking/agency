export const EXPLORER_SEARCH_MODE_PATH = 'path';
export const EXPLORER_SEARCH_MODE_CONTENT = 'content';

export type ExplorerSearchMode =
  | typeof EXPLORER_SEARCH_MODE_PATH
  | typeof EXPLORER_SEARCH_MODE_CONTENT;

export type ExplorerSearchModeDescriptor = {
  id: ExplorerSearchMode;
  label: string;
  placeholder: string;
};

export const EXPLORER_CONTENT_SCOPE_PROJECT = 'project';
export const EXPLORER_CONTENT_SCOPE_FOLDER = 'folder';
export const EXPLORER_CONTENT_SCOPE_SELECTION = 'selection';

export type ExplorerContentSearchScopeKind =
  | typeof EXPLORER_CONTENT_SCOPE_PROJECT
  | typeof EXPLORER_CONTENT_SCOPE_FOLDER
  | typeof EXPLORER_CONTENT_SCOPE_SELECTION;

export const EXPLORER_SEARCH_MODE_DESCRIPTORS: ExplorerSearchModeDescriptor[] = [
  {
    id: EXPLORER_SEARCH_MODE_PATH,
    label: 'Paths',
    placeholder: 'Search files…',
  },
  {
    id: EXPLORER_SEARCH_MODE_CONTENT,
    label: 'Content',
    placeholder: 'Search file contents…',
  },
] as const;

const normalizeSearchModeIdList = (value: unknown) => {
  if (!Array.isArray(value)) {
    return [];
  }
  const seen = new Set<ExplorerSearchMode>();
  return value
    .map((entry) => normalizeExplorerSearchMode(entry))
    .filter((entry) => {
      if (seen.has(entry)) {
        return false;
      }
      seen.add(entry);
      return true;
    });
};

export const EXPLORER_SEARCH_MODE_OPTIONS = EXPLORER_SEARCH_MODE_DESCRIPTORS.map(
  ({ id, label, placeholder }) => ({ id, label, placeholder })
);

export const EXPLORER_CONTENT_SCOPE_OPTIONS = [
  { id: EXPLORER_CONTENT_SCOPE_PROJECT, label: 'Project' },
  { id: EXPLORER_CONTENT_SCOPE_FOLDER, label: 'Folder' },
  { id: EXPLORER_CONTENT_SCOPE_SELECTION, label: 'Selection' },
] as const;

const normalizeContentScopeKindList = (value: unknown) => {
  if (!Array.isArray(value)) {
    return [];
  }
  const seen = new Set<ExplorerContentSearchScopeKind>();
  return value
    .map((entry) => normalizeExplorerContentScopeKind(entry))
    .filter((entry) => {
      if (seen.has(entry)) {
        return false;
      }
      seen.add(entry);
      return true;
    });
};

export const normalizeExplorerSearchMode = (value: unknown): ExplorerSearchMode =>
  value === EXPLORER_SEARCH_MODE_CONTENT
    ? EXPLORER_SEARCH_MODE_CONTENT
    : EXPLORER_SEARCH_MODE_PATH;

export const getExplorerSearchModeOptions = (supportedModeIds?: unknown) => {
  const supportedModes = normalizeSearchModeIdList(supportedModeIds);
  if (!supportedModes.length) {
    return [...EXPLORER_SEARCH_MODE_OPTIONS];
  }
  const supportedModeSet = new Set(supportedModes);
  return EXPLORER_SEARCH_MODE_OPTIONS.filter((option) => supportedModeSet.has(option.id));
};

export const getExplorerContentScopeOptions = (supportedScopeKinds?: unknown) => {
  const supportedScopes = normalizeContentScopeKindList(supportedScopeKinds);
  if (!supportedScopes.length) {
    return [...EXPLORER_CONTENT_SCOPE_OPTIONS];
  }
  const supportedScopeSet = new Set(supportedScopes);
  return EXPLORER_CONTENT_SCOPE_OPTIONS.filter((option) => supportedScopeSet.has(option.id));
};

export const getExplorerSearchModeDescriptor = (value: unknown): ExplorerSearchModeDescriptor => {
  const normalized = normalizeExplorerSearchMode(value);
  return (
    EXPLORER_SEARCH_MODE_DESCRIPTORS.find((descriptor) => descriptor.id === normalized) ||
    EXPLORER_SEARCH_MODE_DESCRIPTORS[0]
  );
};

export const normalizeExplorerSearchModeForSupportedModes = (
  value: unknown,
  supportedModeIds?: unknown
): ExplorerSearchMode => {
  const normalized = normalizeExplorerSearchMode(value);
  const supportedModes = normalizeSearchModeIdList(supportedModeIds);
  if (!supportedModes.length) {
    return normalized;
  }
  if (supportedModes.includes(normalized)) {
    return normalized;
  }
  return supportedModes[0];
};

export const normalizeExplorerContentScopeKindForSupportedScopes = (
  value: unknown,
  supportedScopeKinds?: unknown
): ExplorerContentSearchScopeKind => {
  const normalized = normalizeExplorerContentScopeKind(value);
  const supportedScopes = normalizeContentScopeKindList(supportedScopeKinds);
  if (!supportedScopes.length) {
    return normalized;
  }
  if (supportedScopes.includes(normalized)) {
    return normalized;
  }
  return supportedScopes[0];
};

export const normalizeExplorerContentScopeKind = (
  value: unknown
): ExplorerContentSearchScopeKind => {
  if (value === EXPLORER_CONTENT_SCOPE_FOLDER) {
    return EXPLORER_CONTENT_SCOPE_FOLDER;
  }
  if (value === EXPLORER_CONTENT_SCOPE_SELECTION) {
    return EXPLORER_CONTENT_SCOPE_SELECTION;
  }
  return EXPLORER_CONTENT_SCOPE_PROJECT;
};
