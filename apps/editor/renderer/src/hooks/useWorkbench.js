import { useCallback, useEffect, useMemo, useState } from 'react';

const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'avif', 'bmp']);
const VIDEO_EXTENSIONS = new Set(['mp4', 'mov', 'webm', 'mkv']);
const AUDIO_EXTENSIONS = new Set(['mp3', 'wav', 'ogg', 'm4a', 'flac']);
const PDF_EXTENSIONS = new Set(['pdf']);

const buildTabId = (cellId, rootPath, filePath) => `${cellId}::${rootPath}::${filePath}`;

const basename = (value) => value.split('/').filter(Boolean).pop() || value;
const extname = (value) => {
  const name = basename(value || '');
  const index = name.lastIndexOf('.');
  if (index <= 0) {
    return '';
  }
  return name.slice(index + 1).toLowerCase();
};

const detectKind = (filePath) => {
  const ext = extname(filePath);
  if (IMAGE_EXTENSIONS.has(ext)) {
    return 'image';
  }
  if (VIDEO_EXTENSIONS.has(ext)) {
    return 'video';
  }
  if (AUDIO_EXTENSIONS.has(ext)) {
    return 'audio';
  }
  if (PDF_EXTENSIONS.has(ext)) {
    return 'pdf';
  }
  return 'code';
};

const serializeTabs = (tabsByCellId) => {
  const next = {};
  Object.entries(tabsByCellId || {}).forEach(([cellId, tabs]) => {
    next[cellId] = (tabs || []).map((tab) => ({
      path: tab.path,
      rootPath: tab.rootPath,
      isPreview: tab.isPreview,
    }));
  });
  return next;
};

const hydrateTab = (tab, cellId, fallbackRoot) => {
  if (!tab?.path) {
    return null;
  }
  const rootPath = tab.rootPath || fallbackRoot || '';
  const id = tab.id || buildTabId(cellId, rootPath, tab.path);
  return {
    id,
    path: tab.path,
    rootPath,
    title: basename(tab.path),
    kind: detectKind(tab.path),
    isPreview: Boolean(tab.isPreview),
  };
};

const normalizeTabsByCellId = (tabsByCellId, fallbackRoot) => {
  const next = {};
  Object.entries(tabsByCellId || {}).forEach(([cellId, tabs]) => {
    const hydrated = (tabs || [])
      .map((tab) => hydrateTab(tab, cellId, fallbackRoot))
      .filter(Boolean);
    if (hydrated.length) {
      next[cellId] = hydrated;
    }
  });
  return next;
};

