import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const buildAncestorPaths = (path) => {
  const parts = path.split('/').filter(Boolean);
  const ancestors = [''];
  let current = '';
  for (let i = 0; i < parts.length - 1; i += 1) {
    current = [current, parts[i]].filter(Boolean).join('/');
    ancestors.push(current);
  }
  return ancestors;
};

const buildTreeFromMatches = (paths) => {
  const nodes = {
    '': { path: '', name: '', type: 'dir' },
  };
  const children = { '': [] };
  const ensureNode = (path, type = 'dir') => {
    if (!nodes[path]) {
      const name = path.split('/').filter(Boolean).pop() || '';
      nodes[path] = { path, name, type };
    }
    if (!children[path]) {
      children[path] = [];
    }
  };

  paths.forEach((filePath) => {
    const ancestors = buildAncestorPaths(filePath);
    ancestors.forEach((ancestor) => ensureNode(ancestor, 'dir'));
    const fileName = filePath.split('/').filter(Boolean).pop() || filePath;
    nodes[filePath] = { path: filePath, name: fileName, type: 'file' };
    if (!children[filePath]) {
      children[filePath] = [];
    }
    ancestors.forEach((ancestor, index) => {
      const next = index === ancestors.length - 1 ? filePath : ancestors[index + 1];
      if (next && !children[ancestor].includes(next)) {
        children[ancestor].push(next);
      }
    });
  });

  Object.keys(children).forEach((key) => {
    children[key] = children[key].sort((a, b) => {
      const nodeA = nodes[a];
      const nodeB = nodes[b];
      if (nodeA?.type !== nodeB?.type) {
        return nodeA?.type === 'dir' ? -1 : 1;
      }
      return (nodeA?.name || '').localeCompare(nodeB?.name || '');
    });
  });

  return { nodes, children };
};

