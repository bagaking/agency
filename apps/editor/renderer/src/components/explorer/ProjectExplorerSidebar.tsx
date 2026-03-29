import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { useProjectExplorer, explorerPathUtils } from '../../hooks/useProjectExplorer';
import { getExplorerProjectPolicy } from '../../services/agencyBridge';
import { RecentProjectsList } from '../RecentProjectsList';
import { useModal } from '../modals/ModalSystem';
import { ExplorerContentSearchView } from './ExplorerContentSearchView';
import { ExplorerContextMenu } from './ExplorerContextMenu';
import { ExplorerItem } from './ExplorerItem';
import { ExplorerHeader } from './ExplorerHeader';
import { ExplorerFilterPanel } from './ExplorerFilterPanel';
import { ExplorerFooter } from './ExplorerFooter';
import { ExplorerResearchLane } from './ExplorerResearchLane';
import { ExplorerWorkingSetView } from './ExplorerWorkingSetView';
import { 
  pickPrimaryStatus, 
} from './explorerUtils';
import { buildAgentCellModifiedFileChanges } from '../../utils/agentCellFileChanges';
import {
  getExplorerCommandsForSurface,
} from './explorerCommands';
import {
  buildExplorerFilterSummary,
  countActiveExplorerFilters,
  EXPLORER_FILTER_DESCRIPTORS,
  EXPLORER_FILTER_SEMANTIC,
  EXPLORER_FILTER_STATUS,
  EXPLORER_FILTER_VISIBILITY_CHANGES_ONLY,
  EXPLORER_FILTER_VISIBILITY_HIDDEN,
  EXPLORER_FILTER_VISIBILITY_IGNORED,
} from './explorerFilterDescriptors';
import {
  EXPLORER_CONTENT_SCOPE_FOLDER,
  EXPLORER_CONTENT_SCOPE_OPTIONS,
  EXPLORER_CONTENT_SCOPE_PROJECT,
  EXPLORER_CONTENT_SCOPE_SELECTION,
  EXPLORER_SEARCH_MODE_CONTENT,
  EXPLORER_SEARCH_MODE_OPTIONS,
  EXPLORER_SEARCH_MODE_PATH,
} from './explorerSearchModel';
import { buildExplorerVisibleItems } from './explorerVisibleItems';
import {
  EXPLORER_WORKING_SET_CHANGED_FILES,
  getImplementedExplorerWorkingSets,
} from './explorerWorkingSets';
import { useExplorerClipboardActions } from './useExplorerClipboardActions';
import { useExplorerContentSearch } from './useExplorerContentSearch';
import { useExplorerChangedFilesActions } from './useExplorerChangedFilesActions';
import { useExplorerCapabilityPreferences } from './useExplorerCapabilityPreferences';
import { useExplorerDropHandlers } from './useExplorerDropHandlers';
import { useExplorerExternalImport } from './useExplorerExternalImport';
import { useExplorerEntryMutations } from './useExplorerEntryMutations';
import { useExplorerPersistedUiState } from './useExplorerPersistedUiState';
import {
  buildExplorerInternalDragPayload,
  writeExplorerInternalDragPaths,
} from './explorerInternalDragPaths';
import { useDismissibleLayer } from '../ui/useDismissibleLayer';

const ROW_HEIGHT = 28;
const OVERSCAN = 6;
const VIRTUALIZE_THRESHOLD = 200;

const getExplorerTreeItemId = (path: string) =>
  `explorer-treeitem-${encodeURIComponent(path).replace(/%/g, '_')}`;

