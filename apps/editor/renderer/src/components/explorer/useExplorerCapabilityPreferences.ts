import { useEffect, useMemo, useRef } from 'react';

import { getUiState, setUiState } from '../../services/agencyBridge';
import {
  buildDescriptorStateFromLegacyPreferences,
  buildLegacyExplorerFilterPreferences,
  getDefaultExplorerFilterDescriptorState,
  normalizeExplorerFilterDescriptorState,
} from './explorerFilterDescriptors';
import {
  EXPLORER_SEARCH_MODE_PATH,
  normalizeExplorerContentScopeKind,
  normalizeExplorerSearchMode,
} from './explorerSearchModel';
import { EXPLORER_WORKING_SET_TREE, normalizeExplorerWorkingSetId } from './explorerWorkingSets';

type PersistedExplorerCapabilityState = {
  filters: {
    descriptorStateById: Record<string, boolean | string[]>;
  };
  workingSetViewId: string;
  searchMode: string;
  contentSearch: {
    scopeKind: string;
    caseSensitive: boolean;
    wholeWord: boolean;
    useRegex: boolean;
  };
};

type UseExplorerCapabilityPreferencesOptions = {
  stateKey: string;
  projectPolicy?: Record<string, any> | null;
  showHidden: boolean;
  setShowHidden: (value: boolean) => void;
  showIgnored: boolean;
  setShowIgnored: (value: boolean) => void;
  showChangesOnly: boolean;
  setShowChangesOnly: (value: boolean) => void;
  statusFilters: string[];
  setStatusFilters: (value: string[]) => void;
  semanticFilters: string[];
  setSemanticFilters: (value: string[]) => void;
  workingSetViewId: string;
  setWorkingSetViewId: (value: string) => void;
  searchMode: string;
  setSearchMode: (value: string) => void;
  contentScopeKind: string;
  setContentScopeKind: (value: string) => void;
  contentCaseSensitive: boolean;
  setContentCaseSensitive: (value: boolean) => void;
  contentWholeWord: boolean;
  setContentWholeWord: (value: boolean) => void;
  contentUseRegex: boolean;
  setContentUseRegex: (value: boolean) => void;
};

const normalizePersistedCapabilityState = (
  value: unknown,
  defaults: PersistedExplorerCapabilityState,
  legacyFilterPreferences?: unknown
): PersistedExplorerCapabilityState => {
  const source =
    value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, any>)
      : {};
  const filterSource =
    source.filters && typeof source.filters === 'object' ? source.filters : {};
  const descriptorStateById = normalizeExplorerFilterDescriptorState(
    filterSource.descriptorStateById ||
      buildDescriptorStateFromLegacyPreferences(legacyFilterPreferences)
  );

  return {
    filters: {
      descriptorStateById: {
        ...defaults.filters.descriptorStateById,
        ...descriptorStateById,
      },
    },
    workingSetViewId: normalizeExplorerWorkingSetId(
      source.workingSetViewId ?? defaults.workingSetViewId
    ),
    searchMode: normalizeExplorerSearchMode(source.searchMode ?? defaults.searchMode),
    contentSearch: {
      scopeKind: normalizeExplorerContentScopeKind(
        source.contentSearch?.scopeKind ?? defaults.contentSearch.scopeKind
      ),
      caseSensitive:
        typeof source.contentSearch?.caseSensitive === 'boolean'
          ? source.contentSearch.caseSensitive
          : defaults.contentSearch.caseSensitive,
      wholeWord:
        typeof source.contentSearch?.wholeWord === 'boolean'
          ? source.contentSearch.wholeWord
          : defaults.contentSearch.wholeWord,
      useRegex:
        typeof source.contentSearch?.useRegex === 'boolean'
          ? source.contentSearch.useRegex
          : defaults.contentSearch.useRegex,
    },
  };
};

const buildDefaultsFromPolicy = (projectPolicy?: Record<string, any> | null) => {
  const defaultFilters = {
    ...getDefaultExplorerFilterDescriptorState(),
    ...normalizeExplorerFilterDescriptorState(projectPolicy?.filters),
  };
  return {
    filters: {
      descriptorStateById: defaultFilters,
    },
    workingSetViewId: normalizeExplorerWorkingSetId(projectPolicy?.workingSet?.defaultView),
    searchMode: normalizeExplorerSearchMode(projectPolicy?.search?.defaultMode),
    contentSearch: {
      scopeKind: normalizeExplorerContentScopeKind(projectPolicy?.search?.content?.defaultScope),
      caseSensitive: Boolean(projectPolicy?.search?.content?.caseSensitive),
      wholeWord: Boolean(projectPolicy?.search?.content?.wholeWord),
      useRegex: Boolean(projectPolicy?.search?.content?.useRegex),
    },
  };
};

