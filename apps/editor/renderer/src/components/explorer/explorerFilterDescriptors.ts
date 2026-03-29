export const EXPLORER_FILTER_VISIBILITY_HIDDEN = 'visibility.hidden';
export const EXPLORER_FILTER_VISIBILITY_IGNORED = 'visibility.ignored';
export const EXPLORER_FILTER_VISIBILITY_CHANGES_ONLY = 'visibility.changesOnly';
export const EXPLORER_FILTER_STATUS = 'status';
export const EXPLORER_FILTER_SEMANTIC = 'semantic';

export type ExplorerFilterDescriptorId =
  | typeof EXPLORER_FILTER_VISIBILITY_HIDDEN
  | typeof EXPLORER_FILTER_VISIBILITY_IGNORED
  | typeof EXPLORER_FILTER_VISIBILITY_CHANGES_ONLY
  | typeof EXPLORER_FILTER_STATUS
  | typeof EXPLORER_FILTER_SEMANTIC;

export type ExplorerFilterDescriptor = {
  id: ExplorerFilterDescriptorId;
  label: string;
  group: 'visibility' | 'status' | 'semantic';
  kind: 'toggle' | 'multi';
  defaultValue: boolean | string[];
};

export type ExplorerFilterDescriptorStateById = Record<string, boolean | string[]>;

export const EXPLORER_FILTER_DESCRIPTORS: ExplorerFilterDescriptor[] = [
  {
    id: EXPLORER_FILTER_VISIBILITY_HIDDEN,
    label: 'Show hidden',
    group: 'visibility',
    kind: 'toggle',
    defaultValue: true,
  },
  {
    id: EXPLORER_FILTER_VISIBILITY_IGNORED,
    label: 'Show ignored',
    group: 'visibility',
    kind: 'toggle',
    defaultValue: false,
  },
  {
    id: EXPLORER_FILTER_VISIBILITY_CHANGES_ONLY,
    label: 'Changes only',
    group: 'visibility',
    kind: 'toggle',
    defaultValue: false,
  },
  {
    id: EXPLORER_FILTER_STATUS,
    label: 'Status Filters',
    group: 'status',
    kind: 'multi',
    defaultValue: [],
  },
  {
    id: EXPLORER_FILTER_SEMANTIC,
    label: 'Semantic Files',
    group: 'semantic',
    kind: 'multi',
    defaultValue: [],
  },
];

const DEFAULT_DESCRIPTOR_STATE = Object.freeze(
  EXPLORER_FILTER_DESCRIPTORS.reduce<ExplorerFilterDescriptorStateById>((acc, descriptor) => {
    acc[descriptor.id] = Array.isArray(descriptor.defaultValue)
      ? [...descriptor.defaultValue]
      : descriptor.defaultValue;
    return acc;
  }, {})
);

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

export const getDefaultExplorerFilterDescriptorState = (): ExplorerFilterDescriptorStateById => ({
  ...DEFAULT_DESCRIPTOR_STATE,
  [EXPLORER_FILTER_STATUS]: [...(DEFAULT_DESCRIPTOR_STATE[EXPLORER_FILTER_STATUS] as string[])],
  [EXPLORER_FILTER_SEMANTIC]: [...(DEFAULT_DESCRIPTOR_STATE[EXPLORER_FILTER_SEMANTIC] as string[])],
});

export const normalizeExplorerFilterDescriptorState = (
  value: unknown
): ExplorerFilterDescriptorStateById => {
  const source =
    value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  const next = getDefaultExplorerFilterDescriptorState();
  EXPLORER_FILTER_DESCRIPTORS.forEach((descriptor) => {
    if (descriptor.kind === 'toggle') {
      if (typeof source[descriptor.id] === 'boolean') {
        next[descriptor.id] = source[descriptor.id] as boolean;
      }
      return;
    }
    next[descriptor.id] = normalizeStringArray(source[descriptor.id]);
  });
  return next;
};