function ProjectExplorerSidebarContent({
  rootPath: scopeRootPath,
  rootLabel: scopeRootLabel,
  cells,
  selectedId,
  onSelectCell,
  selectedCell,
  sessions,
  activeSessionId,
  sessionActivityByKey,
  onOpenFile,
  onJumpToAgents,
  workbenchMeta,
  onDispatchFeed,
  explorerDeliverySummary,
  onOpenDeliveryTimeline,
  onAddComment,
  commentCountsByPath,
  onJumpToComments,
  onToggleSessionMap,
  sessionMapOpen,
  revealRequest,
  onRevealHandled,
}: any) {
  const modal = useModal();
  const sidebarRef = useRef<HTMLElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const filterMenuRef = useRef<HTMLDivElement | null>(null);
  const filterMenuButtonRef = useRef<HTMLButtonElement | null>(null);
  const visiblePathsRef = useRef<string[]>([]);
  const {
    rootPath,
    rootLabel,
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
    setErrorMessage,
    searchQuery,
    setSearchQuery,
    searchTruncated,
    searchTree,
    showHidden,
    setShowHidden,
    showChangesOnly,
    setShowChangesOnly,
    selectedPaths,
    setSelectedPaths,
    clearSelection,
    clearError,
    refreshAll,
    togglePath,
    expandPath,
    createEntry,
    renameEntry,
    deleteEntry,
    copyEntry,
    importExternalEntries,
    revealEntry,
    openEntry,
    handleSelectPath,
  } = useProjectExplorer({
    rootPath: scopeRootPath,
    rootLabel: scopeRootLabel,
    getVisiblePaths: () => visiblePathsRef.current,
    enabled: true, // Since it's only rendered when ready
  });

  const [draftEntry, setDraftEntry] = useState(null);
  const [renameTarget, setRenameTarget] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [projectPolicy, setProjectPolicy] = useState<Record<string, any> | null>(null);
  const [showIgnored, setShowIgnored] = useState(false);
  const [statusFilters, setStatusFilters] = useState([]);
  const [semanticFilters, setSemanticFilters] = useState([]);
  const [focusedPath, setFocusedPath] = useState('');
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [workingSetViewId, setWorkingSetViewId] = useState('tree');
  const [searchMode, setSearchMode] = useState(EXPLORER_SEARCH_MODE_PATH);
  const [contentScopeKind, setContentScopeKind] = useState(EXPLORER_CONTENT_SCOPE_PROJECT);
  const [contentCaseSensitive, setContentCaseSensitive] = useState(false);
  const [contentWholeWord, setContentWholeWord] = useState(false);
  const [contentUseRegex, setContentUseRegex] = useState(false);
  const [workingSetMode, setWorkingSetMode] = useState<'flat' | 'tree'>('flat');
  const [researchLaneOpen, setResearchLaneOpen] = useState(false);
  const [filterMenuPosition, setFilterMenuPosition] = useState<{ top: number; left: number } | null>(
    null
  );
  const filterMenuId = 'explorer-filter-menu';
  const explorerStateKey = useMemo(() => {
    const base = scopeRootPath || rootPath || repoRoot;
    if (!base) return '';
    return `agency:explorer:${base}`;
  }, [scopeRootPath, rootPath, repoRoot]);
  const filterLayerRefs = useMemo(() => [filterMenuRef, filterMenuButtonRef], []);

  const statusFilterSet = useMemo(() => new Set(statusFilters), [statusFilters]);
  const semanticFilterSet = useMemo(() => new Set(semanticFilters), [semanticFilters]);
  const descriptorStateById = useMemo(
    () => ({
      [EXPLORER_FILTER_VISIBILITY_HIDDEN]: showHidden,
      [EXPLORER_FILTER_VISIBILITY_IGNORED]: showIgnored,
      [EXPLORER_FILTER_VISIBILITY_CHANGES_ONLY]: showChangesOnly,
      [EXPLORER_FILTER_STATUS]: statusFilters,
      [EXPLORER_FILTER_SEMANTIC]: semanticFilters,
    }),
    [semanticFilters, showChangesOnly, showHidden, showIgnored, statusFilters]
  );
  const isPathSearchActive =
    searchMode === EXPLORER_SEARCH_MODE_PATH && searchQuery.trim().length > 0;
  const tree = isPathSearchActive ? searchTree : { nodes: nodesByPath, children: childrenByPath };
  const hasStatusFilters = statusFilterSet.size > 0;
  const hasSemanticFilters = semanticFilterSet.size > 0;
  const hasChangeFilter = showChangesOnly || hasStatusFilters;
  const hasSemanticFilter = hasSemanticFilters;
  const hasActiveFilters = countActiveExplorerFilters(descriptorStateById) > 0;

  const activeRootLabel = rootLabel || 'Project';
  const hasCells = cells && cells.length > 0;
  const selectedCellId = selectedCell?.id || null;
  const semanticRuleLabelById = useMemo(() => {
    const map = new Map<string, string>();
    (Array.isArray(semanticRules) ? semanticRules : []).forEach((rule: any) => {
      const id = String(rule?.id || '').trim();
      if (!id) {
        return;
      }
      map.set(id, String(rule?.label || id).trim());
    });
    return map;
  }, [semanticRules]);
  const activeFilterCount = countActiveExplorerFilters(descriptorStateById);
  const activeFilterSummary = useMemo(() => {
    return buildExplorerFilterSummary(descriptorStateById, {
      statusLabels,
      semanticRuleLabelById,
    });
  }, [descriptorStateById, semanticRuleLabelById, statusLabels]);

  const changedPanelEntries = useMemo(() => {
    if (!selectedCellId) {
      return [];
    }
    const baseRoot = String(selectedCell?.worktreePath || rootPath || scopeRootPath || '').replace(/\/+$/, '');
    return buildAgentCellModifiedFileChanges({
      statusFiles: statusByPath,
      cellId: selectedCellId,
    })
      .filter((entry) => String(entry?.status || '').toLowerCase() !== 'ignored')
      .map((entry) => ({
        ...entry,
        absolutePath: baseRoot && entry?.relativePath ? `${baseRoot}/${entry.relativePath}` : '',
      }));
  }, [rootPath, scopeRootPath, selectedCell?.worktreePath, selectedCellId, statusByPath]);

  const selectionSet = useMemo(() => new Set(selectedPaths), [selectedPaths]);
  const openFiles = useMemo(() => new Set(Object.keys(workbenchMeta || {})), [workbenchMeta]);
  const dirtyFiles = useMemo(() => 
    new Set(Object.entries(workbenchMeta || {}).filter(([, m]: any) => m?.dirty).map(([p]: any) => p)), 
    [workbenchMeta]
  );

  useExplorerPersistedUiState({
    stateKey: explorerStateKey,
    listRef,
    expandedPaths,
    selectedPaths,
    focusedPath,
    scrollTop,
    expandPath,
    setSelectedPaths,
    setFocusedPath,
  });

  useEffect(() => {
    let cancelled = false;
    const nextRoot = scopeRootPath || rootPath || repoRoot;
    if (!nextRoot) {
      setProjectPolicy(null);
      return undefined;
    }
    const loadPolicy = async () => {
      try {
        const response = await getExplorerProjectPolicy({ rootPath: nextRoot });
        if (!cancelled) {
          setProjectPolicy(response?.policy || null);
        }
      } catch (_error) {
        if (!cancelled) {
          setProjectPolicy(null);
        }
      }
    };
    void loadPolicy();
    return () => {
      cancelled = true;
    };
  }, [repoRoot, rootPath, scopeRootPath]);

  useExplorerCapabilityPreferences({
    stateKey: explorerStateKey,
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
  });

  useDismissibleLayer({
    open: filterMenuOpen,
    onDismiss: () => setFilterMenuOpen(false),
    refs: filterLayerRefs,
  });

  const updateFilterMenuPosition = useCallback(() => {
    const sidebar = sidebarRef.current;
    const menu = filterMenuRef.current;
    const trigger = filterMenuButtonRef.current;
    if (!sidebar || !menu || !trigger) {
      return;
    }
    const sidebarRect = sidebar.getBoundingClientRect();
    const triggerRect = trigger.getBoundingClientRect();
    const menuWidth = menu.offsetWidth || 224;
    const gap = 6;
    const edgePadding = 8;
    const maxLeft = Math.max(edgePadding, sidebarRect.width - menuWidth - edgePadding);
    const nextLeft = Math.min(
      Math.max(triggerRect.right - sidebarRect.left - menuWidth, edgePadding),
      maxLeft
    );
    const nextTop = triggerRect.bottom - sidebarRect.top + gap;
    setFilterMenuPosition({ top: Math.round(nextTop), left: Math.round(nextLeft) });
  }, []);

  useLayoutEffect(() => {
    if (!filterMenuOpen) {
      setFilterMenuPosition(null);
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      updateFilterMenuPosition();
    });

    const handleWindowChange = () => updateFilterMenuPosition();
    window.addEventListener('resize', handleWindowChange);

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => updateFilterMenuPosition());
      if (sidebarRef.current) {
        observer.observe(sidebarRef.current);
      }
      if (filterMenuButtonRef.current) {
        observer.observe(filterMenuButtonRef.current);
      }
      if (filterMenuRef.current) {
        observer.observe(filterMenuRef.current);
      }
    }

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener('resize', handleWindowChange);
      observer?.disconnect();
    };
  }, [filterMenuOpen, updateFilterMenuPosition]);

  useEffect(() => {
    if (!filterMenuOpen) {
      return;
    }
    const frameId = window.requestAnimationFrame(() => {
      filterMenuRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [filterMenuOpen]);

  useLayoutEffect(() => {
    const node = listRef.current;
    if (!node) {
      return undefined;
    }
    const measure = () => setViewportHeight(node.clientHeight || 0);
    measure();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure);
      return () => window.removeEventListener('resize', measure);
    }
    const observer = new ResizeObserver(() => measure());
    observer.observe(node);
    return () => observer.disconnect();
  }, [workingSetViewId, searchMode]);

  useEffect(() => {
    if (searchMode !== EXPLORER_SEARCH_MODE_PATH || workingSetViewId !== 'tree') {
      setFilterMenuOpen(false);
    }
  }, [searchMode, workingSetViewId]);

  useEffect(() => {
    const availableRuleIds = new Set(
      (Array.isArray(semanticRules) ? semanticRules : [])
        .map((rule: any) => String(rule?.id || '').trim())
        .filter(Boolean)
    );
    setSemanticFilters((current) => current.filter((id) => availableRuleIds.has(id)));
  }, [semanticRules]);

  const getScopedEntry = useCallback((entry, type) => {
    if (!entry || !selectedCellId || !entry.cells?.[selectedCellId]) return entry;
    const cellInfo = entry.cells[selectedCellId];
    if (!cellInfo) return entry;
    if (type === 'dir') {
      const status = pickPrimaryStatus(cellInfo.statusCounts || {});
      return { ...entry, status, added: cellInfo.added || 0, deleted: cellInfo.deleted || 0 };
    }
    return { ...entry, status: cellInfo.status || entry.status, added: cellInfo.added || 0, deleted: cellInfo.deleted || 0 };
  }, [selectedCellId]);

  const ignoredPaths = useMemo(() => {
    const paths = new Set();
    Object.entries(statusByPath || {}).forEach(([p, e]: any) => { if (e?.status === 'ignored') paths.add(p); });
    return paths;
  }, [statusByPath]);

  const isPathIgnored = useCallback((targetPath) => {
    if (!targetPath) return false;
    if (ignoredPaths.has(targetPath)) return true;
    const parts = targetPath.split('/').filter(Boolean);
    for (let i = parts.length - 1; i > 0; i--) {
      if (ignoredPaths.has(parts.slice(0, i).join('/'))) return true;
    }
    return false;
  }, [ignoredPaths]);

  const matchesSemanticFilter = useCallback((targetPath) => {
    if (!hasSemanticFilters) {
      return true;
    }
    const tags = Array.isArray(semanticTagsByPath?.[targetPath]) ? semanticTagsByPath[targetPath] : [];
    return tags.some((tag: any) => semanticFilterSet.has(String(tag?.id || '')));
  }, [hasSemanticFilters, semanticFilterSet, semanticTagsByPath]);

  const visibleItems = useMemo(
    () =>
      buildExplorerVisibleItems({
        tree: {
          nodes: tree.nodes,
          children: tree.children,
        },
        expandedPaths,
        isSearchActive: isPathSearchActive,
        showHidden,
        showIgnored,
        draftEntry: draftEntry?.parentPath
          ? { parentPath: draftEntry.parentPath, type: draftEntry.type }
          : null,
        folderStatusByPath,
        statusByPath,
        getScopedEntry,
        hasChangeFilter,
        hasStatusFilters,
        statusFilterSet,
        matchesSemanticFilter,
        isPathIgnored,
      }),
    [
      draftEntry,
      expandedPaths,
      folderStatusByPath,
      getScopedEntry,
      hasChangeFilter,
      hasStatusFilters,
      isPathIgnored,
      isPathSearchActive,
      matchesSemanticFilter,
      showHidden,
      showIgnored,
      statusByPath,
      statusFilterSet,
      tree.children,
      tree.nodes,
    ]
  );
  const visiblePaths = useMemo(() => visibleItems.filter(it => !it.draft).map(it => it.path), [visibleItems]);
  const rowIndexByPath = useMemo(() => {
    const map = new Map();
    visibleItems.forEach((it, i) => { if (!it.draft) map.set(it.path, i); });
    return map;
  }, [visibleItems]);
  const scrollToPath = useCallback((p) => {
    const el = listRef.current;
    const idx = rowIndexByPath.get(p);
    if (!el || idx == null) return false;
    const top = idx * ROW_HEIGHT;
    if (top < el.scrollTop) el.scrollTop = top;
    else if (top + ROW_HEIGHT > el.scrollTop + el.clientHeight) el.scrollTop = top + ROW_HEIGHT - el.clientHeight;
    return true;
  }, [rowIndexByPath]);

  const selectPathInExplorer = useCallback((targetPath) => {
    const normalizedPath = explorerPathUtils.toRelativePath(targetPath || '');
    if (!normalizedPath) {
      return;
    }
    handleSelectPath(normalizedPath);
    setFocusedPath(normalizedPath);
    requestAnimationFrame(() => {
      if (!scrollToPath(normalizedPath)) {
        requestAnimationFrame(() => scrollToPath(normalizedPath));
      }
    });
  }, [handleSelectPath, scrollToPath]);

  const expandAncestorsForPath = useCallback(async (targetPath, shouldCancel?: () => boolean) => {
    const normalizedPath = explorerPathUtils.toRelativePath(targetPath || '');
    if (!normalizedPath) {
      return false;
    }
    const parts = normalizedPath.split('/').filter(Boolean);
    let current = '';
    for (let i = 0; i < parts.length - 1; i += 1) {
      current = [current, parts[i]].filter(Boolean).join('/');
      await expandPath(current);
      if (shouldCancel?.()) {
        return false;
      }
    }
    return true;
  }, [expandPath]);

  useEffect(() => { visiblePathsRef.current = visiblePaths; }, [visiblePaths]);
  useEffect(() => { const i = setInterval(() => setNow(Date.now()), 5000); return () => clearInterval(i); }, []);

  useEffect(() => {
    if (!revealRequest?.path) {
      return;
    }
    const normalizeRoot = (value) =>
      String(value || '')
        .replace(/\\/g, '/')
        .replace(/\/+$/, '');
    const requestedRoot = normalizeRoot(revealRequest.rootPath);
    const currentRoot = normalizeRoot(scopeRootPath || rootPath || repoRoot);
    if (requestedRoot && currentRoot && requestedRoot !== currentRoot) {
      return;
    }
    const targetPath = explorerPathUtils.toRelativePath(revealRequest.path);
    if (!targetPath) {
      onRevealHandled?.();
      return;
    }
    let cancelled = false;
    const run = async () => {
      const expanded = await expandAncestorsForPath(targetPath, () => cancelled);
      if (!expanded || cancelled) {
        return;
      }
      selectPathInExplorer(targetPath);
      if (!cancelled) {
        onRevealHandled?.();
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [
    expandAncestorsForPath,
    onRevealHandled,
    repoRoot,
    revealRequest,
    rootPath,
    selectPathInExplorer,
    scopeRootPath,
  ]);

  const handleOpenEntry = useCallback(async (targetPath, mode = 'preview', line?: number) => {
    const normalizedPath = explorerPathUtils.toRelativePath(targetPath || '');
    if (!normalizedPath) {
      return false;
    }
    try {
      const result = await openEntry({ targetPath: normalizedPath });
      const resolvedPath = explorerPathUtils.toRelativePath(result?.path || normalizedPath);
      if (!resolvedPath) {
        return false;
      }
      onOpenFile?.({ path: resolvedPath, mode, line });
      clearError();
      return true;
    } catch (err) {
      setErrorMessage(err?.message || 'Failed to open file.');
      return false;
    }
  }, [clearError, onOpenFile, openEntry, setErrorMessage]);

  const {
    changesPanelPreview,
    changesPanelRefreshing,
    changesPanelUpdatedAt,
    refreshChangesPanel,
    clearChangesPanelPreview,
    handleOpenChangedEntry,
    handleRevealChangedEntry,
    handlePreviewChangedEntry,
    handleChangeEntryDragStart,
  } = useExplorerChangedFilesActions({
    rootPath,
    scopeRootPath,
    selectedCellWorktreePath: String(selectedCell?.worktreePath || ''),
    selectedCellId,
    isPanelOpen: workingSetViewId === EXPLORER_WORKING_SET_CHANGED_FILES,
    changedPanelEntries,
    refreshAll,
    selectPathInExplorer,
    handleOpenEntry,
    expandAncestorsForPath,
    revealEntry,
    clearError,
    setErrorMessage,
  });

  // Handlers
  const closeContextMenu = () => setContextMenu(null);
  const activeTarget = contextMenu?.path || selectedPaths[0] || '';
  const activeNode = tree.nodes[activeTarget];
  const activeDir = activeNode?.type === 'dir' ? activeTarget : explorerPathUtils.dirname(activeTarget);
  const selectionTargets = selectedPaths.length ? selectedPaths : activeTarget ? [activeTarget] : [];
  const selectionCount = selectionTargets.length;
  const workingSetOptions = useMemo(() => getImplementedExplorerWorkingSets(), []);
  const contentScopeOptions = useMemo(
    () =>
      EXPLORER_CONTENT_SCOPE_OPTIONS.map((option) => ({
        ...option,
        disabled:
          option.id === EXPLORER_CONTENT_SCOPE_SELECTION ? selectionCount === 0 : false,
      })),
    [selectionCount]
  );
  const contentSearchScope = useMemo(() => {
    if (contentScopeKind === EXPLORER_CONTENT_SCOPE_SELECTION) {
      return {
        kind: EXPLORER_CONTENT_SCOPE_SELECTION,
        paths: selectionTargets,
      };
    }
    if (contentScopeKind === EXPLORER_CONTENT_SCOPE_FOLDER) {
      return {
        kind: EXPLORER_CONTENT_SCOPE_FOLDER,
        path: activeNode?.type === 'dir' ? activeTarget : activeDir,
      };
    }
    return { kind: EXPLORER_CONTENT_SCOPE_PROJECT };
  }, [activeDir, activeNode?.type, activeTarget, contentScopeKind, selectionTargets]);

  const {
    query: contentSearchQuery,
    setQuery: setContentSearchQuery,
    replaceText,
    setReplaceText,
    results: contentSearchResults,
    loading: contentSearchLoading,
    replacing: contentSearchReplacing,
    error: contentSearchError,
    truncated: contentSearchTruncated,
    scannedFiles: contentSearchScannedFiles,
    skippedBinaryCount: contentSearchSkippedBinaryCount,
    skippedLargeCount: contentSearchSkippedLargeCount,
    applyReplace: applyContentReplace,
  } = useExplorerContentSearch({
    rootPath,
    enabled: searchMode === EXPLORER_SEARCH_MODE_CONTENT,
    scope: contentSearchScope,
    caseSensitive: contentCaseSensitive,
    wholeWord: contentWholeWord,
    useRegex: contentUseRegex,
  });

  const handleApplyContentReplace = useCallback(async () => {
    const totalFiles = contentSearchResults.length;
    const totalMatches = contentSearchResults.reduce(
      (sum, entry) => sum + Number(entry?.matchCount || 0),
      0
    );
    const confirmed = await modal.confirm({
      title: 'Replace Across Files',
      tone: 'warning',
      confirmLabel: 'Apply Replace',
      description: `Replace ${JSON.stringify(contentSearchQuery.trim())} with ${JSON.stringify(
        replaceText
      )} across ${totalFiles} files and ${totalMatches} matches in the current content-search scope?`,
    });
    if (!confirmed) {
      return;
    }
    const response = await applyContentReplace({
      confirmedPaths: contentSearchResults.map((entry) => entry.path),
    });
    if (response) {
      await refreshAll({ forceStatus: true, reloadExpanded: true });
      await refreshChangesPanel();
    }
  }, [
    applyContentReplace,
    contentSearchQuery,
    contentSearchResults,
    modal,
    refreshAll,
    refreshChangesPanel,
    replaceText,
  ]);

  const {
    canPaste,
    handleCopySelection,
    handlePasteSelection,
    handlePasteMarkdown,
    handleCopyPath,
    handleCopyRelativePath,
  } = useExplorerClipboardActions({
    rootPath,
    repoRoot,
    activeTarget,
    treeNodes: tree.nodes,
    selectionTargets,
    setSelectedPaths,
    expandPath,
    refreshAll,
    renameEntry,
    copyEntry,
    clearError,
    setErrorMessage,
    openEntry: handleOpenEntry,
  });

  const {
    startDraft,
    handleDraftSubmit,
    handleRenameSubmit,
    handleDelete,
    handleDuplicate,
    handleReveal,
    handleMove,
    requestRename,
  } = useExplorerEntryMutations({
    activeDir,
    draftEntry,
    renameTarget,
    modal,
    expandPath,
    setDraftEntry,
    setRenameTarget,
    createEntry,
    renameEntry,
    deleteEntry,
    copyEntry,
    revealEntry,
    refreshAll,
    clearError,
    setErrorMessage,
    setSelectedPaths,
  });

  const handleExternalImport = useExplorerExternalImport({
    importExternalEntries,
    expandAncestorsForPath,
    selectPathInExplorer,
    setErrorMessage,
    clearError,
  });

  const {
    handleRowDragOver,
    handleRowDrop,
    handleTreeDragOver,
    handleTreeDrop,
    handleSidebarDragOver,
    handleSidebarDrop,
  } = useExplorerDropHandlers({
    treeNodes: tree.nodes,
    focusedPath,
    onMoveEntries: handleMove,
    onImportExternalEntries: handleExternalImport,
    setErrorMessage,
  });

  const toggleDescriptor = useCallback((descriptorId: string) => {
    if (descriptorId === EXPLORER_FILTER_VISIBILITY_HIDDEN) {
      setShowHidden((current) => !current);
      return;
    }
    if (descriptorId === EXPLORER_FILTER_VISIBILITY_IGNORED) {
      setShowIgnored((current) => !current);
      return;
    }
    if (descriptorId === EXPLORER_FILTER_VISIBILITY_CHANGES_ONLY) {
      setShowChangesOnly((current) => !current);
    }
  }, [setShowChangesOnly, setShowHidden, setShowIgnored]);
  const toggleStatusFilter = (s) => setStatusFilters(curr => curr.includes(s) ? curr.filter(it => it !== s) : [...curr, s]);
  const toggleSemanticFilter = (id) => setSemanticFilters((curr) => (
    curr.includes(id) ? curr.filter((it) => it !== id) : [...curr, id]
  ));
  const handleLocateSemanticRule = useCallback(async (ruleId) => {
    const normalizedRuleId = String(ruleId || '').trim();
    if (!normalizedRuleId) {
      return;
    }
    const allTaggedPaths = Object.keys(semanticTagsByPath || {}).filter((path) => {
      const tags = Array.isArray(semanticTagsByPath?.[path]) ? semanticTagsByPath[path] : [];
      return tags.some((tag: any) => String(tag?.id || '') === normalizedRuleId);
    });
    if (!allTaggedPaths.length) {
      setErrorMessage(`No files found for semantic rule "${normalizedRuleId}".`);
      return;
    }
    const preferredPath = visiblePaths.find((path) => allTaggedPaths.includes(path));
    const targetPath = preferredPath || allTaggedPaths[0];
    const expanded = await expandAncestorsForPath(targetPath);
    if (!expanded) {
      return;
    }
    selectPathInExplorer(targetPath);
    setFilterMenuOpen(false);
    clearError();
  }, [clearError, expandAncestorsForPath, semanticTagsByPath, selectPathInExplorer, setErrorMessage, visiblePaths]);
  const handleOpenContentResult = useCallback(
    async (targetPath, line?: number) => {
      await expandAncestorsForPath(targetPath);
      selectPathInExplorer(targetPath);
      await handleOpenEntry(targetPath, 'pinned', line);
    },
    [expandAncestorsForPath, handleOpenEntry, selectPathInExplorer]
  );
  const handleRevealContentResult = useCallback(
    async (targetPath) => {
      await expandAncestorsForPath(targetPath);
      selectPathInExplorer(targetPath);
    },
    [expandAncestorsForPath, selectPathInExplorer]
  );
  const headerSearchQuery =
    searchMode === EXPLORER_SEARCH_MODE_CONTENT ? contentSearchQuery : searchQuery;
  const setHeaderSearchQuery = useCallback(
    (value: string) => {
      if (searchMode === EXPLORER_SEARCH_MODE_CONTENT) {
        setContentSearchQuery(value);
        return;
      }
      setSearchQuery(value);
    },
    [searchMode, setContentSearchQuery, setSearchQuery]
  );
  const clearHeaderSearch = useCallback(() => {
    setHeaderSearchQuery('');
  }, [setHeaderSearchQuery]);
  const headerCommandContext = useMemo(
    () => ({
      selectionTargets,
      canPaste,
      hasResearchLane: projectPolicy?.research?.enabled !== false,
      actions: {
        onJumpToAgents,
        onNewFile: () => startDraft('file'),
        onNewFolder: () => startDraft('dir'),
        onRefresh: () => refreshAll({ forceStatus: true, reloadExpanded: true }),
        onToggleResearchLane: () => setResearchLaneOpen((current) => !current),
      },
    }),
    [canPaste, onJumpToAgents, projectPolicy?.research?.enabled, refreshAll, selectionTargets, startDraft]
  );
  const headerCommands = useMemo(
    () =>
      getExplorerCommandsForSurface('header', headerCommandContext).map((command) => ({
        ...command,
        spinning: command.id === 'explorer.refresh' && loadingPaths.size > 0,
      })),
    [headerCommandContext, loadingPaths.size]
  );
  const contextMenuCommandContext = useMemo(
    () => ({
      selectionTargets,
      canPaste,
      actions: {
        onNewFile: () => startDraft('file'),
        onNewFolder: () => startDraft('dir'),
        onRename: () =>
          setRenameTarget({
            path: selectionTargets[0],
            value: explorerPathUtils.basename(selectionTargets[0]),
          }),
        onDuplicate: () => handleDuplicate(selectionTargets[0]),
        onCopy: () => handleCopySelection('copy'),
        onCopyRelativePath: () => handleCopyRelativePath(selectionTargets),
        onCopyAbsolutePath: () => handleCopyPath(selectionTargets),
        onCut: () => handleCopySelection('cut'),
        onPaste: () => handlePasteSelection(),
        onPasteMarkdown: () => handlePasteMarkdown(),
        onReveal: () => handleReveal(selectionTargets),
        onAddComment: () => onAddComment?.(selectionTargets[0]),
        onDelete: () => handleDelete(selectionTargets),
      },
    }),
    [
      canPaste,
      handleCopyPath,
      handleCopyRelativePath,
      handleCopySelection,
      handleDelete,
      handleDuplicate,
      handlePasteMarkdown,
      handlePasteSelection,
      handleReveal,
      onAddComment,
      selectionTargets,
      startDraft,
    ]
  );
  const contextMenuCommands = useMemo(
    () => getExplorerCommandsForSurface('context_menu', contextMenuCommandContext),
    [contextMenuCommandContext]
  );
  const renderNodeRow = (item) => {
    if (item.draft) {
      return <ExplorerItem key={item.path} item={{ ...item, onBlur: handleDraftSubmit, onKeyDown: (e) => { if (e.key === 'Enter') handleDraftSubmit(); if (e.key === 'Escape') setDraftEntry(null); }, onChange: (e) => setDraftEntry(prev => ({ ...prev, value: e.target.value })), value: draftEntry?.value || '' }} />;
    }
    const node = tree.nodes[item.path];
    if (!node) return null;
    const isDir = node.type === 'dir';
    const entry = getScopedEntry(isDir ? folderStatusByPath[item.path] : statusByPath[item.path], isDir ? 'dir' : 'file');
    const isRenaming = renameTarget?.path === item.path;
    const sorted = Object.values((entry?.cells || {}) as Record<string, any>).sort((a: any, b: any) => (b.added + b.deleted) - (a.added + a.deleted));
    const cellBadges = sorted.length > 0 && (
        <div className="flex items-center gap-1 pr-0.5 opacity-70 transition-opacity group-hover:opacity-95">
            <span
              key={sorted[0].id}
              className="text-[8px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/60"
              title={`Attributed to ${sorted[0].name}`}
            >
              {sorted[0].name}
            </span>
            {sorted.length > 1 && <span className="text-[8px] font-semibold text-muted-foreground/[0.45]">+{sorted.length - 1}</span>}
        </div>
    );

    return (
      <ExplorerItem
        key={item.path}
        item={item}
        node={node}
        treeItemId={getExplorerTreeItemId(item.path)}
        isSelected={selectionSet.has(item.path)}
        isFocused={focusedPath === item.path}
        isLoading={loadingPaths.has(item.path)}
        isExpanded={expandedPaths.has(item.path) || isPathSearchActive} isOpen={!isDir && openFiles.has(item.path)}
        isDirty={!isDir && dirtyFiles.has(item.path)} isIgnored={isPathIgnored(item.path)} status={entry?.status} added={entry?.added} deleted={entry?.deleted}
        semanticTags={semanticTagsByPath?.[item.path] || []}
        commentCount={!isDir ? (commentCountsByPath?.[item.path] || 0) : 0}
        onJumpToComments={onJumpToComments}
        cellBadges={cellBadges} depth={item.depth} onToggle={() => togglePath(item.path)}
        onClick={isRenaming ? undefined : (e) => { handleSelectPath(item.path, e); setFocusedPath(item.path); listRef.current?.focus(); if (!isDir && !e.metaKey && !e.ctrlKey && !e.shiftKey) { void handleOpenEntry(item.path, 'preview'); } }}
        onDoubleClick={isRenaming ? undefined : (e) => { if (!isDir) { e.stopPropagation(); void handleOpenEntry(item.path, 'pinned'); } }}
        onContextMenu={isRenaming ? undefined : (e) => { e.preventDefault(); handleSelectPath(item.path, e); setFocusedPath(item.path); setContextMenu({ x: e.clientX, y: e.clientY, path: item.path }); }}
        onDragStart={isRenaming ? undefined : (event) => {
          const payload = buildExplorerInternalDragPayload(item.path, selectionSet);
          writeExplorerInternalDragPaths(event.dataTransfer, payload);
        }}
        onDragOver={(e) => handleRowDragOver(e, item.path, isDir)}
        onDrop={(e) => handleRowDrop(e, item.path, isDir)}
        renameTarget={renameTarget?.path === item.path ? renameTarget : null} handleRenameSubmit={handleRenameSubmit} setRenameTarget={setRenameTarget}
      />
    );
  };

  const shouldVirtualize = visibleItems.length > VIRTUALIZE_THRESHOLD;
  const totalHeight = visibleItems.length * ROW_HEIGHT;
  const startIndex = shouldVirtualize ? Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN) : 0;
  const endIndex = shouldVirtualize ? Math.min(visibleItems.length, Math.ceil((scrollTop + viewportHeight) / ROW_HEIGHT) + OVERSCAN) : visibleItems.length;
  const visibleSlice = visibleItems.slice(startIndex, endIndex);
  const offsetY = startIndex * ROW_HEIGHT;

  const handleKeyDown = (event) => {
    if (event.target?.tagName === 'INPUT' || event.target?.isContentEditable || !visiblePathsRef.current.length) return;
    if ((event.metaKey || event.ctrlKey) && !event.shiftKey && !event.altKey) {
      const key = event.key.toLowerCase();
      if (key === 'c') { event.preventDefault(); handleCopySelection('copy'); return; }
      if (key === 'x') { event.preventDefault(); handleCopySelection('cut'); return; }
      if (key === 'v') { event.preventDefault(); handlePasteSelection(); return; }
    }
    const curIdx = visiblePathsRef.current.indexOf(focusedPath);
    const next = (d) => visiblePathsRef.current[Math.min(visiblePathsRef.current.length - 1, Math.max(0, (curIdx >= 0 ? curIdx : 0) + d))];
    if (event.key === 'ArrowDown') { event.preventDefault(); const n = next(1); if (n) { handleSelectPath(n, { shiftKey: event.shiftKey }); setFocusedPath(n); scrollToPath(n); } }
    if (event.key === 'ArrowUp') { event.preventDefault(); const n = next(-1); if (n) { handleSelectPath(n, { shiftKey: event.shiftKey }); setFocusedPath(n); scrollToPath(n); } }
    if (event.key === 'ArrowRight') { event.preventDefault(); if (tree.nodes[focusedPath]?.type === 'dir') { if (!expandedPaths.has(focusedPath)) togglePath(focusedPath); else { const first = (tree.children[focusedPath] || [])[0]; if (first) { handleSelectPath(first, { shiftKey: event.shiftKey }); setFocusedPath(first); scrollToPath(first); } } } } 
    if (event.key === 'ArrowLeft') { event.preventDefault(); if (tree.nodes[focusedPath]?.type === 'dir' && expandedPaths.has(focusedPath)) togglePath(focusedPath); else { const p = explorerPathUtils.dirname(focusedPath); if (p !== focusedPath && p !== undefined) { handleSelectPath(p, { shiftKey: event.shiftKey }); setFocusedPath(p); scrollToPath(p); } } }
    if (event.key === 'Enter') { event.preventDefault(); if (tree.nodes[focusedPath]?.type === 'dir') togglePath(focusedPath); else if (focusedPath) { void handleOpenEntry(focusedPath, 'pinned'); } }
    if (event.key === 'F2' && focusedPath) { event.preventDefault(); requestRename(focusedPath); }
    if ((event.key === 'Delete' || event.key === 'Backspace') && selectionTargets.length) { event.preventDefault(); handleDelete(selectionTargets); }
  };

  const focusedTreeItemId =
    focusedPath && visiblePaths.includes(focusedPath)
      ? getExplorerTreeItemId(focusedPath)
      : undefined;
  const emptyStateMessage = searchQuery.trim()
    ? 'No files match the current search.'
    : hasActiveFilters
      ? 'No files match the current filters.'
      : 'No files to display.';

  return (
    <aside
      ref={sidebarRef}
      className="relative flex h-full w-full flex-col bg-sidebar select-none"
      onDragOver={handleSidebarDragOver}
      onDrop={handleSidebarDrop}
    >
      <ExplorerHeader
        activeRootLabel={activeRootLabel}
        activeFilterCount={activeFilterCount}
        activeFilterSummary={activeFilterSummary}
        headerCommands={headerCommands}
        hasCells={hasCells}
        cells={cells}
        selectedId={selectedId}
        onSelectCell={onSelectCell}
        workingSetOptions={workingSetOptions}
        activeWorkingSetViewId={workingSetViewId}
        onWorkingSetChange={setWorkingSetViewId}
        searchMode={searchMode}
        searchModeOptions={EXPLORER_SEARCH_MODE_OPTIONS}
        onSearchModeChange={setSearchMode}
        searchQuery={headerSearchQuery}
        onSearchChange={setHeaderSearchQuery}
        onClearSearch={clearHeaderSearch}
        hasActiveFilters={hasActiveFilters}
        filterMenuOpen={filterMenuOpen}
        filterMenuId={filterMenuId}
        filterMenuButtonRef={filterMenuButtonRef}
        onToggleFilterMenu={() => setFilterMenuOpen((current) => !current)}
        searchTruncated={
          searchMode === EXPLORER_SEARCH_MODE_CONTENT
            ? contentSearchTruncated
            : searchTruncated
        }
      />

      {researchLaneOpen ? (
        <ExplorerResearchLane
          rootPath={rootPath}
          targetDirPath={activeDir}
          allowMemoCapture={projectPolicy?.research?.allowMemoCapture !== false}
          allowMarkdownSave={projectPolicy?.research?.allowMarkdownSave !== false}
          onOpenSavedFile={(path) => {
            void handleOpenEntry(path, 'pinned');
          }}
          onClose={() => setResearchLaneOpen(false)}
        />
      ) : null}

      {filterMenuOpen &&
      searchMode === EXPLORER_SEARCH_MODE_PATH &&
      workingSetViewId === 'tree' ? (
        <ExplorerFilterPanel
          menuId={filterMenuId}
          menuRef={filterMenuRef}
          menuStyle={filterMenuPosition || undefined}
          visibilityDescriptors={EXPLORER_FILTER_DESCRIPTORS.filter(
            (descriptor) => descriptor.group === 'visibility'
          )}
          descriptorStateById={descriptorStateById}
          toggleDescriptor={toggleDescriptor}
          statusFilterSet={statusFilterSet}
          toggleStatusFilter={toggleStatusFilter}
          clearStatusFilters={() => setStatusFilters([])}
          semanticRules={semanticRules}
          semanticFilterSet={semanticFilterSet}
          toggleSemanticFilter={toggleSemanticFilter}
          clearSemanticFilters={() => setSemanticFilters([])}
          onLocateSemanticRule={handleLocateSemanticRule}
        />
      ) : null}

      {error && (
        <div
          role="status"
          aria-live="polite"
          className="mx-2 mt-2 flex items-start gap-2 rounded border border-rose-500/20 bg-rose-500/5 px-3 py-2 text-[11px] text-rose-300 animate-tab-in"
        >
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {searchMode === EXPLORER_SEARCH_MODE_CONTENT ? (
        <ExplorerContentSearchView
          query={contentSearchQuery}
          replaceText={replaceText}
          setReplaceText={setReplaceText}
          scopeOptions={contentScopeOptions}
          activeScopeKind={contentScopeKind}
          onScopeChange={setContentScopeKind}
          caseSensitive={contentCaseSensitive}
          wholeWord={contentWholeWord}
          useRegex={contentUseRegex}
          onToggleCaseSensitive={() => setContentCaseSensitive((current) => !current)}
          onToggleWholeWord={() => setContentWholeWord((current) => !current)}
          onToggleUseRegex={() => setContentUseRegex((current) => !current)}
          results={contentSearchResults}
          loading={contentSearchLoading}
          replacing={contentSearchReplacing}
          truncated={contentSearchTruncated}
          scannedFiles={contentSearchScannedFiles}
          skippedBinaryCount={contentSearchSkippedBinaryCount}
          skippedLargeCount={contentSearchSkippedLargeCount}
          error={contentSearchError}
          onOpenResult={(path, line) => handleOpenContentResult(path, line)}
          onRevealResult={handleRevealContentResult}
          onApplyReplace={handleApplyContentReplace}
        />
      ) : workingSetViewId === EXPLORER_WORKING_SET_CHANGED_FILES ? (
        <ExplorerWorkingSetView
          title="Changed Files"
          subtitle={selectedCell?.name || selectedCellId || 'Selected Cell'}
          entries={changedPanelEntries}
          mode={workingSetMode}
          refreshing={changesPanelRefreshing}
          updatedAt={changesPanelUpdatedAt}
          preview={changesPanelPreview}
          onRefresh={refreshChangesPanel}
          onModeChange={setWorkingSetMode}
          onOpenEntry={(entry) => handleOpenChangedEntry(entry, { mode: 'preview' })}
          onRevealEntry={handleRevealChangedEntry}
          onPreviewEntry={handlePreviewChangedEntry}
          onDragEntry={handleChangeEntryDragStart}
          onClearPreview={clearChangesPanelPreview}
        />
      ) : (
        <div
          ref={listRef}
          data-testid="explorer-tree"
          role="tree"
          aria-label={`${activeRootLabel} file tree`}
          aria-multiselectable="true"
          aria-activedescendant={focusedTreeItemId}
          aria-busy={loadingPaths.size > 0}
          className="flex-1 overflow-y-auto px-1 py-2 scrollbar-hide focus:outline-none focus-visible:ring-1 focus-visible:ring-primary/20 focus-visible:ring-inset"
          tabIndex={0}
          onClick={() => closeContextMenu()}
          onKeyDown={handleKeyDown}
          onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
          onDragOver={handleTreeDragOver}
          onDrop={handleTreeDrop}
        >
          {visibleItems.length === 0 ? (
            <div className="px-3 py-2 text-xs text-muted-foreground/70">{emptyStateMessage}</div>
          ) : (
            <div style={{ height: totalHeight, position: 'relative' }}>
              <div style={{ transform: `translateY(${offsetY}px)` }}>
                {visibleSlice.map((it) => renderNodeRow(it))}
              </div>
            </div>
          )}
        </div>
      )}

      <ExplorerFooter
        selectionCount={selectionCount}
        selectionTargets={selectionTargets}
        nodesByPath={nodesByPath}
        statusByPath={statusByPath}
        folderStatusByPath={folderStatusByPath}
        onCopyPaths={() => handleCopyPath(selectionTargets)}
        onDeleteSelection={() => handleDelete(selectionTargets)}
        onClearSelection={clearSelection}
        activeCell={selectedCell}
        sessions={sessions}
        activeSessionId={activeSessionId}
        sessionActivityByKey={sessionActivityByKey}
        now={now}
        onDispatchFeed={onDispatchFeed}
        explorerDeliverySummary={explorerDeliverySummary}
        onOpenDeliveryTimeline={onOpenDeliveryTimeline}
        onToggleSessionMap={onToggleSessionMap}
        sessionMapOpen={sessionMapOpen}
      />

      {contextMenu && (
        <ExplorerContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={closeContextMenu}
          selectionCount={selectionCount}
          commands={contextMenuCommands}
        />
      )}
    </aside>
  );
}

export function ProjectExplorerSidebar({
  rootPath: scopeRootPath, rootLabel: scopeRootLabel, cells, selectedId, onSelectCell, selectedCell,
  sessions, activeSessionId, sessionActivityByKey, onOpenFile, onJumpToAgents, workbenchMeta,
  onDispatchFeed, explorerDeliverySummary, onOpenDeliveryTimeline, onAddComment, commentCountsByPath, onJumpToComments, onToggleSessionMap, sessionMapOpen,
  revealRequest, onRevealHandled,
  projectReady, projectError, onSelectProject, recentProjects, onOpenRecentProject,
}: any) {
  if (!projectReady) {
    return (
      <aside className="flex w-full flex-col text-sidebar-foreground" data-testid="explorer-sidebar">
        <div className="flex items-center justify-between px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <span>Explorer</span>
        </div>
        <div className="flex-1 px-4 py-6 text-xs text-muted-foreground">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground/70">No project selected</div>
          <div className="mt-2 text-sm text-foreground">Choose a project to browse files.</div>
          {projectError && <div className="mt-2 text-rose-300">{projectError}</div>}
          <button type="button" onClick={onSelectProject} className="mt-4 inline-flex items-center gap-2 rounded-full border border-primary/40 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-primary transition-colors hover:bg-primary/10">Select Project</button>
          <RecentProjectsList projects={recentProjects} onOpen={onOpenRecentProject} title="Recent Projects" emptyLabel="No recent projects yet" />
        </div>
      </aside>
    );
  }

  return (
    <ProjectExplorerSidebarContent
      rootPath={scopeRootPath}
      rootLabel={scopeRootLabel}
      cells={cells}
      selectedId={selectedId}
      onSelectCell={onSelectCell}
      selectedCell={selectedCell}
      sessions={sessions}
      activeSessionId={activeSessionId}
      sessionActivityByKey={sessionActivityByKey}
      onOpenFile={onOpenFile}
      onJumpToAgents={onJumpToAgents}
      workbenchMeta={workbenchMeta}
      onDispatchFeed={onDispatchFeed}
      explorerDeliverySummary={explorerDeliverySummary}
      onOpenDeliveryTimeline={onOpenDeliveryTimeline}
      onAddComment={onAddComment}
      commentCountsByPath={commentCountsByPath}
      onJumpToComments={onJumpToComments}
      onToggleSessionMap={onToggleSessionMap}
      sessionMapOpen={sessionMapOpen}
      revealRequest={revealRequest}
      onRevealHandled={onRevealHandled}
    />
  );
}