const buildLiveCapabilityState = ({
  showHidden,
  showIgnored,
  showChangesOnly,
  statusFilters,
  semanticFilters,
  workingSetViewId,
  searchMode,
  contentScopeKind,
  contentCaseSensitive,
  contentWholeWord,
  contentUseRegex,
}: {
  showHidden: boolean;
  showIgnored: boolean;
  showChangesOnly: boolean;
  statusFilters: string[];
  semanticFilters: string[];
  workingSetViewId: string;
  searchMode: string;
  contentScopeKind: string;
  contentCaseSensitive: boolean;
  contentWholeWord: boolean;
  contentUseRegex: boolean;
}): PersistedExplorerCapabilityState => ({
  filters: {
    descriptorStateById: normalizeExplorerFilterDescriptorState(
      buildDescriptorStateFromLegacyPreferences({
        showHidden,
        showIgnored,
        showChangesOnly,
        statusFilters,
        semanticFilters,
      })
    ),
  },
  workingSetViewId: normalizeExplorerWorkingSetId(workingSetViewId),
  searchMode: normalizeExplorerSearchMode(searchMode),
  contentSearch: {
    scopeKind: normalizeExplorerContentScopeKind(contentScopeKind),
    caseSensitive: Boolean(contentCaseSensitive),
    wholeWord: Boolean(contentWholeWord),
    useRegex: Boolean(contentUseRegex),
  },
});

const areCapabilityStatesEqual = (
  left?: PersistedExplorerCapabilityState | null,
  right?: PersistedExplorerCapabilityState | null
) => JSON.stringify(left || null) === JSON.stringify(right || null);

