import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { getUiState, setUiState } from '../../services/agencyBridge';
import { normalizeWorkbenchLanguageId } from '../../../../shared/workbenchLanguageCore';

export type WorkbenchLanguageOverrideStateByRootKey = Record<string, Record<string, string>>;

export type UseWorkbenchLanguageOverridesOptions = {
  stateKey: string;
  currentFilePath?: string | null;
  persistDebounceMs?: number;
};

export type WorkbenchLanguageOverridesApi = {
  restored: boolean;
  overridesByFilePath: Record<string, string>;
  currentFileOverride: string | null;
  getOverrideForFile: (filePath?: string | null) => string | null;
  getCurrentFileOverride: () => string | null;
  setOverrideForFile: (filePath: string, languageId: string) => void;
  resetOverrideForFile: (filePath: string) => void;
  setCurrentFileOverride: (languageId: string) => void;
  resetCurrentFileOverride: () => void;
};

const DEFAULT_PERSIST_DEBOUNCE_MS = 120;

const normalizeStateKey = (value: unknown) => String(value || '').trim();

const normalizeFilePath = (value: unknown) =>
  String(value || '')
    .trim()
    .replace(/\\/g, '/')
    .replace(/^\.\/+/, '')
    .replace(/\/+/g, '/')
    .replace(/\/$/, '');

const normalizeLanguageId = (value: unknown) => normalizeWorkbenchLanguageId(value, '');

const normalizeOverridesForRoot = (value: unknown): Record<string, string> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  const normalized: Record<string, string> = {};
  Object.entries(value as Record<string, unknown>).forEach(([rawPath, rawLanguage]) => {
    const filePath = normalizeFilePath(rawPath);
    const languageId = normalizeLanguageId(rawLanguage);
    if (!filePath || !languageId) {
      return;
    }
    normalized[filePath] = languageId;
  });
  return normalized;
};

const normalizeOverridesByRootKey = (value: unknown): WorkbenchLanguageOverrideStateByRootKey => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  const normalized: WorkbenchLanguageOverrideStateByRootKey = {};
  Object.entries(value as Record<string, unknown>).forEach(([rawStateKey, rawOverrides]) => {
    const stateKey = normalizeStateKey(rawStateKey);
    if (!stateKey) {
      return;
    }
    const fileOverrides = normalizeOverridesForRoot(rawOverrides);
    if (Object.keys(fileOverrides).length === 0) {
      return;
    }
    normalized[stateKey] = fileOverrides;
  });
  return normalized;
};

const areOverrideMapsEqual = (left: Record<string, string>, right: Record<string, string>) =>
  JSON.stringify(left) === JSON.stringify(right);

