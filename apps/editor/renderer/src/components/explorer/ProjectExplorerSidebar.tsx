import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { useProjectExplorer, explorerPathUtils } from '../../hooks/useProjectExplorer';
import { RecentProjectsList } from '../RecentProjectsList';
import { ExplorerContextMenu } from './ExplorerContextMenu';
import { ExplorerItem } from './ExplorerItem';
import { ExplorerHeader } from './ExplorerHeader';
import { ExplorerFilterPanel } from './ExplorerFilterPanel';
import { ExplorerFooter } from './ExplorerFooter';
import { 
  pickPrimaryStatus, 
} from './explorerUtils';
import { buildAgentCellModifiedFileChanges } from '../../utils/agentCellFileChanges';
import { setFileDragPayload } from '../../utils/fileDragPayload';
import { buildExplorerVisibleItems } from './explorerVisibleItems';
import {
  ExplorerChangedFilesPanel,
  type ExplorerChangedFilesPanelMode,
} from './ExplorerChangedFilesPanel';
import { useExplorerClipboardActions } from './useExplorerClipboardActions';
import { useExplorerDropHandlers } from './useExplorerDropHandlers';
import { useExplorerPersistedUiState } from './useExplorerPersistedUiState';
import {
  buildExplorerInternalDragPayload,
  writeExplorerInternalDragPaths,
} from './explorerInternalDragPaths';
import { useFileSnippetPreview } from '../../hooks/useFileSnippetPreview';

