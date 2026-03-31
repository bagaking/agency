export const EXPLORER_SEARCH_MODE_PATH = 'path';
export const EXPLORER_SEARCH_MODE_CONTENT = 'content';
export const EXPLORER_SEARCH_MODE_URL = 'url';

export type ExplorerSearchMode =
  | typeof EXPLORER_SEARCH_MODE_PATH
  | typeof EXPLORER_SEARCH_MODE_CONTENT
  | typeof EXPLORER_SEARCH_MODE_URL;

export type ExplorerSearchModeDescriptor = {
  id: ExplorerSearchMode;
  label: string;
  placeholder: string;
  inputType: 'text' | 'url';
  submitLabel?: string;
  submitBusyLabel?: string;
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
    inputType: 'text',
  },
  {
    id: EXPLORER_SEARCH_MODE_CONTENT,
    label: 'Content',
    placeholder: 'Search file contents…',
    inputType: 'text',
  },
  {
    id: EXPLORER_SEARCH_MODE_URL,
    label: 'URL',
    placeholder: 'Paste a documentation or research URL…',
    inputType: 'url',
    submitLabel: 'Open Web',
    submitBusyLabel: 'Opening…',
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
  value === EXPLORER_SEARCH_MODE_URL
    ? EXPLORER_SEARCH_MODE_URL
    : value === EXPLORER_SEARCH_MODE_CONTENT
      ? EXPLORER_SEARCH_MODE_CONTENT
      : EXPLORER_SEARCH_MODE_PATH;

export const getExplorerSearchModeOptions = (
  supportedModeIds?: unknown,
  disabledModeIds?: unknown
) => {
  const supportedModes = normalizeSearchModeIdList(supportedModeIds);
  const disabledModeSet = new Set(normalizeSearchModeIdList(disabledModeIds));
  const baseOptions = !supportedModes.length
    ? [...EXPLORER_SEARCH_MODE_OPTIONS]
    : EXPLORER_SEARCH_MODE_OPTIONS.filter((option) => supportedModes.includes(option.id));
  return baseOptions.filter((option) => !disabledModeSet.has(option.id));
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
  supportedModeIds?: unknown,
  disabledModeIds?: unknown
): ExplorerSearchMode => {
  const normalized = normalizeExplorerSearchMode(value);
  const availableOptions = getExplorerSearchModeOptions(supportedModeIds, disabledModeIds);
  if (!availableOptions.length) {
    return EXPLORER_SEARCH_MODE_PATH;
  }
  if (availableOptions.some((option) => option.id === normalized)) {
    return normalized;
  }
  return availableOptions[0].id;
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

const IPV4_PATTERN = /^(\d{1,3}\.){3}\d{1,3}$/;

const isIpv4Literal = (value: string) => IPV4_PATTERN.test(value);

const isPrivateIpv4 = (value: string) => {
  const parts = value.split('.').map((segment) => Number(segment));
  if (parts.length !== 4 || parts.some((segment) => Number.isNaN(segment) || segment < 0 || segment > 255)) {
    return true;
  }
  if (parts[0] === 10) return true;
  if (parts[0] === 127) return true;
  if (parts[0] === 169 && parts[1] === 254) return true;
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  if (parts[0] === 192 && parts[1] === 168) return true;
  if (parts[0] === 0) return true;
  return false;
};

export const normalizeExplorerSupportedPublicUrl = (value: unknown) => {
  const rawInput = String(value || '').trim();
  if (!rawInput) {
    return '';
  }

  const candidate = /^[a-z][a-z0-9+.-]*:\/\//i.test(rawInput)
    ? rawInput
    : `https://${rawInput}`;

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch (_error) {
    return '';
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return '';
  }

  const hostname = String(parsed.hostname || '').trim().toLowerCase();
  if (!hostname) {
    return '';
  }
  if (hostname === 'localhost' || hostname.endsWith('.localhost') || hostname.endsWith('.local')) {
    return '';
  }
  if (hostname.includes(':')) {
    return '';
  }
  if (isIpv4Literal(hostname) && isPrivateIpv4(hostname)) {
    return '';
  }
  if (!hostname.includes('.') && !isIpv4Literal(hostname)) {
    return '';
  }

  return parsed.toString();
};

export const isExplorerSupportedPublicUrl = (value: unknown) =>
  Boolean(normalizeExplorerSupportedPublicUrl(value));