export function useWorkbenchLanguageOverrides({
  stateKey,
  currentFilePath,
  persistDebounceMs = DEFAULT_PERSIST_DEBOUNCE_MS,
}: UseWorkbenchLanguageOverridesOptions): WorkbenchLanguageOverridesApi {
  const normalizedStateKey = normalizeStateKey(stateKey);
  const normalizedCurrentFilePath = normalizeFilePath(currentFilePath);
  const [restored, setRestored] = useState(false);
  const [overridesByFilePath, setOverridesByFilePath] = useState<Record<string, string>>({});

  const restoredByRootKeyRef = useRef<WorkbenchLanguageOverrideStateByRootKey>({});
  const lastPersistedSnapshotRef = useRef('');
  const persistWriteIdRef = useRef(0);

  useEffect(() => {
    setRestored(false);
    setOverridesByFilePath({});

    if (!normalizedStateKey) {
      restoredByRootKeyRef.current = {};
      lastPersistedSnapshotRef.current = JSON.stringify({});
      setRestored(true);
      return;
    }

    let cancelled = false;

    const restore = async () => {
      try {
        const uiState = await getUiState();
        if (cancelled) {
          return;
        }
        const normalizedByRootKey = normalizeOverridesByRootKey(
          uiState?.workbenchLanguageOverrideStateByRootKey
        );
        restoredByRootKeyRef.current = normalizedByRootKey;
        lastPersistedSnapshotRef.current = JSON.stringify(normalizedByRootKey);
        setOverridesByFilePath(normalizedByRootKey[normalizedStateKey] || {});
      } finally {
        if (!cancelled) {
          setRestored(true);
        }
      }
    };

    void restore();

    return () => {
      cancelled = true;
    };
  }, [normalizedStateKey]);

  useEffect(() => {
    if (!restored || !normalizedStateKey) {
      return;
    }

    const delay = Number.isFinite(persistDebounceMs) ? Math.max(0, persistDebounceMs) : 0;
    const handle = window.setTimeout(() => {
      const nextCurrentRootOverrides = normalizeOverridesForRoot(overridesByFilePath);
      const previousCurrentRootOverrides =
        restoredByRootKeyRef.current[normalizedStateKey] || {};
      if (areOverrideMapsEqual(nextCurrentRootOverrides, previousCurrentRootOverrides)) {
        return;
      }

      const nextByRootKey = {
        ...restoredByRootKeyRef.current,
      };
      if (Object.keys(nextCurrentRootOverrides).length > 0) {
        nextByRootKey[normalizedStateKey] = nextCurrentRootOverrides;
      } else {
        delete nextByRootKey[normalizedStateKey];
      }

      const serialized = JSON.stringify(nextByRootKey);
      if (serialized === lastPersistedSnapshotRef.current) {
        return;
      }

      const writeId = persistWriteIdRef.current + 1;
      persistWriteIdRef.current = writeId;
      void setUiState({
        workbenchLanguageOverrideStateByRootKey: nextByRootKey,
      })
        .then(() => {
          if (persistWriteIdRef.current !== writeId) {
            return;
          }
          restoredByRootKeyRef.current = nextByRootKey;
          lastPersistedSnapshotRef.current = serialized;
        })
        .catch(() => {
          if (persistWriteIdRef.current !== writeId) {
            return;
          }
          setOverridesByFilePath(previousCurrentRootOverrides);
        });
    }, delay);

    return () => {
      window.clearTimeout(handle);
    };
  }, [normalizedStateKey, overridesByFilePath, persistDebounceMs, restored]);

  const getOverrideForFile = useCallback(
    (filePath?: string | null) => {
      const normalizedFilePath = normalizeFilePath(filePath);
      if (!normalizedFilePath) {
        return null;
      }
      const override = normalizeLanguageId(overridesByFilePath[normalizedFilePath]);
      return override || null;
    },
    [overridesByFilePath]
  );

  const getCurrentFileOverride = useCallback(
    () => getOverrideForFile(normalizedCurrentFilePath),
    [getOverrideForFile, normalizedCurrentFilePath]
  );

  const setOverrideForFile = useCallback((filePath: string, languageId: string) => {
    const normalizedFilePath = normalizeFilePath(filePath);
    if (!normalizedFilePath) {
      return;
    }
    const normalizedLanguageId = normalizeLanguageId(languageId);

    setOverridesByFilePath((current) => {
      const currentOverride = normalizeLanguageId(current[normalizedFilePath]);
      if (!normalizedLanguageId) {
        if (!Object.prototype.hasOwnProperty.call(current, normalizedFilePath)) {
          return current;
        }
        const next = { ...current };
        delete next[normalizedFilePath];
        return next;
      }
      if (currentOverride === normalizedLanguageId) {
        return current;
      }
      return {
        ...current,
        [normalizedFilePath]: normalizedLanguageId,
      };
    });
  }, []);

  const resetOverrideForFile = useCallback((filePath: string) => {
    const normalizedFilePath = normalizeFilePath(filePath);
    if (!normalizedFilePath) {
      return;
    }
    setOverridesByFilePath((current) => {
      if (!Object.prototype.hasOwnProperty.call(current, normalizedFilePath)) {
        return current;
      }
      const next = { ...current };
      delete next[normalizedFilePath];
      return next;
    });
  }, []);

  const setCurrentFileOverride = useCallback(
    (languageId: string) => {
      if (!normalizedCurrentFilePath) {
        return;
      }
      setOverrideForFile(normalizedCurrentFilePath, languageId);
    },
    [normalizedCurrentFilePath, setOverrideForFile]
  );

  const resetCurrentFileOverride = useCallback(() => {
    if (!normalizedCurrentFilePath) {
      return;
    }
    resetOverrideForFile(normalizedCurrentFilePath);
  }, [normalizedCurrentFilePath, resetOverrideForFile]);

  const currentFileOverride = useMemo(
    () => getCurrentFileOverride(),
    [getCurrentFileOverride]
  );

  return {
    restored,
    overridesByFilePath,
    currentFileOverride,
    getOverrideForFile,
    getCurrentFileOverride,
    setOverrideForFile,
    resetOverrideForFile,
    setCurrentFileOverride,
    resetCurrentFileOverride,
  };
}