export function useWorkbench({
  selectedCell,
  repoRoot,
  initialTabsByCellId,
  initialActiveTabByCellId,
}) {
  const [tabsByCellId, setTabsByCellId] = useState(
    normalizeTabsByCellId(initialTabsByCellId, repoRoot)
  );
  const [activeTabByCellId, setActiveTabByCellId] = useState(initialActiveTabByCellId || {});

  useEffect(() => {
    if (initialTabsByCellId && Object.keys(initialTabsByCellId).length) {
      setTabsByCellId(normalizeTabsByCellId(initialTabsByCellId, repoRoot));
    }
  }, [initialTabsByCellId, repoRoot]);

  useEffect(() => {
    if (initialActiveTabByCellId && Object.keys(initialActiveTabByCellId).length) {
      setActiveTabByCellId(initialActiveTabByCellId);
    }
  }, [initialActiveTabByCellId]);

  const cellKey = selectedCell?.id || 'repo';
  const tabs = tabsByCellId[cellKey] || [];
  const activeTabId = activeTabByCellId[cellKey] || null;

  const activeTab = useMemo(() => {
    if (!tabs.length) {
      return null;
    }
    const active = tabs.find((tab) => tab.id === activeTabId);
    return active || tabs[0];
  }, [activeTabId, tabs]);

  useEffect(() => {
    const currentTabs = tabsByCellId[cellKey] || [];
    if (!currentTabs.length) {
      if (activeTabByCellId[cellKey]) {
        setActiveTabByCellId((current) => {
          const next = { ...current };
          delete next[cellKey];
          return next;
        });
      }
      return;
    }
    const currentActive = activeTabByCellId[cellKey];
    if (currentActive && currentTabs.find((tab) => tab.id === currentActive)) {
      return;
    }
    setActiveTabByCellId((current) => ({
      ...current,
      [cellKey]: currentTabs[0].id,
    }));
  }, [activeTabByCellId, cellKey, tabsByCellId]);

  const openFile = useCallback(
    ({ path, mode = 'preview', rootPath }) => {
      if (!path) {
        return;
      }
      const resolvedRoot = rootPath || selectedCell?.worktreePath || repoRoot || '';
      const id = buildTabId(cellKey, resolvedRoot, path);
      const nextTab = {
        id,
        path,
        rootPath: resolvedRoot,
        title: basename(path),
        kind: detectKind(path),
        isPreview: mode === 'preview',
      };

      setTabsByCellId((current) => {
        const currentTabs = current[cellKey] || [];
        const existingIndex = currentTabs.findIndex((tab) => tab.id === id);
        let nextTabs = [...currentTabs];

        if (existingIndex >= 0) {
          const existing = currentTabs[existingIndex];
          const next = {
            ...existing,
            isPreview: mode === 'preview' ? existing.isPreview : false,
          };
          nextTabs[existingIndex] = next;
        } else if (mode === 'preview') {
          const previewIndex = currentTabs.findIndex((tab) => tab.isPreview);
          if (previewIndex >= 0) {
            nextTabs[previewIndex] = nextTab;
          } else {
            nextTabs.push(nextTab);
          }
        } else {
          nextTabs.push({ ...nextTab, isPreview: false });
        }

        return {
          ...current,
          [cellKey]: nextTabs,
        };
      });

      setActiveTabByCellId((current) => ({
        ...current,
        [cellKey]: id,
      }));
    },
    [cellKey, repoRoot, selectedCell]
  );

  const closeTab = useCallback(
    (tabId) => {
      setTabsByCellId((current) => {
        const currentTabs = current[cellKey] || [];
        const nextTabs = currentTabs.filter((tab) => tab.id !== tabId);
        return {
          ...current,
          [cellKey]: nextTabs,
        };
      });
      setActiveTabByCellId((current) => {
        if (current[cellKey] !== tabId) {
          return current;
        }
        return {
          ...current,
          [cellKey]: null,
        };
      });
    },
    [cellKey]
  );

  const closeOtherTabs = useCallback(
    (tabId) => {
      setTabsByCellId((current) => ({
        ...current,
        [cellKey]: (current[cellKey] || []).filter((tab) => tab.id === tabId),
      }));
      setActiveTabByCellId((current) => ({
        ...current,
        [cellKey]: tabId,
      }));
    },
    [cellKey]
  );

  const closeAllTabs = useCallback(() => {
    setTabsByCellId((current) => ({
      ...current,
      [cellKey]: [],
    }));
    setActiveTabByCellId((current) => ({
      ...current,
      [cellKey]: null,
    }));
  }, [cellKey]);

  const pinTab = useCallback(
    (tabId) => {
      setTabsByCellId((current) => {
        const currentTabs = current[cellKey] || [];
        const nextTabs = currentTabs.map((tab) =>
          tab.id === tabId ? { ...tab, isPreview: false } : tab
        );
        return {
          ...current,
          [cellKey]: nextTabs,
        };
      });
    },
    [cellKey]
  );

  const reorderTabs = useCallback(
    (sourceId, targetId) => {
      if (sourceId === targetId) {
        return;
      }
      setTabsByCellId((current) => {
        const currentTabs = current[cellKey] || [];
        const sourceIndex = currentTabs.findIndex((tab) => tab.id === sourceId);
        const targetIndex = currentTabs.findIndex((tab) => tab.id === targetId);
        if (sourceIndex === -1 || targetIndex === -1) {
          return current;
        }
        const nextTabs = [...currentTabs];
        const [moved] = nextTabs.splice(sourceIndex, 1);
        nextTabs.splice(targetIndex, 0, moved);
        return {
          ...current,
          [cellKey]: nextTabs,
        };
      });
    },
    [cellKey]
  );

  const setActiveTab = useCallback(
    (tabId) => {
      setActiveTabByCellId((current) => ({
        ...current,
        [cellKey]: tabId,
      }));
    },
    [cellKey]
  );

  return {
    tabs,
    activeTabId,
    activeTab,
    openFile,
    closeTab,
    closeOtherTabs,
    closeAllTabs,
    pinTab,
    reorderTabs,
    setActiveTab,
    tabsByCellId,
    activeTabByCellId,
    serializeTabs,
  };
}
