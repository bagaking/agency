import { useEffect, useRef } from 'react';

import { getUiState, setUiState } from '../../services/agencyBridge';

export type ExplorerFilterPreferences = {
  showHidden: boolean;
  showIgnored: boolean;
  showChangesOnly: boolean;
  statusFilters: string[];
  semanticFilters: string[];
};

export const DEFAULT_EXPLORER_FILTER_PREFERENCES: ExplorerFilterPreferences = Object.freeze({
  showHidden: true,
  showIgnored: false,
  showChangesOnly: false,
  statusFilters: [],
  semanticFilters: [],
});

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

const normalizeExplorerFilterPreferences = (value: unknown): ExplorerFilterPreferences => {
  const source = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  return {
    showHidden:
      typeof source.showHidden === 'boolean'
        ? source.showHidden
        : DEFAULT_EXPLORER_FILTER_PREFERENCES.showHidden,
    showIgnored:
      typeof source.showIgnored === 'boolean'
        ? source.showIgnored
        : DEFAULT_EXPLORER_FILTER_PREFERENCES.showIgnored,
    showChangesOnly:
      typeof source.showChangesOnly === 'boolean'
        ? source.showChangesOnly
        : DEFAULT_EXPLORER_FILTER_PREFERENCES.showChangesOnly,
    statusFilters: normalizeStringArray(source.statusFilters),
    semanticFilters: normalizeStringArray(source.semanticFilters),
  };
};

type UseExplorerFilterPreferencesOptions = {
  stateKey: string;
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
};

export function useExplorerFilterPreferences({
  stateKey,
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
}: UseExplorerFilterPreferencesOptions) {
  const restoredRef = useRef(false);
  const persistedPrefsByKeyRef = useRef<Record<string, ExplorerFilterPreferences>>({});

  useEffect(() => {
    restoredRef.current = false;
    setShowHidden(DEFAULT_EXPLORER_FILTER_PREFERENCES.showHidden);
    setShowIgnored(DEFAULT_EXPLORER_FILTER_PREFERENCES.showIgnored);
    setShowChangesOnly(DEFAULT_EXPLORER_FILTER_PREFERENCES.showChangesOnly);
    setStatusFilters(DEFAULT_EXPLORER_FILTER_PREFERENCES.statusFilters);
    setSemanticFilters(DEFAULT_EXPLORER_FILTER_PREFERENCES.semanticFilters);

    if (!stateKey) {
      persistedPrefsByKeyRef.current = {};
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
        const rawByKey =
          uiState?.explorerFilterStateByRootKey &&
          typeof uiState.explorerFilterStateByRootKey === 'object'
            ? (uiState.explorerFilterStateByRootKey as Record<string, unknown>)
            : {};

        const normalizedByKey = Object.fromEntries(
          Object.entries(rawByKey).map(([entryStateKey, value]) => [
            entryStateKey,
            normalizeExplorerFilterPreferences(value),
          ])
        ) as Record<string, ExplorerFilterPreferences>;

        persistedPrefsByKeyRef.current = normalizedByKey;

        const restoredPreferences = normalizeExplorerFilterPreferences(normalizedByKey[stateKey]);
        setShowHidden(restoredPreferences.showHidden);
        setShowIgnored(restoredPreferences.showIgnored);
        setShowChangesOnly(restoredPreferences.showChangesOnly);
        setStatusFilters(restoredPreferences.statusFilters);
        setSemanticFilters(restoredPreferences.semanticFilters);
      } finally {
        restoredRef.current = true;
      }
    };

    void restore();

    return () => {
      cancelled = true;
    };
  }, [
    setSemanticFilters,
    setShowChangesOnly,
    setShowHidden,
    setShowIgnored,
    setStatusFilters,
    stateKey,
  ]);

  useEffect(() => {
    if (!stateKey || !restoredRef.current) {
      return;
    }

    const handle = window.setTimeout(() => {
      const nextPreferences = normalizeExplorerFilterPreferences({
        showHidden,
        showIgnored,
        showChangesOnly,
        statusFilters,
        semanticFilters,
      });
      const nextByKey = {
        ...persistedPrefsByKeyRef.current,
        [stateKey]: nextPreferences,
      };
      persistedPrefsByKeyRef.current = nextByKey;
      void setUiState({
        explorerFilterStateByRootKey: nextByKey,
      }).catch(() => undefined);
    }, 180);

    return () => window.clearTimeout(handle);
  }, [
    semanticFilters,
    showChangesOnly,
    showHidden,
    showIgnored,
    stateKey,
    statusFilters,
  ]);
}
