import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { useProjectExplorer, explorerPathUtils } from '../../hooks/useProjectExplorer';
import { RecentProjectsList } from '../RecentProjectsList';
import { ExplorerContextMenu } from './ExplorerContextMenu';
import { ExplorerItem } from './ExplorerItem';
import { ExplorerHeader } from './ExplorerHeader';
import { ExplorerFilterPanel } from './ExplorerFilterPanel';
import { ExplorerSessions } from './ExplorerSessions';
import { ExplorerFooter } from './ExplorerFooter';
import { 
  pickPrimaryStatus, 
} from './explorerUtils';

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
  onAddComment,
  commentCountsByPath,
  onJumpToComments,
  onToggleSessionMap,
  sessionMapOpen,
  revealRequest,
  onRevealHandled,
}: any) {
  const listRef = useRef(null);
  const visiblePathsRef = useRef([]);
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
    revealEntry,
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
  const [showIgnored, setShowIgnored] = useState(true);
  const [statusFilters, setStatusFilters] = useState([]);
  const [focusedPath, setFocusedPath] = useState('');
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [clipboard, setClipboard] = useState(null);
  const explorerStateKey = useMemo(() => {
    const base = scopeRootPath || rootPath || repoRoot;
    if (!base) return '';
    return `agency:explorer:${base}`;
  }, [scopeRootPath, rootPath, repoRoot]);
  const hasRestoredStateRef = useRef(false);

  const statusFilterSet = useMemo(() => new Set(statusFilters), [statusFilters]);
  const isSearchActive = searchQuery.trim().length > 0;
  const tree = isSearchActive ? searchTree : { nodes: nodesByPath, children: childrenByPath };
  const hasStatusFilters = statusFilterSet.size > 0;
  const hasChangeFilter = showChangesOnly || hasStatusFilters;
  const hasVisibilityFilters = !showHidden || !showIgnored;
  const hasActiveFilters = hasChangeFilter || hasVisibilityFilters;

  const activeRootLabel = rootLabel || 'Project';
  const hasCells = cells && cells.length > 0;
  const selectedCellId = selectedCell?.id || null;

  const selectionSet = useMemo(() => new Set(selectedPaths), [selectedPaths]);
  const openFiles = useMemo(() => new Set(Object.keys(workbenchMeta || {})), [workbenchMeta]);
  const dirtyFiles = useMemo(() => 
    new Set(Object.entries(workbenchMeta || {}).filter(([, m]: any) => m?.dirty).map(([p]: any) => p)), 
    [workbenchMeta]
  );

  useEffect(() => {
    hasRestoredStateRef.current = false;
  }, [explorerStateKey]);

  useEffect(() => {
    if (!explorerStateKey || hasRestoredStateRef.current) return;
    hasRestoredStateRef.current = true;
    try {
      const raw = window.sessionStorage?.getItem(explorerStateKey);
      if (!raw) return;
      const payload = JSON.parse(raw);
      const expanded = Array.isArray(payload?.expandedPaths) ? payload.expandedPaths : [];
      const selected = Array.isArray(payload?.selectedPaths) ? payload.selectedPaths : [];
      const focused = typeof payload?.focusedPath === 'string' ? payload.focusedPath : '';
      const storedScrollTop = typeof payload?.scrollTop === 'number' ? payload.scrollTop : null;
      (async () => {
        const uniqueExpanded = new Set(expanded.filter(Boolean));
        uniqueExpanded.add('');
        for (const entry of uniqueExpanded) {
          await expandPath(entry);
        }
        if (selected.length) {
          setSelectedPaths(selected);
          setFocusedPath(focused || selected[0]);
        } else if (focused) {
          setFocusedPath(focused);
        }
        if (storedScrollTop != null) {
          requestAnimationFrame(() => {
            if (listRef.current) listRef.current.scrollTop = storedScrollTop;
          });
        }
      })();
    } catch (err) {
      // Ignore invalid persisted state.
    }
  }, [expandPath, explorerStateKey, setSelectedPaths]);

  useEffect(() => {
    if (!explorerStateKey) return;
    try {
      const payload = {
        expandedPaths: Array.from(expandedPaths || []),
        selectedPaths,
        focusedPath,
        scrollTop,
      };
      window.sessionStorage?.setItem(explorerStateKey, JSON.stringify(payload));
    } catch (err) {
      // Ignore persistence errors (quota/disabled storage).
    }
  }, [expandedPaths, explorerStateKey, focusedPath, scrollTop, selectedPaths]);

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

  const buildVisibleList = useCallback(() => {
    const items = [];
    const shouldInclude = (path, node) => {
      if (!hasChangeFilter) return true;
      const entry = node.type === 'dir' ? folderStatusByPath[path] : statusByPath[path];
      const scoped = getScopedEntry(entry, node.type === 'dir' ? 'dir' : 'file');
      let status = scoped?.status || null;
      if (node.type === 'dir' && !statusByPath[path] && status === 'ignored') status = null;
      return status && (!hasStatusFilters || statusFilterSet.has(status));
    };
    const isVisible = (path, node) => {
      if (!path) return true;
      if (!showHidden && node.name.startsWith('.')) return false;
      return showIgnored || !isPathIgnored(path);
    };
    const checkMatch = (path) => {
      const node = tree.nodes[path];
      if (!node || !isVisible(path, node)) return false;
      if (shouldInclude(path, node)) return true;
      return node.type === 'dir' && (tree.children[path] || []).some(c => checkMatch(c));
    };
    const walk = (path, depth) => {
      const node = tree.nodes[path];
      if (!node || !isVisible(path, node)) return;
      const isDir = node.type === 'dir';
      const selfMatches = path ? shouldInclude(path, node) : true;
      let childHasMatch = false;
      if (isDir) childHasMatch = (tree.children[path] || []).some(c => checkMatch(c));
      const shouldShow = path ? selfMatches || childHasMatch : true;
      if (path && shouldShow) items.push({ path, depth, type: node.type, isSymbolicLink: node.isSymbolicLink });
      if (isDir && shouldShow && (isSearchActive || expandedPaths.has(path))) {
        (tree.children[path] || []).forEach(c => walk(c, depth + 1));
      }
    };
    walk('', 0);
    if (draftEntry?.parentPath) {
      const idx = items.findIndex(it => it.path === draftEntry.parentPath);
      if (idx >= 0) items.splice(idx + 1, 0, { path: `__d__${draftEntry.parentPath}`, depth: items[idx].depth + 1, type: draftEntry.type, draft: true });
    }
    return items;
  }, [draftEntry, expandedPaths, folderStatusByPath, getScopedEntry, hasChangeFilter, hasStatusFilters, isSearchActive, showHidden, showIgnored, isPathIgnored, statusByPath, statusFilterSet, tree.children, tree.nodes]);

  const visibleItems = useMemo(() => buildVisibleList(), [buildVisibleList]);
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
      const parts = targetPath.split('/').filter(Boolean);
      let current = '';
      for (let i = 0; i < parts.length - 1; i += 1) {
        current = [current, parts[i]].filter(Boolean).join('/');
        await expandPath(current);
        if (cancelled) {
          return;
        }
      }
      handleSelectPath(targetPath);
      setFocusedPath(targetPath);
      requestAnimationFrame(() => {
        if (!scrollToPath(targetPath)) {
          requestAnimationFrame(() => scrollToPath(targetPath));
        }
      });
      onRevealHandled?.();
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [
    expandPath,
    handleSelectPath,
    onRevealHandled,
    repoRoot,
    revealRequest,
    rootPath,
    scopeRootPath,
    scrollToPath,
  ]);

  // Handlers
  const closeContextMenu = () => setContextMenu(null);
  const activeTarget = contextMenu?.path || selectedPaths[0] || '';
  const activeNode = tree.nodes[activeTarget];
  const activeDir = activeNode?.type === 'dir' ? activeTarget : explorerPathUtils.dirname(activeTarget);
  const selectionTargets = selectedPaths.length ? selectedPaths : activeTarget ? [activeTarget] : [];
  const selectionCount = selectionTargets.length;
  const canPaste = (clipboard?.paths?.length > 0) || Boolean(window.agency?.materializeClipboard);

  const resolvePasteDirectory = () => {
    if (!activeTarget) return '';
    const node = tree.nodes[activeTarget];
    return node?.type === 'dir' ? activeTarget : explorerPathUtils.dirname(activeTarget);
  };

  const handleCopySelection = (mode) => { if (selectionTargets.length) setClipboard({ mode, paths: Array.from(new Set(selectionTargets)) }); };
  
  const handlePasteSelection = async () => {
    const baseRoot = rootPath || repoRoot || '';
    const targetDir = resolvePasteDirectory();
    if (window.agency?.materializeClipboard && baseRoot) {
      try {
        const result = await window.agency.materializeClipboard({ rootPath: baseRoot, targetDir, includeText: false, relativeTo: baseRoot });
        if (result?.type === 'files' || result?.type === 'image') {
          if (targetDir) expandPath(targetDir);
          await refreshAll();
          if (result?.paths?.length) setSelectedPaths(result.paths);
          clearError();
          return;
        }
      } catch (err) { setErrorMessage(err?.message || 'Failed to paste.'); return; }
    }
    if (!clipboard?.paths?.length) return;
    try {
      let didMove = false;
      let hadError = false;
      for (const sourcePath of clipboard.paths) {
        const baseName = explorerPathUtils.basename(sourcePath);
        const targetPath = [targetDir, baseName].filter(Boolean).join('/');
        if (targetDir && targetDir.startsWith(`${sourcePath}/`)) {
          setErrorMessage('Cannot paste a folder into itself.');
          hadError = true;
          continue;
        }
        if (sourcePath === targetPath) {
          continue;
        }
        if (clipboard.mode === 'cut') await renameEntry({ sourcePath, targetPath });
        else await copyEntry({ sourcePath, targetPath });
        didMove = true;
      }
      if (!hadError) {
        clearError();
      }
      if (clipboard.mode === 'cut' && didMove) setClipboard(null);
      if (didMove) {
        await refreshAll();
      }
    } catch (err) { setErrorMessage('Paste failed.'); }
  };

  const handlePasteMarkdown = async () => {
    const baseRoot = rootPath || repoRoot || '';
    if (!baseRoot || !window.agency?.materializeMarkdown) return;
    try {
      const result = await window.agency.materializeMarkdown({ rootPath: baseRoot, targetDir: '.agency/tmp/clipboard', relativeTo: baseRoot });
      if (result?.path) { await refreshAll(); setSelectedPaths([result.path]); onOpenFile?.({ path: result.path, mode: 'pinned' }); }
      clearError();
    } catch (err) { setErrorMessage('Markdown capture failed.'); }
  };

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

  const writeClipboard = async (text) => {
    if (!text) return;
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  };

  const handleCopyPath = async (targets) => {
    const list = (Array.isArray(targets) ? targets : [targets]).filter(Boolean);
    if (!list.length) return;
    try {
      const base = rootPath || repoRoot || '';
      const normalizedBase = base.endsWith('/') ? base.slice(0, -1) : base;
      const payload = list.map(it => (normalizedBase ? `${normalizedBase}/${it}` : it)).join('\n');
      await writeClipboard(payload);
    } catch (err) {}
  };

  const handleCopyRelativePath = async (targets) => {
    const list = (Array.isArray(targets) ? targets : [targets]).filter(Boolean);
    if (!list.length) return;
    try {
      const payload = list.join('\n');
      await writeClipboard(payload);
    } catch (err) {}
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
    } catch (err) { setErrorMessage('Move failed.'); }
  };

  const toggleStatusFilter = (s) => setStatusFilters(curr => curr.includes(s) ? curr.filter(it => it !== s) : [...curr, s]);
  const buildDragPayload = (p) => selectionSet.has(p) ? Array.from(selectionSet) : [p];
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
        commentCount={!isDir ? (commentCountsByPath?.[item.path] || 0) : 0}
        onJumpToComments={onJumpToComments}
        cellBadges={cellBadges} depth={item.depth} onToggle={() => togglePath(item.path)}
        onClick={isRenaming ? undefined : (e) => { handleSelectPath(item.path, e); setFocusedPath(item.path); listRef.current?.focus(); if (!isDir && !e.metaKey && !e.ctrlKey && !e.shiftKey) onOpenFile?.({ path: item.path, mode: 'preview' }); }}
        onDoubleClick={isRenaming ? undefined : (e) => { if (!isDir) { e.stopPropagation(); onOpenFile?.({ path: item.path, mode: 'pinned' }); } }}
        onContextMenu={isRenaming ? undefined : (e) => { e.preventDefault(); handleSelectPath(item.path, e); setFocusedPath(item.path); setContextMenu({ x: e.clientX, y: e.clientY, path: item.path }); }}
        onDragStart={isRenaming ? undefined : (e) => { const p = buildDragPayload(item.path); e.dataTransfer.setData('application/agency-paths', JSON.stringify(p)); e.dataTransfer.effectAllowed = 'move'; }}
        onDragOver={(e) => { if (isDir) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; } }}
        onDrop={async (e) => { if (!isDir) return; e.preventDefault(); const p = e.dataTransfer.getData('application/agency-paths'); if (p) await handleMove(JSON.parse(p), item.path); }}
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
    if (event.key === 'Enter') { event.preventDefault(); if (tree.nodes[focusedPath]?.type === 'dir') togglePath(focusedPath); else if (focusedPath) onOpenFile?.({ path: focusedPath, mode: 'pinned' }); }
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
    <aside className="relative flex h-full w-full flex-col bg-sidebar select-none">
      <ExplorerHeader
        activeRootLabel={activeRootLabel} onJumpToAgents={onJumpToAgents} onNewFile={() => startDraft('file')} onNewFolder={() => startDraft('dir')}
        onRefresh={refreshAll} isLoading={loadingPaths.size > 0} hasCells={hasCells} cells={cells} selectedId={selectedId} onSelectCell={onSelectCell}
        searchQuery={searchQuery} onSearchChange={setSearchQuery} onClearSearch={() => setSearchQuery('')}
        hasActiveFilters={hasActiveFilters} onToggleFilterMenu={() => setFilterMenuOpen(!filterMenuOpen)}
        searchTruncated={searchTruncated}
      />

      {filterMenuOpen && (
        <ExplorerFilterPanel
          showHidden={showHidden} setShowHidden={setShowHidden} showIgnored={showIgnored} setShowIgnored={setShowIgnored}
          showChangesOnly={showChangesOnly} setShowChangesOnly={setShowChangesOnly} statusFilterSet={statusFilterSet}
          toggleStatusFilter={toggleStatusFilter} clearStatusFilters={() => setStatusFilters([])} statusFiltersCount={statusFilters.length}
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
  onDispatchFeed, onAddComment, commentCountsByPath, onJumpToComments, onToggleSessionMap, sessionMapOpen,
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