const ROW_HEIGHT = 24;
const OVERSCAN = 6;
const VIRTUALIZE_THRESHOLD = 200;

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
  const listRef = useRef<HTMLDivElement | null>(null);
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
  const [showIgnored, setShowIgnored] = useState(false);
  const [statusFilters, setStatusFilters] = useState([]);
  const [semanticFilters, setSemanticFilters] = useState([]);
  const [focusedPath, setFocusedPath] = useState('');
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [changesPanelOpen, setChangesPanelOpen] = useState(true);
  const [changesPanelMode, setChangesPanelMode] = useState<ExplorerChangedFilesPanelMode>('flat');
  const [changesPanelRefreshing, setChangesPanelRefreshing] = useState(false);
  const [changesPanelUpdatedAt, setChangesPanelUpdatedAt] = useState(0);
  const changesPanelSnippetPreview = useFileSnippetPreview({ defaultContext: 2 });
  const changesPanelPreview = changesPanelSnippetPreview.preview;
  const explorerStateKey = useMemo(() => {
    const base = scopeRootPath || rootPath || repoRoot;
    if (!base) return '';
    return `agency:explorer:${base}`;
  }, [scopeRootPath, rootPath, repoRoot]);

  const statusFilterSet = useMemo(() => new Set(statusFilters), [statusFilters]);
  const semanticFilterSet = useMemo(() => new Set(semanticFilters), [semanticFilters]);
  const isSearchActive = searchQuery.trim().length > 0;
  const tree = isSearchActive ? searchTree : { nodes: nodesByPath, children: childrenByPath };
  const hasStatusFilters = statusFilterSet.size > 0;
  const hasSemanticFilters = semanticFilterSet.size > 0;
  const hasChangeFilter = showChangesOnly || hasStatusFilters;
  const hasSemanticFilter = hasSemanticFilters;
  const hasVisibilityFilters = !showHidden || !showIgnored;
  const hasActiveFilters = hasChangeFilter || hasSemanticFilter || hasVisibilityFilters;

  const activeRootLabel = rootLabel || 'Project';
  const hasCells = cells && cells.length > 0;
  const selectedCellId = selectedCell?.id || null;

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
    setChangesPanelUpdatedAt(Date.now());
  }, [changedPanelEntries, selectedCellId]);

  useEffect(() => {
    changesPanelSnippetPreview.clearPreview();
  }, [changesPanelSnippetPreview, selectedCellId]);

  useEffect(() => {
    if (changesPanelOpen) {
      return;
    }
    changesPanelSnippetPreview.clearPreview();
  }, [changesPanelOpen, changesPanelSnippetPreview]);

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
        isSearchActive,
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
      isSearchActive,
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

  const handleOpenEntry = useCallback(async (targetPath, mode = 'preview') => {
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
      onOpenFile?.({ path: resolvedPath, mode });
      clearError();
      return true;
    } catch (err) {
      setErrorMessage(err?.message || 'Failed to open file.');
      return false;
    }
  }, [clearError, onOpenFile, openEntry, setErrorMessage]);

  const refreshChangesPanel = useCallback(async () => {
    setChangesPanelRefreshing(true);
    try {
      await refreshAll({ forceStatus: true });
      setChangesPanelUpdatedAt(Date.now());
    } finally {
      setChangesPanelRefreshing(false);
    }
  }, [refreshAll]);

  const handleOpenChangedEntry = useCallback(
    async (entry, options: { mode?: 'preview' | 'pinned' } = {}) => {
      const targetPath = explorerPathUtils.toRelativePath(entry?.relativePath || '');
      if (!targetPath) {
        return;
      }

      // Keep the dispatch footer ("pending send") in sync with changed-files interactions.
      selectPathInExplorer(targetPath);

      const mode = options.mode === 'pinned' ? 'pinned' : 'preview';
      const opened = await handleOpenEntry(targetPath, mode);
      if (!opened) {
        return;
      }
      try {
        const expanded = await expandAncestorsForPath(targetPath);
        if (expanded) {
          selectPathInExplorer(targetPath);
        }
      } catch {
        // Ignore selection sync failures; open already succeeded.
      }
    },
    [expandAncestorsForPath, handleOpenEntry, selectPathInExplorer]
  );

  const handleRevealChangedEntry = useCallback(
    async (entry) => {
      const targetPath = explorerPathUtils.toRelativePath(entry?.relativePath || '');
      if (!targetPath) {
        return;
      }

      // Sync footer selection even when only revealing (no open).
      selectPathInExplorer(targetPath);

      try {
        await revealEntry({ targetPath });
        const expanded = await expandAncestorsForPath(targetPath);
        if (expanded) {
          selectPathInExplorer(targetPath);
        }
        clearError();
      } catch (err) {
        setErrorMessage(err?.message || 'Failed to reveal file.');
      }
    },
    [clearError, expandAncestorsForPath, revealEntry, selectPathInExplorer, setErrorMessage]
  );

  const loadChangesPanelPreview = useCallback(
    async (entry) => {
      const targetPath = explorerPathUtils.toRelativePath(entry?.relativePath || '');
      const activeRootPath = selectedCell?.worktreePath || rootPath || scopeRootPath || '';
      if (!targetPath || !activeRootPath) {
        changesPanelSnippetPreview.clearPreview();
        return;
      }

      const line = Number.isFinite(entry?.line) ? Math.max(1, Math.floor(entry.line)) : null;
      await changesPanelSnippetPreview.loadPreview({
        rootPath: activeRootPath,
        targetPath,
        relativePath: targetPath,
        line,
        context: 2,
      });
    },
    [changesPanelSnippetPreview, rootPath, scopeRootPath, selectedCell?.worktreePath]
  );

  const clearChangesPanelPreview = useCallback(() => {
    changesPanelSnippetPreview.clearPreview();
  }, [changesPanelSnippetPreview]);

  const handlePreviewChangedEntry = useCallback(
    async (entry) => {
      await loadChangesPanelPreview(entry);
    },
    [loadChangesPanelPreview]
  );

  const handleChangeEntryDragStart = useCallback((event, entry) => {
    const success = setFileDragPayload(event, entry?.absolutePath || '');
    if (!success) {
      event.preventDefault();
    }
  }, []);

  // Handlers
  const closeContextMenu = () => setContextMenu(null);
  const activeTarget = contextMenu?.path || selectedPaths[0] || '';
  const activeNode = tree.nodes[activeTarget];
  const activeDir = activeNode?.type === 'dir' ? activeTarget : explorerPathUtils.dirname(activeTarget);
  const selectionTargets = selectedPaths.length ? selectedPaths : activeTarget ? [activeTarget] : [];
  const selectionCount = selectionTargets.length;

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

  const startDraft = (type) => { if (activeDir) expandPath(activeDir); setDraftEntry({ type, parentPath: activeDir || '', value: '' }); };
  const handleDraftSubmit = async () => {
    if (!draftEntry?.value) { setDraftEntry(null); return; }
    try { await createEntry({ type: draftEntry.type, parentPath: draftEntry.parentPath, name: draftEntry.value }); clearError(); } 
    catch (err) { setErrorMessage(err?.message || 'Failed to create.'); }
    setDraftEntry(null);
  };

  const handleRenameSubmit = async () => {
    if (!renameTarget?.path || !renameTarget?.value) { setRenameTarget(null); return; }
    const parent = explorerPathUtils.dirname(renameTarget.path);
    const nextPath = [parent, renameTarget.value].filter(Boolean).join('/');
    if (nextPath === renameTarget.path) {
      setRenameTarget(null);
      return;
    }
    try { await renameEntry({ sourcePath: renameTarget.path, targetPath: nextPath }); clearError(); } 
    catch (err) { setErrorMessage('Rename failed.'); }
    setRenameTarget(null);
  };

  const handleDelete = async (targets) => {
    const list = (Array.isArray(targets) ? targets : [targets]).filter(Boolean);
    if (!list.length || !window.confirm(`Delete ${list.length} items?`)) return;
    try {
      for (const t of list) await deleteEntry({ targetPath: t });
      setSelectedPaths(curr => curr.filter(it => !list.includes(it)));
      clearError();
    } catch (err) { setErrorMessage('Delete failed.'); }
  };

  const handleDuplicate = async (targetPath) => {
    const name = explorerPathUtils.basename(targetPath);
    const parent = explorerPathUtils.dirname(targetPath);
    const nextName = window.prompt('Duplicate as:', `${name}-copy`);
    if (!nextName) return;
    try {
      const nextPath = [parent, nextName].filter(Boolean).join('/');
      await copyEntry({ sourcePath: targetPath, targetPath: nextPath });
      await refreshAll();
    } catch (err) { setErrorMessage('Duplicate failed.'); }
  };

  const handleReveal = async (targets) => {
    const list = (Array.isArray(targets) ? targets : [targets]).filter(Boolean);
    try { for (const t of list) await revealEntry({ targetPath: t }); } 
    catch (err) {}
  };

  const handleMove = async (paths, targetDir) => {
    try {
      let didMove = false;
      for (const sourcePath of paths) {
        if (sourcePath === targetDir || targetDir.startsWith(`${sourcePath}/`)) {
          setErrorMessage('Cannot move a folder into itself.');
          continue;
        }
        const nextPath = [targetDir, explorerPathUtils.basename(sourcePath)].filter(Boolean).join('/');
        if (sourcePath === nextPath) {
          continue;
        }
        await renameEntry({ sourcePath, targetPath: nextPath });
        didMove = true;
      }
      if (didMove) {
        await refreshAll();
      }
    } catch (err) {
      setErrorMessage('Move failed.');
    }
  };

  const handleExternalImport = useCallback(async (sourcePaths, targetDir) => {
    if (!sourcePaths.length) {
      return;
    }
    try {
      const report = await importExternalEntries({ sourcePaths, targetDir });
      if (!report) {
        setErrorMessage('External import is unavailable.');
        return;
      }
      const importedPaths = Array.from(
        new Set(
          [
            ...(Array.isArray(report.importedPaths) ? report.importedPaths : []),
            ...((Array.isArray(report.imported) ? report.imported : [])
              .map((entry: any) => String(entry?.targetPath || '').trim())
              .filter(Boolean)),
          ]
            .map((entry) => explorerPathUtils.toRelativePath(String(entry || '')))
            .filter(Boolean)
        )
      );
      const firstImportedPath = importedPaths[0] || '';
      if (firstImportedPath) {
        await expandAncestorsForPath(firstImportedPath);
        selectPathInExplorer(firstImportedPath);
      }
      const failureCount = Array.isArray(report.failures) ? report.failures.length : 0;
      if (failureCount > 0) {
        const importedCount = Array.isArray(report.imported) ? report.imported.length : 0;
        const firstFailure = report.failures?.[0]?.error ? ` (${report.failures[0].error})` : '';
        const importedLabel = importedCount === 1 ? 'entry' : 'entries';
        const failedLabel = failureCount === 1 ? 'failure' : 'failures';
        if (importedCount > 0) {
          setErrorMessage(`Imported ${importedCount} ${importedLabel} with ${failureCount} ${failedLabel}${firstFailure}.`);
        } else {
          setErrorMessage(`Import failed: ${failureCount} ${failedLabel}${firstFailure}.`);
        }
      } else {
        clearError();
      }
    } catch (err) {
      setErrorMessage(err?.message || 'Import failed.');
    }
  }, [clearError, expandAncestorsForPath, importExternalEntries, selectPathInExplorer, setErrorMessage]);

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
    clearError();
  }, [clearError, expandAncestorsForPath, semanticTagsByPath, selectPathInExplorer, setErrorMessage, visiblePaths]);
  const requestRename = useCallback((path) => {
    if (!path) return;
    setRenameTarget({ path, value: explorerPathUtils.basename(path) });
  }, []);

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
        <div className="flex items-center gap-1 opacity-[0.15] group-hover:opacity-60 transition-opacity pr-1">
            <div key={sorted[0].id} className="px-1 py-0.5 rounded-[2px] bg-white/10 text-[7px] font-black uppercase tracking-tighter">{sorted[0].name}</div>
            {sorted.length > 1 && <span className="text-[7px] font-bold">+{sorted.length - 1}</span>}
        </div>
    );

    return (
      <ExplorerItem
        key={item.path} item={item} node={node} isSelected={selectionSet.has(item.path)} isFocused={focusedPath === item.path} isLoading={loadingPaths.has(item.path)}
        isExpanded={expandedPaths.has(item.path) || isSearchActive} isSearchActive={isSearchActive} isOpen={!isDir && openFiles.has(item.path)}
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
        onRequestRename={requestRename}
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

  const scopedAgentsCount = useMemo(() => {
    const agents = new Set();
    selectedPaths.forEach(path => {
      const entry = tree.nodes[path]?.type === 'dir' ? folderStatusByPath[path] : statusByPath[path];
      if (entry?.cells) {
        Object.keys(entry.cells).forEach(id => agents.add(id));
      }
    });
    return agents.size;
  }, [selectedPaths, tree.nodes, folderStatusByPath, statusByPath]);

  return (
    <aside
      className="relative flex h-full w-full flex-col bg-sidebar select-none"
      onDragOver={handleSidebarDragOver}
      onDrop={handleSidebarDrop}
    >
      <ExplorerHeader
        activeRootLabel={activeRootLabel} onJumpToAgents={onJumpToAgents} onNewFile={() => startDraft('file')} onNewFolder={() => startDraft('dir')}
        onRefresh={() => refreshAll({ forceStatus: true, reloadExpanded: true })} isLoading={loadingPaths.size > 0} hasCells={hasCells} cells={cells} selectedId={selectedId} onSelectCell={onSelectCell}
        searchQuery={searchQuery} onSearchChange={setSearchQuery} onClearSearch={() => setSearchQuery('')}
        hasActiveFilters={hasActiveFilters} onToggleFilterMenu={() => setFilterMenuOpen(!filterMenuOpen)}
        searchTruncated={searchTruncated}
      />

      {filterMenuOpen && (
        <ExplorerFilterPanel
          showHidden={showHidden} setShowHidden={setShowHidden} showIgnored={showIgnored} setShowIgnored={setShowIgnored}
          showChangesOnly={showChangesOnly} setShowChangesOnly={setShowChangesOnly} statusFilterSet={statusFilterSet}
          toggleStatusFilter={toggleStatusFilter} clearStatusFilters={() => setStatusFilters([])} statusFiltersCount={statusFilters.length}
          semanticRules={semanticRules}
          semanticFilterSet={semanticFilterSet}
          toggleSemanticFilter={toggleSemanticFilter}
          clearSemanticFilters={() => setSemanticFilters([])}
          semanticFiltersCount={semanticFilters.length}
          onLocateSemanticRule={handleLocateSemanticRule}
        />
      )}

      {error && (
        <div className="mx-2 mt-2 flex items-start gap-2 rounded border border-rose-500/20 bg-rose-500/5 px-3 py-2 text-[11px] text-rose-300 animate-tab-in">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div
        ref={listRef} data-testid="explorer-tree" className="flex-1 overflow-y-auto px-1 py-2 focus:outline-none scrollbar-hide" tabIndex={0}
        onClick={() => closeContextMenu()} onKeyDown={handleKeyDown}
        onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
        onDragOver={handleTreeDragOver}
        onDrop={handleTreeDrop}
      >
        {visibleItems.length === 0 ? (
          <div className="px-3 py-2 text-xs text-muted-foreground/60">No files to display.</div>
        ) : (
          <div style={{ height: totalHeight, position: 'relative' }}>
            <div style={{ transform: `translateY(${offsetY}px)` }}>
              {visibleSlice.map((it) => renderNodeRow(it))}
            </div>
          </div>
        )}
      </div>

      <ExplorerChangedFilesPanel
        entries={changedPanelEntries}
        selectedCell={selectedCell}
        selectedCellId={selectedCellId}
        isOpen={changesPanelOpen}
        mode={changesPanelMode}
        refreshing={changesPanelRefreshing}
        updatedAt={changesPanelUpdatedAt}
        preview={changesPanelPreview}
        onRefresh={refreshChangesPanel}
        onToggleOpen={() => setChangesPanelOpen((current) => !current)}
        onModeChange={setChangesPanelMode}
        onOpenEntry={(entry) => handleOpenChangedEntry(entry, { mode: 'preview' })}
        onRevealEntry={handleRevealChangedEntry}
        onPreviewEntry={handlePreviewChangedEntry}
        onDragEntry={handleChangeEntryDragStart}
        onClearPreview={clearChangesPanelPreview}
      />

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
          x={contextMenu.x} y={contextMenu.y} onClose={closeContextMenu} selectionTargets={selectionTargets} canPaste={canPaste}
          onNewFile={() => startDraft('file')} onNewFolder={() => startDraft('dir')}
          onRename={() => setRenameTarget({ path: selectionTargets[0], value: explorerPathUtils.basename(selectionTargets[0]) })}
          onDuplicate={() => handleDuplicate(selectionTargets[0])} onCopy={() => handleCopySelection('copy')}
          onCopyRelativePath={() => handleCopyRelativePath(selectionTargets)}
          onCopyAbsolutePath={() => handleCopyPath(selectionTargets)}
          onCut={() => handleCopySelection('cut')} onPaste={handlePasteSelection} onPasteMarkdown={handlePasteMarkdown}
          onReveal={() => handleReveal(selectionTargets)} onDelete={() => handleDelete(selectionTargets)}
          onAddComment={() => onAddComment?.(selectionTargets[0])}
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