const toRelativePath = (value) => value.replace(/\\/g, '/').replace(/^\.?\//, '');
const dirname = (value) => value.split('/').slice(0, -1).join('/');
const basename = (value) => value.split('/').pop() || value;

const pathBaseName = (value) => value.split('/').filter(Boolean).pop() || value;

export function useProjectExplorer({ rootPath, rootLabel, getVisiblePaths } = {}) {
  const [repoRoot, setRepoRoot] = useState('');
  const [repoName, setRepoName] = useState('');
  const [nodesByPath, setNodesByPath] = useState({ '': { path: '', name: '', type: 'dir' } });
  const [childrenByPath, setChildrenByPath] = useState({ '': [] });
  const [expandedPaths, setExpandedPaths] = useState(() => new Set(['']));
  const [loadingPaths, setLoadingPaths] = useState(() => new Set());
  const [statusByPath, setStatusByPath] = useState({});
  const [folderStatusByPath, setFolderStatusByPath] = useState({});
  const [statusLabels, setStatusLabels] = useState({});
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchTruncated, setSearchTruncated] = useState(false);
  const [showHidden, setShowHidden] = useState(true);
  const [showChangesOnly, setShowChangesOnly] = useState(false);
  const [selectedPaths, setSelectedPaths] = useState([]);
  const lastSelectedRef = useRef('');
  const selectionAnchorRef = useRef('');
  const statusInFlightRef = useRef(null);
  const statusCacheRef = useRef(null);
  const statusCacheAtRef = useRef(0);
  const statusRefreshHandle = useRef(null);
  const childrenByPathRef = useRef(childrenByPath);

  useEffect(() => {
    childrenByPathRef.current = childrenByPath;
  }, [childrenByPath]);

  const refreshRoot = useCallback(async () => {
    if (!window.agency?.getExplorerRoot) {
      return;
    }
    try {
      const info = await window.agency.getExplorerRoot();
      setRepoRoot(info?.repoRoot || '');
      setRepoName(info?.name || '');
    } catch (err) {
      setError(err?.message || 'Failed to resolve repository root.');
    }
  }, []);

  const refreshStatus = useCallback(async ({ force = false } = {}) => {
    if (!window.agency?.getExplorerStatus) {
      return;
    }
    const now = Date.now();
    if (!force && statusCacheRef.current && now - statusCacheAtRef.current < 500) {
      const cached = statusCacheRef.current;
      setStatusByPath(cached.files || {});
      setFolderStatusByPath(cached.folders || {});
      setStatusLabels(cached.statusLabels || {});
      setRepoRoot(cached.repoRoot || '');
      setRepoName(cached.rootName || '');
      return;
    }
    if (statusInFlightRef.current) {
      return statusInFlightRef.current;
    }
    statusInFlightRef.current = (async () => {
      try {
        const status = await window.agency.getExplorerStatus();
        statusCacheRef.current = status;
        statusCacheAtRef.current = Date.now();
        setStatusByPath(status?.files || {});
        setFolderStatusByPath(status?.folders || {});
        setStatusLabels(status?.statusLabels || {});
        setRepoRoot(status?.repoRoot || '');
        setRepoName(status?.rootName || '');
      } catch (err) {
        setError(err?.message || 'Failed to load explorer status.');
      } finally {
        statusInFlightRef.current = null;
      }
    })();
    return statusInFlightRef.current;
  }, []);

  const scheduleStatusRefresh = useCallback(() => {
    if (statusRefreshHandle.current) {
      clearTimeout(statusRefreshHandle.current);
    }
    statusRefreshHandle.current = setTimeout(() => {
      statusRefreshHandle.current = null;
      refreshStatus();
    }, 250);
  }, [refreshStatus]);

  const loadDirectory = useCallback(
    async (relativePath) => {
      if (!window.agency?.listExplorerEntries) {
        return;
      }
      const normalized = toRelativePath(relativePath || '');
      setLoadingPaths((current) => new Set([...current, normalized]));
      try {
        const result = await window.agency.listExplorerEntries({
          path: normalized,
          showHidden,
          rootPath: rootPath || undefined,
        });
        const entries = result?.entries || [];
        setNodesByPath((current) => {
          const next = { ...current };
          entries.forEach((entry) => {
            next[entry.path] = entry;
          });
          return next;
        });
        setChildrenByPath((current) => ({
          ...current,
          [normalized]: entries.map((entry) => entry.path),
        }));
      } catch (err) {
        setError(err?.message || 'Failed to load directory.');
      } finally {
        setLoadingPaths((current) => {
          const next = new Set(current);
          next.delete(normalized);
          return next;
        });
      }
    },
    [rootPath, showHidden]
  );

  const refreshAll = useCallback(async () => {
    if (!rootPath) {
      await refreshRoot();
    }
    await refreshStatus();
    await loadDirectory('');
  }, [loadDirectory, refreshRoot, refreshStatus, rootPath]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  const resetTreeState = useCallback(
    ({ resetSearch = false } = {}) => {
      setNodesByPath({ '': { path: '', name: '', type: 'dir' } });
      setChildrenByPath({ '': [] });
      setExpandedPaths(new Set(['']));
      setLoadingPaths(new Set());
      setSelectedPaths([]);
      lastSelectedRef.current = '';
      selectionAnchorRef.current = '';
      if (resetSearch) {
        setSearchQuery('');
        setSearchResults([]);
        setSearchTruncated(false);
      }
    },
    []
  );

  useEffect(() => {
    resetTreeState({ resetSearch: true });
  }, [resetTreeState, rootPath]);

  useEffect(() => {
    resetTreeState();
  }, [resetTreeState, showHidden]);

  const expandPath = useCallback(
    async (path) => {
      const normalized = toRelativePath(path);
      if (!childrenByPath[normalized]) {
        await loadDirectory(normalized);
      }
      setExpandedPaths((current) => {
        const next = new Set(current);
        next.add(normalized);
        return next;
      });
    },
    [childrenByPath, loadDirectory]
  );

  const collapsePath = useCallback((path) => {
    const normalized = toRelativePath(path);
    setExpandedPaths((current) => {
      const next = new Set(current);
      next.delete(normalized);
      return next;
    });
  }, []);

  const togglePath = useCallback(
    async (path) => {
      if (expandedPaths.has(path)) {
        collapsePath(path);
        return;
      }
      await expandPath(path);
    },
    [collapsePath, expandPath, expandedPaths]
  );

  const handleSelectPath = useCallback(
    (path, event) => {
      const normalized = toRelativePath(path);
      const isMulti = event?.metaKey || event?.ctrlKey;
      const isRange = event?.shiftKey;
      const anchor = selectionAnchorRef.current || lastSelectedRef.current || normalized;
      if (isRange && anchor) {
        if (!selectionAnchorRef.current) {
          selectionAnchorRef.current = anchor;
        }
        const visible =
          typeof getVisiblePaths === 'function'
            ? getVisiblePaths()
            : getVisiblePathsDefault({
                nodes: nodesByPath,
                children: childrenByPath,
                expanded: expandedPaths,
                showChangesOnly,
                statusByPath,
                folderStatusByPath,
              });
        const start = visible.indexOf(anchor);
        const end = visible.indexOf(normalized);
        if (start !== -1 && end !== -1) {
          const [from, to] = start < end ? [start, end] : [end, start];
          setSelectedPaths(visible.slice(from, to + 1));
          lastSelectedRef.current = normalized;
          return;
        }
      }
      if (isMulti) {
        setSelectedPaths((current) =>
          current.includes(normalized)
            ? current.filter((item) => item !== normalized)
            : [...current, normalized]
        );
      } else {
        setSelectedPaths([normalized]);
      }
      selectionAnchorRef.current = normalized;
      lastSelectedRef.current = normalized;
    },
    [
      childrenByPath,
      expandedPaths,
      folderStatusByPath,
      getVisiblePaths,
      nodesByPath,
      showChangesOnly,
      statusByPath,
    ]
  );

  const clearSelection = useCallback(() => {
    setSelectedPaths([]);
    lastSelectedRef.current = '';
  }, []);

  const createEntry = useCallback(async (payload) => {
    if (!window.agency?.createExplorerEntry) {
      return null;
    }
    const result = await window.agency.createExplorerEntry({
      ...payload,
      rootPath: rootPath || undefined,
    });
    const parentPath = payload?.parentPath || '';
    await loadDirectory(parentPath);
    await refreshStatus();
    return result;
  }, [loadDirectory, refreshStatus, rootPath]);

  const renameEntry = useCallback(async (payload) => {
    if (!window.agency?.renameExplorerEntry) {
      return null;
    }
    const result = await window.agency.renameExplorerEntry({
      ...payload,
      rootPath: rootPath || undefined,
    });
    const sourceParent = dirname(toRelativePath(payload?.sourcePath || ''));
    const targetParent = dirname(toRelativePath(payload?.targetPath || ''));
    await Promise.all([loadDirectory(sourceParent), loadDirectory(targetParent)]);
    await refreshStatus();
    return result;
  }, [loadDirectory, refreshStatus, rootPath]);

  const deleteEntry = useCallback(async (payload) => {
    if (!window.agency?.deleteExplorerEntry) {
      return null;
    }
    const result = await window.agency.deleteExplorerEntry({
      ...payload,
      rootPath: rootPath || undefined,
    });
    const parentPath = dirname(toRelativePath(payload?.targetPath || ''));
    await loadDirectory(parentPath);
    await refreshStatus();
    return result;
  }, [loadDirectory, refreshStatus, rootPath]);

  const copyEntry = useCallback(async (payload) => {
    if (!window.agency?.copyExplorerEntry) {
      return null;
    }
    const result = await window.agency.copyExplorerEntry({
      ...payload,
      rootPath: rootPath || undefined,
    });
    const targetParent = dirname(toRelativePath(payload?.targetPath || ''));
    await loadDirectory(targetParent);
    await refreshStatus();
    return result;
  }, [loadDirectory, refreshStatus, rootPath]);

  const revealEntry = useCallback(async (payload) => {
    if (!window.agency?.revealExplorerEntry) {
      return null;
    }
    return window.agency.revealExplorerEntry({
      ...payload,
      rootPath: rootPath || undefined,
    });
  }, [rootPath]);

  const search = useCallback(
    async (query) => {
      if (!window.agency?.searchExplorerFiles) {
        setSearchResults([]);
        return;
      }
      if (!query) {
        setSearchResults([]);
        setSearchTruncated(false);
        return;
      }
      try {
        const result = await window.agency.searchExplorerFiles({
          query,
          rootPath: rootPath || undefined,
        });
        setSearchResults(result?.matches || []);
        setSearchTruncated(Boolean(result?.truncated));
      } catch (err) {
        setError(err?.message || 'Failed to search files.');
      }
    },
    [rootPath]
  );

  useEffect(() => {
    const handle = setTimeout(() => {
      search(searchQuery.trim());
    }, 250);
    return () => clearTimeout(handle);
  }, [search, searchQuery]);

  const searchTree = useMemo(() => buildTreeFromMatches(searchResults), [searchResults]);

  useEffect(() => {
    if (!window.agency?.watchExplorer || !window.agency?.onExplorerChanged) {
      return undefined;
    }
    const watchRoot = rootPath || repoRoot || '';
    if (watchRoot) {
      window.agency.watchExplorer({ rootPath: watchRoot }).catch(() => undefined);
    }
    const unsubscribe = window.agency.onExplorerChanged((payload) => {
      if (!payload) {
        return;
      }
      if (payload.rootPath && watchRoot && payload.rootPath !== watchRoot) {
        return;
      }
      const paths = payload.paths || [];
      const loaded = childrenByPathRef.current;
      paths.forEach((dir) => {
        if (dir === '' || loaded[dir]) {
          loadDirectory(dir);
        }
      });
      scheduleStatusRefresh();
    });
    return () => {
      unsubscribe?.();
      window.agency.watchExplorer({ rootPath: '' }).catch(() => undefined);
    };
  }, [loadDirectory, repoRoot, rootPath, scheduleStatusRefresh]);

  return {
    rootPath: rootPath || repoRoot,
    rootLabel: rootLabel || repoName || pathBaseName(rootPath || repoRoot) || 'Project',
    repoRoot,
    nodesByPath,
    childrenByPath,
    expandedPaths,
    loadingPaths,
    statusByPath,
    folderStatusByPath,
    statusLabels,
    error,
    setErrorMessage: setError,
    searchQuery,
    setSearchQuery,
    searchResults,
    searchTruncated,
    searchTree,
    showHidden,
    setShowHidden,
    showChangesOnly,
    setShowChangesOnly,
    selectedPaths,
    setSelectedPaths,
    clearSelection,
    loadDirectory,
    refreshAll,
    refreshStatus,
    expandPath,
    collapsePath,
    togglePath,
    createEntry,
    renameEntry,
    deleteEntry,
    copyEntry,
    revealEntry,
    handleSelectPath,
    clearError: () => setError(''),
  };
}

function getVisiblePathsDefault({
  nodes,
  children,
  expanded,
  showChangesOnly,
  statusByPath,
  folderStatusByPath,
}) {
  const visible = [];
  const shouldInclude = (path, type) => {
    if (!showChangesOnly) {
      return true;
    }
    if (type === 'dir') {
      return Boolean(folderStatusByPath[path]);
    }
    return Boolean(statusByPath[path]);
  };
  const walk = (path) => {
    const node = nodes[path];
    if (!node) {
      return;
    }
    if (!shouldInclude(path, node.type)) {
      if (node.type === 'dir') {
        const childrenPaths = children[path] || [];
        const hasIncludedChild = childrenPaths.some((child) => shouldInclude(child, nodes[child]?.type));
        if (!hasIncludedChild) {
          return;
        }
      } else {
        return;
      }
    }
    if (path) {
      visible.push(path);
    }
    if (node.type === 'dir' && expanded.has(path)) {
      const childrenPaths = children[path] || [];
      childrenPaths.forEach((child) => walk(child));
    }
  };
  walk('');
  return visible;
}

export const explorerPathUtils = { dirname, basename, toRelativePath };
