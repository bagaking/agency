export const EXPLORER_SEARCH_MODE_PATH = 'path';
export const EXPLORER_SEARCH_MODE_CONTENT = 'content';

export type ExplorerSearchMode =
  | typeof EXPLORER_SEARCH_MODE_PATH
  | typeof EXPLORER_SEARCH_MODE_CONTENT;

export const EXPLORER_CONTENT_SCOPE_PROJECT = 'project';
export const EXPLORER_CONTENT_SCOPE_FOLDER = 'folder';
export const EXPLORER_CONTENT_SCOPE_SELECTION = 'selection';

export type ExplorerContentSearchScopeKind =
  | typeof EXPLORER_CONTENT_SCOPE_PROJECT
  | typeof EXPLORER_CONTENT_SCOPE_FOLDER
  | typeof EXPLORER_CONTENT_SCOPE_SELECTION;

export const EXPLORER_SEARCH_MODE_OPTIONS = [
  { id: EXPLORER_SEARCH_MODE_PATH, label: 'Paths' },
  { id: EXPLORER_SEARCH_MODE_CONTENT, label: 'Content' },
] as const;

export const EXPLORER_CONTENT_SCOPE_OPTIONS = [
  { id: EXPLORER_CONTENT_SCOPE_PROJECT, label: 'Project' },
  { id: EXPLORER_CONTENT_SCOPE_FOLDER, label: 'Folder' },
  { id: EXPLORER_CONTENT_SCOPE_SELECTION, label: 'Selection' },
] as const;

export const normalizeExplorerSearchMode = (value: unknown): ExplorerSearchMode =>
  value === EXPLORER_SEARCH_MODE_CONTENT
    ? EXPLORER_SEARCH_MODE_CONTENT
    : EXPLORER_SEARCH_MODE_PATH;

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
