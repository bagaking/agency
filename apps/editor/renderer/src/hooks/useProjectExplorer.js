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

export function useProjectExplorer() {
  const [repoRoot, setRepoRoot] = useState('');
  const [rootName, setRootName] = useState('');
  const [nodesByPath, setNodesByPath] = useState({ '': { path: '', name: '', type: 'dir' } });
  const [childrenByPath, setChildrenByPath] = useState({ '': [] });
  const [expandedPaths, setExpandedPaths] = useState(() => new Set(['']));
  const [loadingPaths, setLoadingPaths] = useState(() => new Set());
  const [statusByPath, setStatusByPath] = useState({});
  const [folderStatusByPath, setFolderStatusByPath] = useState({});
  const [cells, setCells] = useState([]);
  const [statusLabels, setStatusLabels] = useState({});
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchTruncated, setSearchTruncated] = useState(false);
  const [showHidden, setShowHidden] = useState(true);
  const [showChangesOnly, setShowChangesOnly] = useState(false);
  const [selectedPaths, setSelectedPaths] = useState([]);
  const lastSelectedRef = useRef('');

  const refreshRoot = useCallback(async () => {
    if (!window.agency?.getExplorerRoot) {
      return;
    }
    try {
      const info = await window.agency.getExplorerRoot();
      setRepoRoot(info?.repoRoot || '');
      setRootName(info?.name || '');
    } catch (err) {
      setError(err?.message || 'Failed to resolve repository root.');
    }
  }, []);

  const refreshStatus = useCallback(async () => {
    if (!window.agency?.getExplorerStatus) {
      return;
    }
    try {
      const status = await window.agency.getExplorerStatus();
      setStatusByPath(status?.files || {});
      setFolderStatusByPath(status?.folders || {});
      setCells(status?.cells || []);
      setStatusLabels(status?.statusLabels || {});
      setRepoRoot(status?.repoRoot || '');
      setRootName(status?.rootName || '');
    } catch (err) {
      setError(err?.message || 'Failed to load explorer status.');
    }
  }, []);

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
    [showHidden]
  );

  const refreshAll = useCallback(async () => {
    await refreshRoot();
    await refreshStatus();
    await loadDirectory('');
  }, [refreshRoot, refreshStatus, loadDirectory]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

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
      if (isRange && lastSelectedRef.current) {
        const visible = getVisiblePaths({
          nodes: nodesByPath,
          children: childrenByPath,
          expanded: expandedPaths,
          showChangesOnly,
          statusByPath,
          folderStatusByPath,
        });
        const start = visible.indexOf(lastSelectedRef.current);
        const end = visible.indexOf(normalized);
        if (start !== -1 && end !== -1) {
          const [from, to] = start < end ? [start, end] : [end, start];
          setSelectedPaths(visible.slice(from, to + 1));
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
      lastSelectedRef.current = normalized;
    },
    [childrenByPath, expandedPaths, folderStatusByPath, nodesByPath, showChangesOnly, statusByPath]
  );

  const clearSelection = useCallback(() => {
    setSelectedPaths([]);
    lastSelectedRef.current = '';
  }, []);

  const createEntry = useCallback(async (payload) => {
    if (!window.agency?.createExplorerEntry) {
      return null;
    }
    const result = await window.agency.createExplorerEntry(payload);
    const parentPath = payload?.parentPath || '';
    await loadDirectory(parentPath);
    await refreshStatus();
    return result;
  }, [loadDirectory, refreshStatus]);

  const renameEntry = useCallback(async (payload) => {
    if (!window.agency?.renameExplorerEntry) {
      return null;
    }
    const result = await window.agency.renameExplorerEntry(payload);
    const sourceParent = dirname(toRelativePath(payload?.sourcePath || ''));
    const targetParent = dirname(toRelativePath(payload?.targetPath || ''));
    await Promise.all([loadDirectory(sourceParent), loadDirectory(targetParent)]);
    await refreshStatus();
    return result;
  }, [loadDirectory, refreshStatus]);

  const deleteEntry = useCallback(async (payload) => {
    if (!window.agency?.deleteExplorerEntry) {
      return null;
    }
    const result = await window.agency.deleteExplorerEntry(payload);
    const parentPath = dirname(toRelativePath(payload?.targetPath || ''));
    await loadDirectory(parentPath);
    await refreshStatus();
    return result;
  }, [loadDirectory, refreshStatus]);

  const copyEntry = useCallback(async (payload) => {
    if (!window.agency?.copyExplorerEntry) {
      return null;
    }
    const result = await window.agency.copyExplorerEntry(payload);
    const targetParent = dirname(toRelativePath(payload?.targetPath || ''));
    await loadDirectory(targetParent);
    await refreshStatus();
    return result;
  }, [loadDirectory, refreshStatus]);

  const revealEntry = useCallback(async (payload) => {
    if (!window.agency?.revealExplorerEntry) {
      return null;
    }
    return window.agency.revealExplorerEntry(payload);
  }, []);

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
        const result = await window.agency.searchExplorerFiles({ query });
        setSearchResults(result?.matches || []);
        setSearchTruncated(Boolean(result?.truncated));
      } catch (err) {
        setError(err?.message || 'Failed to search files.');
      }
    },
    []
  );

  useEffect(() => {
    const handle = setTimeout(() => {
      search(searchQuery.trim());
    }, 250);
    return () => clearTimeout(handle);
  }, [search, searchQuery]);

  const searchTree = useMemo(() => buildTreeFromMatches(searchResults), [searchResults]);

  return {
    repoRoot,
    rootName,
    nodesByPath,
    childrenByPath,
    expandedPaths,
    loadingPaths,
    statusByPath,
    folderStatusByPath,
    statusLabels,
    cells,
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

function getVisiblePaths({
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
