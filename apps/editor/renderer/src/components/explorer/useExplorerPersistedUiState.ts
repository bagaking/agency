import { useEffect, useRef, type RefObject } from 'react';

type PersistedExplorerUiState = {
  expandedPaths: string[];
  selectedPaths: string[];
  focusedPath: string;
  scrollTop: number;
};

type UseExplorerPersistedUiStateOptions = {
  stateKey: string;
  listRef: RefObject<HTMLElement | null>;
  expandedPaths: ReadonlySet<string>;
  selectedPaths: string[];
  focusedPath: string;
  scrollTop: number;
  expandPath: (path: string) => Promise<void>;
  setSelectedPaths: (paths: string[]) => void;
  setFocusedPath: (path: string) => void;
};

const safeReadPersistedExplorerState = (stateKey: string): PersistedExplorerUiState | null => {
  if (!stateKey) {
    return null;
  }

  try {
    const raw = window.sessionStorage?.getItem(stateKey);
    if (!raw) {
      return null;
    }
    const payload = JSON.parse(raw);
    const expandedPaths = Array.isArray(payload?.expandedPaths) ? payload.expandedPaths : [];
    const selectedPaths = Array.isArray(payload?.selectedPaths) ? payload.selectedPaths : [];
    const focusedPath = typeof payload?.focusedPath === 'string' ? payload.focusedPath : '';
    const scrollTop = typeof payload?.scrollTop === 'number' ? payload.scrollTop : 0;
    return {
      expandedPaths: expandedPaths.filter(Boolean),
      selectedPaths: selectedPaths.filter(Boolean),
      focusedPath,
      scrollTop,
    };
  } catch {
    return null;
  }
};

const safePersistExplorerState = (stateKey: string, payload: PersistedExplorerUiState) => {
  if (!stateKey) {
    return;
  }
  try {
    window.sessionStorage?.setItem(stateKey, JSON.stringify(payload));
  } catch {
    // Ignore persistence errors (quota/disabled storage).
  }
};

export const useExplorerPersistedUiState = ({
  stateKey,
  listRef,
  expandedPaths,
  selectedPaths,
  focusedPath,
  scrollTop,
  expandPath,
  setSelectedPaths,
  setFocusedPath,
}: UseExplorerPersistedUiStateOptions) => {
  const hasRestoredStateRef = useRef(false);

  useEffect(() => {
    hasRestoredStateRef.current = false;
  }, [stateKey]);

  useEffect(() => {
    if (!stateKey || hasRestoredStateRef.current) {
      return;
    }
    hasRestoredStateRef.current = true;

    const restored = safeReadPersistedExplorerState(stateKey);
    if (!restored) {
      return;
    }

    const { expandedPaths: storedExpanded, selectedPaths: storedSelected } = restored;
    const storedFocused = restored.focusedPath;
    const storedScrollTop = Number.isFinite(restored.scrollTop) ? restored.scrollTop : null;

    (async () => {
      const uniqueExpanded = new Set(storedExpanded.filter(Boolean));
      uniqueExpanded.add('');
      for (const entry of uniqueExpanded) {
        await expandPath(entry);
      }
      if (storedSelected.length) {
        setSelectedPaths(storedSelected);
        setFocusedPath(storedFocused || storedSelected[0]);
      } else if (storedFocused) {
        setFocusedPath(storedFocused);
      }
      if (storedScrollTop != null) {
        requestAnimationFrame(() => {
          const element = listRef.current;
          if (element) {
            element.scrollTop = storedScrollTop;
          }
        });
      }
    })();
  }, [expandPath, listRef, setFocusedPath, setSelectedPaths, stateKey]);

  useEffect(() => {
    if (!stateKey) {
      return;
    }

    safePersistExplorerState(stateKey, {
      expandedPaths: Array.from(expandedPaths || []),
      selectedPaths,
      focusedPath,
      scrollTop,
    });
  }, [expandedPaths, focusedPath, scrollTop, selectedPaths, stateKey]);
};

