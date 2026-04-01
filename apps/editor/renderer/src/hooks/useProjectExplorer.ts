import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { pathBaseName } from './shared/scopedSettingsState';
import { classifyFiles, runFileIntent } from '../services/fileInteraction';
import {
  getExplorerRoot,
  getExplorerStatus,
  listExplorerEntries,
  onExplorerChanged,
  searchExplorerFiles,
  watchExplorer,
} from '../services/agencyBridge';
import { buildTreeFromMatches } from './projectExplorerSearchTree';

const SEMANTIC_CLASSIFY_BATCH_SIZE = 200;
const SEMANTIC_CLASSIFY_CONTINUE_DELAY_MS = 48;

const toRelativePath = (value) => value.replace(/\\/g, '/').replace(/^\.?\//, '');
const dirname = (value) => value.split('/').slice(0, -1).join('/');
const basename = (value) => value.split('/').pop() || value;

export function useProjectExplorer(options: any = {}) {
  const { rootPath, rootLabel, getVisiblePaths, enabled = true } = options;
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
  const [semanticTagsByPath, setSemanticTagsByPath] = useState({});
  const [semanticRules, setSemanticRules] = useState([]);
  const lastSelectedRef = useRef('');
  const selectionAnchorRef = useRef('');
  const statusInFlightRef = useRef(null);
  const statusCacheRef = useRef(null);
  const statusCacheAtRef = useRef(0);
  const statusRefreshHandle = useRef(null);
  const semanticRefreshHandle = useRef(null);
  const semanticRequestIdRef = useRef(0);
  const semanticTagsByPathRef = useRef(semanticTagsByPath);
  const childrenByPathRef = useRef(childrenByPath);
  const expandedPathsRef = useRef(expandedPaths);
  const loadDirectoryInFlightRef = useRef(new Map());

  useEffect(() => {
    childrenByPathRef.current = childrenByPath;
  }, [childrenByPath]);

  useEffect(() => {
    expandedPathsRef.current = expandedPaths;
  }, [expandedPaths]);

  useEffect(() => {
    semanticTagsByPathRef.current = semanticTagsByPath;
  }, [semanticTagsByPath]);

  const refreshRoot = useCallback(async () => {
    if (!enabled) {
      setRepoRoot('');
      setRepoName('');
      return;
    }
    try {
      const info = await getExplorerRoot({
        rootPath: rootPath || undefined,
      });
      if (!info) {
        return;
      }
      setRepoRoot(info?.repoRoot || '');
      setRepoName(info?.name || '');
    } catch (err) {
      setError(err?.message || 'Failed to resolve repository root.');
    }
  }, [enabled, rootPath]);

  const refreshStatus = useCallback(async ({ force = false } = {}) => {
    if (!enabled) {
      setStatusByPath({});
      setFolderStatusByPath({});
      setStatusLabels({});
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
        const status = await getExplorerStatus({
          rootPath: rootPath || undefined,
        });
        if (!status) {
          return;
        }
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
  }, [enabled, rootPath]);

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
      const normalized = toRelativePath(relativePath || '');
      const inFlight = loadDirectoryInFlightRef.current.get(normalized);
      if (inFlight) {
        return inFlight;
      }

      const request = (async () => {
        setLoadingPaths((current) => new Set([...current, normalized]));
        try {
          const result = await listExplorerEntries({
            path: normalized,
            showHidden,
            rootPath: rootPath || undefined,
          });
          if (!result) {
            return null;
          }
          const entries = result?.entries || [];
          const childPaths = entries.map((entry) => entry.path);

          setNodesByPath((current) => {
            const next = { ...current };
            entries.forEach((entry) => {
              next[entry.path] = entry;
            });
            return next;
          });

          setChildrenByPath((current) => {
            const previous = Array.isArray(current[normalized]) ? current[normalized] : [];
            const sameLength = previous.length === childPaths.length;
            const unchanged =
              sameLength && previous.every((value, index) => value === childPaths[index]);
            if (unchanged) {
              return current;
            }
            return {
              ...current,
              [normalized]: childPaths,
            };
          });

          return result;
        } catch (err) {
          setError(err?.message || 'Failed to load directory.');
          return null;
        } finally {
          loadDirectoryInFlightRef.current.delete(normalized);
          setLoadingPaths((current) => {
            const next = new Set(current);
            next.delete(normalized);
            return next;
          });
        }
      })();

      loadDirectoryInFlightRef.current.set(normalized, request);
      return request;
    },
    [rootPath, showHidden]
  );

  const refreshAll = useCallback(async ({ forceStatus = false, reloadExpanded = false } = {}) => {
    if (!enabled) {
      return;
    }
    if (!rootPath) {
      await refreshRoot();
    }
    // Load root entries first so Explorer tree is responsive even when status is slow.
    await loadDirectory('');
    if (reloadExpanded) {
      const expanded = Array.from(expandedPathsRef.current || [])
        .map((value) => toRelativePath(value || ''))
        .filter(Boolean)
        .sort((left, right) => left.split('/').length - right.split('/').length);
      if (expanded.length) {
        await Promise.all(expanded.map((entryPath) => loadDirectory(entryPath)));
      }
    }
    await refreshStatus({ force: Boolean(forceStatus) });
  }, [enabled, loadDirectory, refreshRoot, refreshStatus, rootPath]);

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

  useEffect(() => {
    loadDirectoryInFlightRef.current.clear();
  }, [rootPath, showHidden, enabled]);

  useEffect(() => {
    setSemanticTagsByPath({});
    setSemanticRules([]);
    semanticTagsByPathRef.current = {};
    semanticRequestIdRef.current += 1;
  }, [rootPath, showHidden]);

  useEffect(() => {
    if (enabled) {
      return;
    }
    setRepoRoot('');
    setRepoName('');
    setStatusByPath({});
    setFolderStatusByPath({});
    setStatusLabels({});
    setSemanticTagsByPath({});
    setSemanticRules([]);
    resetTreeState({ resetSearch: true });
  }, [enabled, resetTreeState]);

  const refreshSemanticTags = useCallback(async function runSemanticRefresh() {
    if (!enabled) {
      setSemanticTagsByPath({});
      setSemanticRules([]);
      semanticTagsByPathRef.current = {};
      return;
    }
    const paths = Object.keys(nodesByPath || {})
      .filter(Boolean)
      .map((value) => toRelativePath(value))
      .filter(Boolean);
    if (!paths.length) {
      setSemanticTagsByPath({});
      setSemanticRules([]);
      semanticTagsByPathRef.current = {};
      return;
    }

    const knownTags = semanticTagsByPathRef.current || {};
    const pendingPaths = paths.filter((value) => !(value in knownTags));
    if (!pendingPaths.length) {
      return;
    }
    const batchPaths = pendingPaths.slice(0, SEMANTIC_CLASSIFY_BATCH_SIZE);
    const hasMore = pendingPaths.length > batchPaths.length;

    const requestId = semanticRequestIdRef.current + 1;
    semanticRequestIdRef.current = requestId;

    try {
      const response = await classifyFiles({
        rootPath: rootPath || undefined,
        paths: batchPaths,
      });
      if (semanticRequestIdRef.current !== requestId) {
        return;
      }
      const nextTagsByPath = response?.data?.tagsByPath || {};
      const nextRules = Array.isArray(response?.data?.rules) ? response.data.rules : [];
      if (Object.keys(nextTagsByPath).length) {
        setSemanticTagsByPath((current) => ({
          ...(current || {}),
          ...nextTagsByPath,
        }));
      }
      setSemanticRules(nextRules);
      if (hasMore) {
        if (semanticRefreshHandle.current) {
          clearTimeout(semanticRefreshHandle.current);
        }
        semanticRefreshHandle.current = setTimeout(() => {
          semanticRefreshHandle.current = null;
          void runSemanticRefresh();
        }, SEMANTIC_CLASSIFY_CONTINUE_DELAY_MS);
      }
    } catch (err) {
      // Semantic classification should not block core explorer interactions.
    }
  }, [enabled, nodesByPath, rootPath]);

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }
    if (semanticRefreshHandle.current) {
      clearTimeout(semanticRefreshHandle.current);
    }
    semanticRefreshHandle.current = setTimeout(() => {
      semanticRefreshHandle.current = null;
      refreshSemanticTags();
    }, 260);
    return () => {
      if (semanticRefreshHandle.current) {
        clearTimeout(semanticRefreshHandle.current);
        semanticRefreshHandle.current = null;
      }
    };
  }, [enabled, refreshSemanticTags]);

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
    (path, event = null) => {
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
    const response = await runFileIntent({
      intent: 'create',
      sourceSurface: 'explorer',
      ...payload,
      rootPath: rootPath || undefined,
    });
    const result = response?.data || null;
    const parentPath = payload?.parentPath || '';
    await loadDirectory(parentPath);
    await refreshStatus();
    return result;
  }, [loadDirectory, refreshStatus, rootPath]);

  const renameEntry = useCallback(async (payload) => {
    const response = await runFileIntent({
      intent: 'rename',
      sourceSurface: 'explorer',
      ...payload,
      rootPath: rootPath || undefined,
    });
    const result = response?.data || null;
    const sourceParent = dirname(toRelativePath(payload?.sourcePath || ''));
    const targetParent = dirname(toRelativePath(payload?.targetPath || ''));
    await Promise.all([loadDirectory(sourceParent), loadDirectory(targetParent)]);
    await refreshStatus();
    return result;
  }, [loadDirectory, refreshStatus, rootPath]);

  const deleteEntry = useCallback(async (payload) => {
    const response = await runFileIntent({
      intent: 'delete',
      sourceSurface: 'explorer',
      ...payload,
      rootPath: rootPath || undefined,
    });
    const result = response?.data || null;
    const parentPath = dirname(toRelativePath(payload?.targetPath || ''));
    await loadDirectory(parentPath);
    await refreshStatus();
    return result;
  }, [loadDirectory, refreshStatus, rootPath]);

  const copyEntry = useCallback(async (payload) => {
    const response = await runFileIntent({
      intent: 'copy',
      sourceSurface: 'explorer',
      ...payload,
      rootPath: rootPath || undefined,
    });
    const result = response?.data || null;
    const targetParent = dirname(toRelativePath(payload?.targetPath || ''));
    await loadDirectory(targetParent);
    await refreshStatus();
    return result;
  }, [loadDirectory, refreshStatus, rootPath]);

  const importExternalEntries = useCallback(async ({ sourcePaths = [], targetDir = '' } = {}) => {
    const dedupedPaths = Array.from(
      new Set(
        (Array.isArray(sourcePaths) ? sourcePaths : [])
          .map((item) => String(item || '').trim())
          .filter(Boolean)
      )
    );
    if (!dedupedPaths.length) {
      return {
        targetDir: toRelativePath(targetDir || ''),
        imported: [],
        importedPaths: [],
        skipped: [],
        failures: [],
        resolvedConflicts: [],
      };
    }
    const normalizedTargetDir = toRelativePath(targetDir || '');
    const response = await runFileIntent({
      intent: 'import_copy',
      sourceSurface: 'explorer',
      rootPath: rootPath || undefined,
      sourcePaths: dedupedPaths,
      targetDir: normalizedTargetDir,
    });
    const result = response?.data || null;
    await loadDirectory(normalizedTargetDir);
    await refreshStatus();
    return result;
  }, [loadDirectory, refreshStatus, rootPath]);

  const revealEntry = useCallback(async (payload) => {
    const response = await runFileIntent({
      intent: 'reveal',
      sourceSurface: 'explorer',
      ...payload,
      rootPath: rootPath || undefined,
    });
    return response?.data || null;
  }, [rootPath]);

  const openEntry = useCallback(async (payload) => {
    const response = await runFileIntent({
      intent: 'open',
      sourceSurface: 'explorer',
      ...payload,
      rootPath: rootPath || undefined,
    });
    return response?.data || null;
  }, [rootPath]);

  const search = useCallback(
    async (query) => {
      if (!enabled) {
        setSearchResults([]);
        setSearchTruncated(false);
        return;
      }
      if (!query) {
        setSearchResults([]);
        setSearchTruncated(false);
        return;
      }
      try {
        const result = await searchExplorerFiles({
          query,
          rootPath: rootPath || undefined,
        });
        if (!result) {
          setSearchResults([]);
          setSearchTruncated(false);
          return;
        }
        setSearchResults(result?.matches || []);
        setSearchTruncated(Boolean(result?.truncated));
      } catch (err) {
        setError(err?.message || 'Failed to search files.');
      }
    },
    [enabled, rootPath]
  );

  useEffect(() => {
    const handle = setTimeout(() => {
      search(searchQuery.trim());
    }, 250);
    return () => clearTimeout(handle);
  }, [search, searchQuery]);

  const searchTree = useMemo(() => buildTreeFromMatches(searchResults), [searchResults]);

  useEffect(() => {
    if (!enabled) {
      watchExplorer({ rootPath: '' }).catch(() => undefined);
      return undefined;
    }
    const watchRoot = rootPath || repoRoot || '';
    if (watchRoot) {
      watchExplorer({ rootPath: watchRoot }).catch(() => undefined);
    }
    const unsubscribe = onExplorerChanged((payload) => {
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
      watchExplorer({ rootPath: '' }).catch(() => undefined);
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
    semanticTagsByPath,
    semanticRules,
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
    importExternalEntries,
    revealEntry,
    openEntry,
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