export const buildLegacyExplorerFilterPreferences = (
  descriptorStateById: ExplorerFilterDescriptorStateById
) => ({
  showHidden: Boolean(descriptorStateById[EXPLORER_FILTER_VISIBILITY_HIDDEN]),
  showIgnored: Boolean(descriptorStateById[EXPLORER_FILTER_VISIBILITY_IGNORED]),
  showChangesOnly: Boolean(descriptorStateById[EXPLORER_FILTER_VISIBILITY_CHANGES_ONLY]),
  statusFilters: normalizeStringArray(descriptorStateById[EXPLORER_FILTER_STATUS]),
  semanticFilters: normalizeStringArray(descriptorStateById[EXPLORER_FILTER_SEMANTIC]),
});

export const buildDescriptorStateFromLegacyPreferences = (value: unknown) => {
  const source =
    value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  const next = getDefaultExplorerFilterDescriptorState();
  if (typeof source.showHidden === 'boolean') {
    next[EXPLORER_FILTER_VISIBILITY_HIDDEN] = source.showHidden;
  }
  if (typeof source.showIgnored === 'boolean') {
    next[EXPLORER_FILTER_VISIBILITY_IGNORED] = source.showIgnored;
  }
  if (typeof source.showChangesOnly === 'boolean') {
    next[EXPLORER_FILTER_VISIBILITY_CHANGES_ONLY] = source.showChangesOnly;
  }
  next[EXPLORER_FILTER_STATUS] = normalizeStringArray(source.statusFilters);
  next[EXPLORER_FILTER_SEMANTIC] = normalizeStringArray(source.semanticFilters);
  return next;
};

export const countActiveExplorerFilters = (
  descriptorStateById: ExplorerFilterDescriptorStateById
) => {
  const current = normalizeExplorerFilterDescriptorState(descriptorStateById);
  let total = 0;
  EXPLORER_FILTER_DESCRIPTORS.forEach((descriptor) => {
    const value = current[descriptor.id];
    if (descriptor.kind === 'toggle') {
      if (Boolean(value) !== Boolean(descriptor.defaultValue)) {
        total += 1;
      }
      return;
    }
    total += normalizeStringArray(value).length;
  });
  return total;
};

export const buildExplorerFilterSummary = (
  descriptorStateById: ExplorerFilterDescriptorStateById,
  {
    statusLabels = {},
    semanticRuleLabelById = new Map<string, string>(),
  }: {
    statusLabels?: Record<string, string>;
    semanticRuleLabelById?: Map<string, string>;
  } = {}
) => {
  const state = normalizeExplorerFilterDescriptorState(descriptorStateById);
  const parts: string[] = [];
  if (state[EXPLORER_FILTER_VISIBILITY_CHANGES_ONLY]) {
    parts.push('Changes only');
  }
  if (state[EXPLORER_FILTER_VISIBILITY_IGNORED]) {
    parts.push('Show ignored');
  }
  if (state[EXPLORER_FILTER_VISIBILITY_HIDDEN] !== true) {
    parts.push('Hide hidden');
  }

  const statusFilters = normalizeStringArray(state[EXPLORER_FILTER_STATUS]);
  if (statusFilters.length === 1) {
    parts.push(statusLabels[statusFilters[0]] || statusFilters[0]);
  } else if (statusFilters.length > 1) {
    parts.push(`${statusFilters.length} status filters`);
  }

  const semanticFilters = normalizeStringArray(state[EXPLORER_FILTER_SEMANTIC]);
  if (semanticFilters.length === 1) {
    parts.push(semanticRuleLabelById.get(semanticFilters[0]) || semanticFilters[0]);
  } else if (semanticFilters.length > 1) {
    parts.push(`${semanticFilters.length} semantic filters`);
  }

  if (!parts.length) {
    return '';
  }
  if (parts.length <= 3) {
    return parts.join(' · ');
  }
  return `${parts.slice(0, 3).join(' · ')} +${parts.length - 3}`;
};