export function useExplorerCapabilityPreferences({
  stateKey,
  projectPolicy,
  showHidden,
  setShowHidden,
  showIgnored,
  setShowIgnored,
  showChangesOnly,
  setShowChangesOnly,
  statusFilters,
  setStatusFilters,
  semanticFilters,
  setSemanticFilters,
  workingSetViewId,
  setWorkingSetViewId,
  searchMode,
  setSearchMode,
  contentScopeKind,
  setContentScopeKind,
  contentCaseSensitive,
  setContentCaseSensitive,
  contentWholeWord,
  setContentWholeWord,
  contentUseRegex,
  setContentUseRegex,
}: UseExplorerCapabilityPreferencesOptions) {
  const restoredRef = useRef(false);
  const persistedCapabilityByKeyRef = useRef<Record<string, PersistedExplorerCapabilityState>>({});
  const persistedLegacyFilterByKeyRef = useRef<Record<string, any>>({});
  const lastAppliedStateRef = useRef<PersistedExplorerCapabilityState | null>(null);
  const currentCapabilityStateRef = useRef<PersistedExplorerCapabilityState | null>(null);
  const previousStateKeyRef = useRef('');
  const defaults = useMemo(() => buildDefaultsFromPolicy(projectPolicy), [projectPolicy]);

  useEffect(() => {
    currentCapabilityStateRef.current = buildLiveCapabilityState({
      showHidden,
      showIgnored,
      showChangesOnly,
      statusFilters,
      semanticFilters,
      workingSetViewId,
      searchMode,
      contentScopeKind,
      contentCaseSensitive,
      contentWholeWord,
      contentUseRegex,
    });
  }, [
    contentCaseSensitive,
    contentScopeKind,
    contentUseRegex,
    contentWholeWord,
    searchMode,
    semanticFilters,
    showChangesOnly,
    showHidden,
    showIgnored,
    statusFilters,
    workingSetViewId,
  ]);

  useEffect(() => {
    restoredRef.current = false;
    const isStateKeyChange = previousStateKeyRef.current !== stateKey;
    previousStateKeyRef.current = stateKey;

    const applyState = (nextState: PersistedExplorerCapabilityState) => {
      const legacyFilters = buildLegacyExplorerFilterPreferences(
        nextState.filters.descriptorStateById
      );
      setShowHidden(Boolean(legacyFilters.showHidden));
      setShowIgnored(Boolean(legacyFilters.showIgnored));
      setShowChangesOnly(Boolean(legacyFilters.showChangesOnly));
      setStatusFilters(legacyFilters.statusFilters);
      setSemanticFilters(legacyFilters.semanticFilters);
      setWorkingSetViewId(nextState.workingSetViewId || EXPLORER_WORKING_SET_TREE);
      setSearchMode(nextState.searchMode || EXPLORER_SEARCH_MODE_PATH);
      setContentScopeKind(nextState.contentSearch.scopeKind);
      setContentCaseSensitive(Boolean(nextState.contentSearch.caseSensitive));
      setContentWholeWord(Boolean(nextState.contentSearch.wholeWord));
      setContentUseRegex(Boolean(nextState.contentSearch.useRegex));
      lastAppliedStateRef.current = nextState;
    };

    const knownPersistedCapability = Boolean(
      stateKey &&
        Object.prototype.hasOwnProperty.call(persistedCapabilityByKeyRef.current, stateKey)
    );
    const knownPersistedLegacy = Boolean(
      stateKey &&
        Object.prototype.hasOwnProperty.call(persistedLegacyFilterByKeyRef.current, stateKey)
    );
    const canReapplyDefaults =
      isStateKeyChange ||
      (!knownPersistedCapability &&
        !knownPersistedLegacy &&
        areCapabilityStatesEqual(currentCapabilityStateRef.current, lastAppliedStateRef.current));

    if (canReapplyDefaults) {
      applyState(defaults);
    }

    if (!stateKey) {
      restoredRef.current = true;
      return;
    }

    let cancelled = false;

    const restore = async () => {
      try {
        const uiState = await getUiState();
        if (cancelled) {
          return;
        }

        const rawCapabilityByKey =
          uiState?.explorerCapabilityStateByRootKey &&
          typeof uiState.explorerCapabilityStateByRootKey === 'object'
            ? (uiState.explorerCapabilityStateByRootKey as Record<string, unknown>)
            : {};
        const rawLegacyFilterByKey =
          uiState?.explorerFilterStateByRootKey &&
          typeof uiState.explorerFilterStateByRootKey === 'object'
            ? (uiState.explorerFilterStateByRootKey as Record<string, unknown>)
            : {};

        const normalizedCapabilityByKey = Object.fromEntries(
          Object.entries(rawCapabilityByKey).map(([entryStateKey, value]) => [
            entryStateKey,
            normalizePersistedCapabilityState(
              value,
              defaults,
              rawLegacyFilterByKey[entryStateKey]
            ),
          ])
        ) as Record<string, PersistedExplorerCapabilityState>;

        persistedCapabilityByKeyRef.current = normalizedCapabilityByKey;
        persistedLegacyFilterByKeyRef.current = rawLegacyFilterByKey as Record<string, any>;

        const hasPersistedCapability = Object.prototype.hasOwnProperty.call(
          rawCapabilityByKey,
          stateKey
        );
        const hasPersistedLegacyFilters = Object.prototype.hasOwnProperty.call(
          rawLegacyFilterByKey,
          stateKey
        );

        if (hasPersistedCapability || hasPersistedLegacyFilters) {
          const restored = normalizePersistedCapabilityState(
            rawCapabilityByKey[stateKey],
            defaults,
            rawLegacyFilterByKey[stateKey]
          );
          applyState(restored);
        }
      } finally {
        restoredRef.current = true;
      }
    };

    void restore();

    return () => {
      cancelled = true;
    };
  }, [
    defaults,
    setContentCaseSensitive,
    setContentScopeKind,
    setContentUseRegex,
    setContentWholeWord,
    setSearchMode,
    setSemanticFilters,
    setShowChangesOnly,
    setShowHidden,
    setShowIgnored,
    setStatusFilters,
    setWorkingSetViewId,
    stateKey,
  ]);

  useEffect(() => {
    if (!stateKey || !restoredRef.current) {
      return;
    }

    const handle = window.setTimeout(() => {
      const descriptorStateById = normalizeExplorerFilterDescriptorState(
        buildDescriptorStateFromLegacyPreferences({
          showHidden,
          showIgnored,
          showChangesOnly,
          statusFilters,
          semanticFilters,
        })
      );
      const nextCapabilityState = normalizePersistedCapabilityState(
        {
          ...currentCapabilityStateRef.current,
          filters: { descriptorStateById },
        },
        defaults
      );
      const nextLegacyFilters = buildLegacyExplorerFilterPreferences(descriptorStateById);
      const nextCapabilityByKey = {
        ...persistedCapabilityByKeyRef.current,
        [stateKey]: nextCapabilityState,
      };
      const nextLegacyFilterByKey = {
        ...persistedLegacyFilterByKeyRef.current,
        [stateKey]: nextLegacyFilters,
      };
      persistedCapabilityByKeyRef.current = nextCapabilityByKey;
      persistedLegacyFilterByKeyRef.current = nextLegacyFilterByKey;
      void setUiState({
        explorerCapabilityStateByRootKey: nextCapabilityByKey,
        explorerFilterStateByRootKey: nextLegacyFilterByKey,
      }).catch(() => undefined);
    }, 180);

    return () => window.clearTimeout(handle);
  }, [
    contentCaseSensitive,
    contentScopeKind,
    contentUseRegex,
    contentWholeWord,
    defaults,
    searchMode,
    semanticFilters,
    showChangesOnly,
    showHidden,
    showIgnored,
    stateKey,
    statusFilters,
    workingSetViewId,
  ]);
}
