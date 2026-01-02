import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronRight,
  ChevronDown,
  FolderClosed,
  FolderOpen,
  FileText,
  FileCode,
  FileJson,
  FileImage,
  FileAudio,
  FileVideo,
  FileArchive,
  FileCog,
  FileSearch2,
  FileType2,
  RefreshCw,
  FilePlus2,
  FolderPlus,
  Search,
  X,
  Copy,
  Scissors,
  ClipboardPaste,
  Pencil,
  Trash2,
  ArrowRightLeft,
  Eye,
  EyeOff,
  Filter,
  Link2,
  AlertCircle,
  Info,
  Layers,
} from 'lucide-react';
import { useProjectExplorer, explorerPathUtils } from '../../hooks/useProjectExplorer.js';
import { RecentProjectsList } from '../RecentProjectsList.jsx';

const getFileIcon = (name, isSymbolicLink) => {
  if (isSymbolicLink) return Link2;
  const ext = name.split('.').pop().toLowerCase();

  if (['js', 'jsx', 'ts', 'tsx', 'py', 'go', 'rs', 'c', 'cpp', 'java', 'rb', 'php', 'swift', 'sh', 'bash'].includes(ext)) return FileCode;
  if (['json', 'yaml', 'yml', 'toml', 'xml', 'html', 'css', 'scss', 'less'].includes(ext)) return FileJson;
  if (['md', 'txt', 'rtf', 'log'].includes(ext)) return FileText;
  if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico', 'bmp'].includes(ext)) return FileImage;
  if (['mp3', 'wav', 'ogg', 'flac', 'm4a'].includes(ext)) return FileAudio;
  if (['mp4', 'mkv', 'avi', 'mov', 'webm'].includes(ext)) return FileVideo;
  if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2'].includes(ext)) return FileArchive;
  if (['env', 'config', 'ini', 'properties', 'yaml', 'yml'].includes(ext)) return FileCog;
  if (['sql', 'db', 'sqlite'].includes(ext)) return FileSearch2;
  if (['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx'].includes(ext)) return FileType2;

  return FileText;
};

const statusColors = {
  added: 'text-emerald-400',
  modified: 'text-amber-300',
  deleted: 'text-rose-400',
  renamed: 'text-sky-400',
  copied: 'text-sky-400',
  untracked: 'text-lime-300',
  ignored: 'text-slate-400',
  conflict: 'text-rose-500',
};

const statusBadges = {
  added: 'A',
  modified: 'M',
  deleted: 'D',
  renamed: 'R',
  copied: 'C',
  untracked: '?',
  ignored: 'I',
  conflict: '!',
};

const STATUS_PRIORITY = [
  'conflict',
  'deleted',
  'added',
  'modified',
  'renamed',
  'copied',
  'untracked',
  'ignored',
];

const statusBadgeStyles = {
  added: 'border-emerald-500/40 bg-emerald-500/10',
  modified: 'border-amber-400/40 bg-amber-400/10',
  deleted: 'border-rose-400/40 bg-rose-400/10',
  renamed: 'border-sky-400/40 bg-sky-400/10',
  copied: 'border-sky-400/40 bg-sky-400/10',
  untracked: 'border-lime-500/40 bg-lime-500/10',
  ignored: 'border-slate-400/40 bg-slate-400/10',
  conflict: 'border-rose-500/50 bg-rose-500/15',
};

const ROW_HEIGHT = 24;
const OVERSCAN = 6;
const VIRTUALIZE_THRESHOLD = 200;
const STATUS_FILTERS = [...STATUS_PRIORITY];

const sortCells = (cells) => {
  return Object.values(cells || {}).sort((a, b) => {
    const aTotal = (a.added || 0) + (a.deleted || 0);
    const bTotal = (b.added || 0) + (b.deleted || 0);
    if (aTotal !== bTotal) {
      return bTotal - aTotal;
    }
    return (a.name || '').localeCompare(b.name || '');
  });
};

const formatIdle = (ms) => {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes <= 0) {
    return `${seconds}s`;
  }
  const hours = Math.floor(minutes / 60);
  const remMinutes = minutes % 60;
  if (hours <= 0) {
    return `${remMinutes}m`;
  }
  return `${hours}h ${remMinutes}m`;
};

const pickPrimaryStatus = (statusCounts = {}) => {
  for (const status of STATUS_PRIORITY) {
    if (statusCounts[status]) {
      return status;
    }
  }
  return null;
};

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
  projectReady,
  projectError,
  onSelectProject,
  recentProjects,
  onOpenRecentProject,
}) {
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
    enabled: projectReady,
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
  const dirtyFiles = useMemo(
    () =>
      new Set(
        Object.entries(workbenchMeta || {})
          .filter(([, meta]) => meta?.dirty)
          .map(([path]) => path)
      ),
    [workbenchMeta]
  );
  const getScopedEntry = useCallback(
    (entry, type) => {
      if (!entry || !selectedCellId || !entry.cells?.[selectedCellId]) {
        return entry;
      }
      const cellInfo = entry.cells[selectedCellId];
      if (!cellInfo) {
        return entry;
      }
      if (type === 'dir') {
        const status = pickPrimaryStatus(cellInfo.statusCounts || {});
        return {
          ...entry,
          status,
          added: cellInfo.added || 0,
          deleted: cellInfo.deleted || 0,
        };
      }
      return {
        ...entry,
        status: cellInfo.status || entry.status,
        added: cellInfo.added || 0,
        deleted: cellInfo.deleted || 0,
      };
    },
    [selectedCellId]
  );

  const ignoredPaths = useMemo(() => {
    const paths = new Set();
    Object.entries(statusByPath || {}).forEach(([path, entry]) => {
      if (entry?.status === 'ignored' && path) {
        paths.add(path);
      }
    });
    return paths;
  }, [statusByPath]);

  const hasIgnoredAncestor = (targetPath) => {
    if (!targetPath) {
      return false;
    }
    const parts = targetPath.split('/').filter(Boolean);
    if (parts.length <= 1) {
      return false;
    }
    for (let index = parts.length - 1; index > 0; index -= 1) {
      const ancestor = parts.slice(0, index).join('/');
      if (ignoredPaths.has(ancestor)) {
        return true;
      }
    }
    return false;
  };

  const isPathIgnored = (targetPath) =>
    Boolean(targetPath) && (ignoredPaths.has(targetPath) || hasIgnoredAncestor(targetPath));

  const buildVisibleList = useCallback(() => {
    const items = [];
    const shouldIncludeByStatus = (path, node) => {
      if (!hasChangeFilter) {
        return true;
      }
      const entry = node.type === 'dir' ? folderStatusByPath[path] : statusByPath[path];
      const scopedEntry = getScopedEntry(entry, node.type === 'dir' ? 'dir' : 'file');
      let status = scopedEntry?.status || null;
      if (node.type === 'dir' && !statusByPath[path] && status === 'ignored') {
        status = null;
      }
      if (!status) {
        return false;
      }
      if (hasStatusFilters && !statusFilterSet.has(status)) {
        return false;
      }
      return true;
    };
    const walk = (path, depth) => {
      const node = tree.nodes[path];
      if (!node) {
        return false;
      }
      if (path && !showHidden && node.name.startsWith('.')) {
        return false;
      }
      if (path && !showIgnored && isPathIgnored(path)) {
        return false;
      }
      const isDir = node.type === 'dir';
      let childHasMatch = false;
      if (isDir && (isSearchActive || expandedPaths.has(path))) {
        const children = tree.children[path] || [];
        for (const child of children) {
          if (walk(child, depth + 1)) {
            childHasMatch = true;
          }
        }
      }
      const selfMatches = path ? shouldIncludeByStatus(path, node) : true;
      const shouldShow = path ? selfMatches || childHasMatch : true;
      if (path && shouldShow) {
        items.push({ path, depth, type: node.type, isSymbolicLink: node.isSymbolicLink });
      }
      return selfMatches || childHasMatch;
    };
    walk('', 0);
    if (draftEntry?.parentPath) {
      const parentIndex = items.findIndex((item) => item.path === draftEntry.parentPath);
      if (parentIndex >= 0) {
        const parentDepth = items[parentIndex].depth;
        items.splice(parentIndex + 1, 0, {
          path: `__draft__${draftEntry.parentPath}`,
          depth: parentDepth + 1,
          type: draftEntry.type,
          draft: true,
          parentPath: draftEntry.parentPath,
        });
      }
    }
    return items;
  }, [
    draftEntry,
    expandedPaths,
    folderStatusByPath,
    getScopedEntry,
    hasChangeFilter,
    hasStatusFilters,
    isSearchActive,
    showIgnored,
    statusByPath,
    statusFilterSet,
    tree.children,
    tree.nodes,
  ]);

  const visibleItems = useMemo(() => buildVisibleList(), [buildVisibleList]);
  const visiblePaths = useMemo(
    () => visibleItems.map((item) => item.path).filter((path) => !path.startsWith('__draft__')),
    [visibleItems]
  );
  const rowIndexByPath = useMemo(() => {
    const map = new Map();
    visibleItems.forEach((item, index) => {
      if (!item.draft) {
        map.set(item.path, index);
      }
    });
    return map;
  }, [visibleItems]);

  useEffect(() => {
    visiblePathsRef.current = visiblePaths;
  }, [visiblePaths]);

  useEffect(() => {
    if (focusedPath && visiblePaths.includes(focusedPath)) {
      return;
    }
    if (selectedPaths.length && visiblePaths.includes(selectedPaths[0])) {
      setFocusedPath(selectedPaths[0]);
      return;
    }
    setFocusedPath(visiblePaths[0] || '');
  }, [focusedPath, selectedPaths, visiblePaths]);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!filterMenuOpen) {
      return undefined;
    }
    const handleClick = (event) => {
      const target = event.target;
      if (target.closest('[data-explorer-filter-menu]')) {
        return;
      }
      if (target.closest('[data-explorer-filter-toggle]')) {
        return;
      }
      setFilterMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [filterMenuOpen]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) {
      return undefined;
    }
    const handleScroll = () => {
      setScrollTop(el.scrollTop);
    };
    el.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(() => {
        setViewportHeight(el.clientHeight);
      });
      observer.observe(el);
      return () => {
        el.removeEventListener('scroll', handleScroll);
        observer.disconnect();
      };
    }
    const handleResize = () => setViewportHeight(el.clientHeight);
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => {
      el.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const closeContextMenu = () => setContextMenu(null);

  const activeTarget = contextMenu?.path || selectedPaths[0] || '';
  const activeNode = tree.nodes[activeTarget];
  const activeDir =
    activeNode?.type === 'dir' ? activeTarget : explorerPathUtils.dirname(activeTarget);

  const selectionTargets = selectedPaths.length
    ? selectedPaths
    : activeTarget
      ? [activeTarget]
      : [];
  const selectionCount = selectionTargets.length;
  const clipboardPaths = clipboard?.paths || [];
  const clipboardMode = clipboard?.mode || 'copy';
  const hasClipboard = clipboardPaths.length > 0;
  const canPaste = hasClipboard || Boolean(window.agency?.materializeClipboard);

  const resolvePasteDirectory = () => {
    if (!activeTarget) {
      return '';
    }
    const node = tree.nodes[activeTarget];
    if (node?.type === 'dir') {
      return activeTarget;
    }
    return explorerPathUtils.dirname(activeTarget);
  };

  const handleCopySelection = (mode) => {
    if (!selectionTargets.length) {
      return;
    }
    setClipboard({
      mode,
      paths: Array.from(new Set(selectionTargets)),
    });
  };

  const handlePasteSelection = async () => {
    const baseRoot = rootPath || repoRoot || '';
    const targetDir = resolvePasteDirectory();
    if (window.agency?.materializeClipboard && baseRoot) {
      try {
        const result = await window.agency.materializeClipboard({
          rootPath: baseRoot,
          targetDir,
          includeText: false,
          relativeTo: baseRoot,
        });
        if (result?.type === 'files' || result?.type === 'image') {
          if (targetDir) {
            expandPath(targetDir);
          }
          await refreshAll();
          if (result?.paths?.length) {
            setSelectedPaths(result.paths);
          }
          clearError();
          return;
        }
      } catch (err) {
        setErrorMessage(err?.message || 'Failed to paste from clipboard.');
        return;
      }
    }
    if (!hasClipboard) {
      return;
    }
    for (const sourcePath of clipboardPaths) {
      if (!sourcePath) {
        continue;
      }
      if (targetDir && (sourcePath === targetDir || targetDir.startsWith(`${sourcePath}/`))) {
        setErrorMessage('Cannot paste into the selected entry.');
        return;
      }
    }
    try {
      for (const sourcePath of clipboardPaths) {
        if (!sourcePath) {
          continue;
        }
        const nextPath = [targetDir, explorerPathUtils.basename(sourcePath)].filter(Boolean).join('/');
        if (!nextPath || nextPath === sourcePath) {
          continue;
        }
        if (clipboardMode === 'cut') {
          // eslint-disable-next-line no-await-in-loop
          await renameEntry({ sourcePath, targetPath: nextPath });
        } else {
          // eslint-disable-next-line no-await-in-loop
          await copyEntry({ sourcePath, targetPath: nextPath });
        }
      }
      clearError();
      if (clipboardMode === 'cut') {
        setClipboard(null);
      }
    } catch (err) {
      setErrorMessage(err?.message || 'Failed to paste entries.');
    }
  };

  const startDraft = (type) => {
    if (activeDir) {
      expandPath(activeDir);
    }
    setDraftEntry({
      type,
      parentPath: activeDir || '',
      value: '',
    });
  };

  const handleDraftSubmit = async () => {
    if (!draftEntry?.value) {
      setDraftEntry(null);
      return;
    }
    try {
      await createEntry({
        type: draftEntry.type,
        parentPath: draftEntry.parentPath,
        name: draftEntry.value,
      });
      clearError();
    } catch (err) {
      setErrorMessage(err?.message || 'Failed to create entry.');
    }
    setDraftEntry(null);
  };

  const handleRenameSubmit = async () => {
    if (!renameTarget?.path || !renameTarget?.value) {
      setRenameTarget(null);
      return;
    }
    const parent = explorerPathUtils.dirname(renameTarget.path);
    const nextPath = [parent, renameTarget.value].filter(Boolean).join('/');
    try {
      await renameEntry({ sourcePath: renameTarget.path, targetPath: nextPath });
      clearError();
    } catch (err) {
      setErrorMessage(err?.message || 'Failed to rename entry.');
    }
    setRenameTarget(null);
  };

  const handleCopyPath = async (targets) => {
    const list = (Array.isArray(targets) ? targets : [targets]).filter(Boolean);
    if (!list.length) {
      return;
    }
    try {
      const base = rootPath || repoRoot || '';
      const payload = list
        .map((item) => (base ? `${base}/${item}` : item))
        .join('\n');
      await navigator.clipboard.writeText(payload);
    } catch (err) {
      // ignore clipboard errors silently
    }
  };

  const handleDelete = async (targets) => {
    const list = (Array.isArray(targets) ? targets : [targets]).filter(Boolean);
    if (!list.length) {
      return;
    }
    const label = list.length === 1 ? list[0] : `${list.length} items`;
    const confirmed = window.confirm(`Delete ${label}? This cannot be undone.`);
    if (!confirmed) {
      return;
    }
    try {
      for (const targetPath of list) {
        // eslint-disable-next-line no-await-in-loop
        await deleteEntry({ targetPath });
      }
      setSelectedPaths((current) => current.filter((item) => !list.includes(item)));
      clearError();
    } catch (err) {
      setErrorMessage(err?.message || 'Failed to delete entry.');
    }
  };

  const handleDuplicate = async (targetPath) => {
    const name = explorerPathUtils.basename(targetPath);
    const parent = explorerPathUtils.dirname(targetPath);
    const nextName = window.prompt('Duplicate as:', `${name}-copy`);
    if (!nextName) {
      return;
    }
    const nextPath = [parent, nextName].filter(Boolean).join('/');
    try {
      await copyEntry({ sourcePath: targetPath, targetPath: nextPath });
      clearError();
    } catch (err) {
      setErrorMessage(err?.message || 'Failed to copy entry.');
    }
  };

  const handleReveal = async (targets) => {
    const list = (Array.isArray(targets) ? targets : [targets]).filter(Boolean);
    if (!list.length) {
      return;
    }
    try {
      for (const targetPath of list) {
        // eslint-disable-next-line no-await-in-loop
        await revealEntry({ targetPath });
      }
      clearError();
    } catch (err) {
      setErrorMessage(err?.message || 'Failed to reveal entry.');
    }
  };

  const handleMove = async (paths, targetDir) => {
    for (const sourcePath of paths) {
      if (!sourcePath) {
        continue;
      }
      if (targetDir && (sourcePath === targetDir || sourcePath.startsWith(`${targetDir}/`))) {
        continue;
      }
      const nextPath = [targetDir, explorerPathUtils.basename(sourcePath)].filter(Boolean).join('/');
      // eslint-disable-next-line no-await-in-loop
      try {
        await renameEntry({ sourcePath, targetPath: nextPath });
        clearError();
      } catch (err) {
        setErrorMessage(err?.message || 'Failed to move entry.');
        break;
      }
    }
  };

  const toggleStatusFilter = (status) => {
    setStatusFilters((current) =>
      current.includes(status) ? current.filter((item) => item !== status) : [...current, status]
    );
  };

  const buildDragPayload = (path) => {
    if (selectionSet.has(path)) {
      return Array.from(selectionSet);
    }
    return [path];
  };

  const renderStatus = (path, type) => {
    const directEntry = statusByPath[path];
    const aggregateEntry = type === 'dir' ? folderStatusByPath[path] : null;
    const rawEntry = directEntry || aggregateEntry;
    const entry = getScopedEntry(rawEntry, type);
    if (!entry) {
      return null;
    }
    let status = entry.status;
    if (type === 'dir' && !directEntry && status === 'ignored') {
      status = null;
    }
    const badge = statusBadges[status] || '?';
    const color = statusColors[status] || 'text-muted-foreground';
    const badgeStyle = statusBadgeStyles[status] || 'border-border bg-muted/30';
    const added = entry.added || 0;
    const deleted = entry.deleted || 0;
    if (!status && !added && !deleted) {
      return null;
    }
    return (
      <div className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground">
        {status ? (
          <span
            className={`rounded border px-1 ${badgeStyle} ${color}`}
            title={statusLabels[status] || status}
          >
            {badge}
          </span>
        ) : null}
        {(added || deleted) && (
          <span className="text-[10px] text-muted-foreground/70">
            +{added}/-{deleted}
          </span>
        )}
      </div>
    );
  };

  const renderCellBadges = (path, type) => {
    const entry = type === 'dir' ? folderStatusByPath[path] : statusByPath[path];
    if (!entry || !entry.cells) {
      return null;
    }
    const sorted = sortCells(entry.cells);
    if (!sorted.length) {
      return null;
    }
    const visible = sorted.slice(0, 2);
    const overflow = sorted.length - visible.length;
    return (
      <div className="flex items-center gap-1 text-[10px] text-muted-foreground/70">
        {visible.map((cell) => (
          <span key={cell.id} className="rounded border border-border px-1">
            {cell.name}
            {(cell.added || cell.deleted) && (
              <span className="ml-1 text-[9px] text-muted-foreground/50">
                +{cell.added || 0}/-{cell.deleted || 0}
              </span>
            )}
          </span>
        ))}
        {overflow > 0 && <span className="rounded border border-border px-1">+{overflow}</span>}
      </div>
    );
  };

  const renderDraftRow = (item) => (
    <div
      key={item.path}
      className="flex items-center gap-2 px-2 py-1 text-xs"
      style={{ paddingLeft: `${item.depth * 12 + 24}px` }}
    >
      <span className="text-xs text-muted-foreground">
        {draftEntry?.type === 'dir' ? <FolderPlus size={12} strokeWidth={1.5} /> : <FilePlus2 size={12} strokeWidth={1.5} />}
      </span>
      <input
        autoFocus
        value={draftEntry?.value || ''}
        onChange={(event) =>
          setDraftEntry((current) => ({ ...current, value: event.target.value }))
        }
        onBlur={handleDraftSubmit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            handleDraftSubmit();
          }
          if (event.key === 'Escape') {
            setDraftEntry(null);
          }
        }}
        className="flex-1 rounded border border-border bg-transparent px-1 text-xs text-foreground focus:outline-none"
        placeholder={draftEntry?.type === 'dir' ? 'New folder' : 'New file'}
      />
    </div>
  );

  const renderRow = (item) => {
    if (item.draft) {
      return renderDraftRow(item);
    }
    const node = tree.nodes[item.path];
    if (!node) {
      return null;
    }
    const isDir = node.type === 'dir';
    const isExpanded = isSearchActive ? true : expandedPaths.has(item.path);
    const isSelected = selectionSet.has(item.path);
    const isFocused = focusedPath === item.path;
    const isLoading = loadingPaths.has(item.path);
    const isLink = node.isSymbolicLink;

    const directEntry = statusByPath[item.path];
    const aggregateEntry = isDir ? folderStatusByPath[item.path] : null;
    const scopedEntry = getScopedEntry(directEntry || aggregateEntry, isDir ? 'dir' : 'file');
    let status = scopedEntry?.status || null;
    if (isDir && !directEntry && status === 'ignored') {
      status = null;
    }
    const ignored = isPathIgnored(item.path);
    const isUntracked = status === 'untracked';
    const isAdded = status === 'added';
    const isOpen = !isDir && openFiles.has(item.path);
    const isDirty = !isDir && dirtyFiles.has(item.path);

    const FileIcon = isDir ? (isExpanded ? FolderOpen : FolderClosed) : getFileIcon(node.name, isLink);

    return (
      <div
        key={item.path}
        data-explorer-path={item.path}
        className={`group flex items-center gap-2 rounded px-2 py-1 text-xs transition-colors relative ${
          isSelected ? 'bg-primary/20 text-foreground' : 'text-muted-foreground hover:text-foreground'
        } ${ignored ? 'opacity-70' : ''} ${isFocused ? 'ring-1 ring-primary/30' : ''}`}
        style={{ paddingLeft: `${item.depth * 12 + 8}px` }}
        onClick={(event) => {
          handleSelectPath(item.path, event);
          setFocusedPath(item.path);
          listRef.current?.focus();
          if (!isDir && !event.metaKey && !event.ctrlKey && !event.shiftKey) {
            onOpenFile?.({ path: item.path, mode: 'preview' });
          }
        }}
        onDoubleClick={(event) => {
          if (!isDir) {
            event.stopPropagation();
            onOpenFile?.({ path: item.path, mode: 'pinned' });
          }
        }}
        onContextMenu={(event) => {
          event.preventDefault();
          handleSelectPath(item.path, event);
          setFocusedPath(item.path);
          setContextMenu({
            x: event.clientX,
            y: event.clientY,
            path: item.path,
          });
        }}
        draggable
        onDragStart={(event) => {
          const payload = buildDragPayload(item.path);
          event.dataTransfer.setData('application/agency-paths', JSON.stringify(payload));
          event.dataTransfer.effectAllowed = 'move';
        }}
        onDragOver={(event) => {
          if (isDir) {
            event.preventDefault();
            event.dataTransfer.dropEffect = 'move';
          }
        }}
        onDrop={async (event) => {
          if (!isDir) {
            return;
          }
          event.preventDefault();
          const payload = event.dataTransfer.getData('application/agency-paths');
          if (!payload) {
            return;
          }
          const paths = JSON.parse(payload);
          await handleMove(paths, item.path);
        }}
      >
        {isDir ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              togglePath(item.path);
            }}
            className="text-muted-foreground/60 hover:text-muted-foreground shrink-0"
          >
            {isExpanded ? <ChevronDown size={14} strokeWidth={1.5} /> : <ChevronRight size={14} strokeWidth={1.5} />}
          </button>
        ) : (
          <span className="w-4 shrink-0" />
        )}

        <div className="relative shrink-0">
          <FileIcon
            size={14}
            strokeWidth={1.5}
            className={
              isDir
                ? 'text-primary/70'
                : isLink
                  ? 'text-sky-400'
                  : ignored
                    ? 'text-slate-400'
                    : 'text-muted-foreground/70'
            }
          />
          {isLink && (
            <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-[0.5px] ring-1 ring-sky-500/50">
              <Link2 size={8} className="text-sky-400" strokeWidth={3} />
            </div>
          )}
          {ignored && (
            <div className="absolute -top-1 -right-1 bg-background rounded-full p-[0.5px]">
              <EyeOff size={8} className="text-slate-400" strokeWidth={2} />
            </div>
          )}
        </div>

        {renameTarget?.path === item.path ? (
          <input
            autoFocus
            value={renameTarget.value}
            onChange={(event) =>
              setRenameTarget((current) => ({ ...current, value: event.target.value }))
            }
            onBlur={handleRenameSubmit}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                handleRenameSubmit();
              }
              if (event.key === 'Escape') {
                setRenameTarget(null);
              }
            }}
            className="flex-1 rounded border border-border bg-transparent px-1 text-xs text-foreground focus:outline-none"
          />
        ) : (
          <div className="flex flex-1 items-center gap-2 min-w-0">
            <span className={`truncate select-none ${ignored ? 'text-muted-foreground/70' : ''}`}>
              {node.name}
            </span>
            {isOpen ? (
              <span className="h-1.5 w-1.5 rounded-full bg-sky-400" title="Open" />
            ) : null}
            {isDirty ? (
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" title="Dirty" />
            ) : null}
            {isLink && (
              <span className="shrink-0 px-1 rounded-[2px] bg-sky-500/10 border border-sky-500/20 text-[8px] font-bold uppercase tracking-tighter text-sky-400">
                Link
              </span>
            )}
            {isUntracked && !ignored && (
              <span className="shrink-0 text-[8px] font-semibold uppercase tracking-tight text-lime-300">
                untracked
              </span>
            )}
            {isAdded && !ignored && (
              <span className="shrink-0 text-[8px] font-semibold uppercase tracking-tight text-emerald-300">
                added
              </span>
            )}
          </div>
        )}
        {renderStatus(item.path, node.type)}
        {renderCellBadges(item.path, node.type)}
        {isLoading && <RefreshCw size={12} className="animate-spin text-muted-foreground/50" />}
      </div>
    );
  };

  const shouldVirtualize = visibleItems.length > VIRTUALIZE_THRESHOLD;
  const totalHeight = visibleItems.length * ROW_HEIGHT;
  const startIndex = shouldVirtualize
    ? Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN)
    : 0;
  const endIndex = shouldVirtualize
    ? Math.min(visibleItems.length, Math.ceil((scrollTop + viewportHeight) / ROW_HEIGHT) + OVERSCAN)
    : visibleItems.length;
  const visibleSlice = visibleItems.slice(startIndex, endIndex);
  const offsetY = startIndex * ROW_HEIGHT;

  const handleKeyDown = (event) => {
    if (event.target?.tagName === 'INPUT' || event.target?.isContentEditable) {
      return;
    }
    if (!visiblePathsRef.current.length) {
      return;
    }
    if ((event.metaKey || event.ctrlKey) && !event.shiftKey && !event.altKey) {
      const key = event.key.toLowerCase();
      if (key === 'c') {
        event.preventDefault();
        handleCopySelection('copy');
        return;
      }
      if (key === 'x') {
        event.preventDefault();
        handleCopySelection('cut');
        return;
      }
      if (key === 'v') {
        event.preventDefault();
        handlePasteSelection();
        return;
      }
    }
    const scrollToPath = (path) => {
      const el = listRef.current;
      if (!el || !path) {
        return;
      }
      const index = rowIndexByPath.get(path);
      if (index == null) {
        return;
      }
      const top = index * ROW_HEIGHT;
      const bottom = top + ROW_HEIGHT;
      if (top < el.scrollTop) {
        el.scrollTop = top;
      } else if (bottom > el.scrollTop + el.clientHeight) {
        el.scrollTop = bottom - el.clientHeight;
      }
    };
    const currentIndex = visiblePathsRef.current.indexOf(focusedPath);
    const fallbackIndex = currentIndex >= 0 ? currentIndex : 0;
    const nextIndex = (delta) =>
      Math.min(visiblePathsRef.current.length - 1, Math.max(0, fallbackIndex + delta));

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      const next = visiblePathsRef.current[nextIndex(1)];
      if (next) {
        handleSelectPath(next, { shiftKey: event.shiftKey });
        setFocusedPath(next);
        scrollToPath(next);
      }
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      const next = visiblePathsRef.current[nextIndex(-1)];
      if (next) {
        handleSelectPath(next, { shiftKey: event.shiftKey });
        setFocusedPath(next);
        scrollToPath(next);
      }
      return;
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      const node = tree.nodes[focusedPath];
      if (node?.type === 'dir') {
        if (!expandedPaths.has(focusedPath)) {
          togglePath(focusedPath);
        } else {
          const firstChild = (tree.children[focusedPath] || [])[0];
          if (firstChild) {
            handleSelectPath(firstChild, { shiftKey: event.shiftKey });
            setFocusedPath(firstChild);
            scrollToPath(firstChild);
          }
        }
      }
      return;
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      const node = tree.nodes[focusedPath];
      if (node?.type === 'dir' && expandedPaths.has(focusedPath)) {
        togglePath(focusedPath);
        return;
      }
      const parent = explorerPathUtils.dirname(focusedPath);
      if (parent !== focusedPath && parent !== undefined) {
        handleSelectPath(parent, { shiftKey: event.shiftKey });
        setFocusedPath(parent);
        scrollToPath(parent);
      }
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      const node = tree.nodes[focusedPath];
      if (node?.type === 'dir') {
        togglePath(focusedPath);
      } else if (focusedPath) {
        onOpenFile?.({ path: focusedPath, mode: 'pinned' });
      }
      return;
    }
    if (event.key === 'F2') {
      if (focusedPath) {
        event.preventDefault();
        setRenameTarget({ path: focusedPath, value: explorerPathUtils.basename(focusedPath) });
      }
      return;
    }
    if (event.key === 'Delete' || event.key === 'Backspace') {
      if (selectionTargets.length) {
        event.preventDefault();
        handleDelete(selectionTargets);
      }
    }
  };

  return (
    <aside className="relative flex h-full w-full flex-col bg-sidebar select-none">
      <header
        data-testid="explorer-header"
        className="shrink-0 space-y-3 px-4 py-3 border-b border-border/50"
      >
        <div className="flex items-center justify-between">
          <div className="flex flex-col min-w-0">
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/50">Explorer</h2>
            <div className="flex items-center gap-1.5 mt-0.5">
               <span className="text-xs font-semibold text-foreground truncate">{activeRootLabel}</span>
               <div className="h-1 w-1 rounded-full bg-primary/40" />
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
                type="button"
                className="p-1 text-muted-foreground/60 hover:text-foreground transition-colors rounded hover:bg-muted/30"
                onClick={() => onJumpToAgents?.()}
                title="Go to Agent Cells"
            >
                <Layers size={14} strokeWidth={1.5} />
            </button>
            <button
                type="button"
                className="p-1 text-muted-foreground/60 hover:text-foreground transition-colors rounded hover:bg-muted/30"
                onClick={() => startDraft('file')}
                title="New File"
            >
                <FilePlus2 size={14} strokeWidth={1.5} />
            </button>
            <button
                type="button"
                className="p-1 text-muted-foreground/60 hover:text-foreground transition-colors rounded hover:bg-muted/30"
                onClick={() => startDraft('dir')}
                title="New Folder"
            >
                <FolderPlus size={14} strokeWidth={1.5} />
            </button>
            <button
                type="button"
                className="p-1 text-muted-foreground/60 hover:text-foreground transition-colors rounded hover:bg-muted/30"
                onClick={() => refreshAll()}
                title="Refresh"
            >
                <RefreshCw size={14} strokeWidth={1.5} className={Object.keys(loadingPaths).length > 0 ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {hasCells && (
          <div className="group relative">
            <select
              className="w-full appearance-none rounded border border-border/40 bg-muted/20 px-2 py-1.5 text-[11px] font-medium text-muted-foreground transition-all focus:border-primary/50 focus:outline-none hover:border-border/80 cursor-pointer"
              value={selectedId || ''}
              onChange={(event) => onSelectCell?.(event.target.value)}
            >
              {cells.map((cell) => (
                <option key={cell.id} value={cell.id}>
                  Agent: {cell.name}
                </option>
              ))}
            </select>
            <ChevronDown size={10} className="absolute right-2 top-2.5 text-muted-foreground/40 pointer-events-none group-hover:text-muted-foreground transition-colors" />
          </div>
        )}

        <div className="flex items-center gap-1.5">
          <div className="relative flex-1 group">
            <Search size={12} strokeWidth={2} className="absolute left-2.5 top-2 text-muted-foreground/30 group-focus-within:text-primary transition-colors" />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search files..."
              className="w-full rounded-full border border-border/40 bg-muted/10 px-8 py-1.5 text-[11px] text-foreground transition-all placeholder:text-muted-foreground/30 focus:bg-background focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/20"
            />
            {searchQuery && (
              <button
                type="button"
                className="absolute right-2.5 top-1.5 text-muted-foreground/40 hover:text-foreground"
                onClick={() => setSearchQuery('')}
              >
                <X size={12} strokeWidth={1.5} />
              </button>
            )}
          </div>
          <button
            type="button"
            data-testid="explorer-filter-toggle"
            data-explorer-filter-toggle
            className={`flex h-7 w-7 items-center justify-center rounded-full border transition-all ${
              hasActiveFilters
                ? 'border-primary/40 bg-primary/10 text-primary active-tab-glow'
                : 'border-border/40 text-muted-foreground/50 hover:border-border hover:text-foreground'
            }`}
            onClick={() => setFilterMenuOpen((value) => !value)}
            title="Explorer filters"
          >
            <Filter size={12} strokeWidth={1.5} />
          </button>
        </div>

        {searchTruncated && (
          <div className="flex items-center gap-1.5 px-1 text-[10px] text-amber-400/70 italic">
            <Info size={10} />
            Search results truncated
          </div>
        )}

        {selectionCount > 0 ? (
          <div className="flex items-center justify-between rounded border border-border/50 bg-muted/20 px-2 py-1 text-[10px] text-muted-foreground/80">
            <span>{selectionCount} selected</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                className="rounded border border-border/60 px-2 py-0.5 text-[10px] hover:text-foreground"
                onClick={() => handleCopyPath(selectionTargets)}
              >
                Copy Paths
              </button>
              <button
                type="button"
                className="rounded border border-rose-500/40 px-2 py-0.5 text-[10px] text-rose-300 hover:text-rose-200"
                onClick={() => handleDelete(selectionTargets)}
              >
                Delete
              </button>
              <button
                type="button"
                className="rounded border border-border/60 px-2 py-0.5 text-[10px] hover:text-foreground"
                onClick={clearSelection}
              >
                Clear
              </button>
            </div>
          </div>
        ) : null}
      </header>

      {filterMenuOpen && (
        <div
          data-explorer-filter-menu
          className="absolute right-4 top-[128px] z-50 w-56 rounded-lg border border-border/60 bg-popover/95 p-3 text-[11px] text-muted-foreground shadow-2xl backdrop-blur-md"
        >
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
            Visibility
          </div>
          <div className="space-y-1">
            <button
              type="button"
              className="flex w-full items-center justify-between rounded px-2 py-1 hover:bg-muted/40 hover:text-foreground"
              onClick={() => setShowHidden((value) => !value)}
            >
              <span>Show hidden</span>
              <span className={`h-3 w-3 rounded border ${showHidden ? 'bg-primary/50 border-primary/60' : 'border-border'}`} />
            </button>
            <button
              type="button"
              className="flex w-full items-center justify-between rounded px-2 py-1 hover:bg-muted/40 hover:text-foreground"
              onClick={() => setShowIgnored((value) => !value)}
            >
              <span>Show ignored</span>
              <span className={`h-3 w-3 rounded border ${showIgnored ? 'bg-primary/50 border-primary/60' : 'border-border'}`} />
            </button>
            <button
              type="button"
              className="flex w-full items-center justify-between rounded px-2 py-1 hover:bg-muted/40 hover:text-foreground"
              onClick={() => setShowChangesOnly((value) => !value)}
            >
              <span>Changes only</span>
              <span className={`h-3 w-3 rounded border ${showChangesOnly ? 'bg-primary/50 border-primary/60' : 'border-border'}`} />
            </button>
          </div>
          <div className="mt-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
            Status Filters
          </div>
          <div className="mt-2 grid grid-cols-2 gap-1">
            {STATUS_FILTERS.map((status) => {
              const active = statusFilterSet.has(status);
              return (
                <button
                  key={status}
                  type="button"
                  className={`flex items-center gap-2 rounded px-2 py-1 text-left hover:bg-muted/40 hover:text-foreground ${
                    active ? 'bg-muted/40 text-foreground' : ''
                  }`}
                  onClick={() => toggleStatusFilter(status)}
                >
                  <span
                    className={`rounded border px-1 text-[9px] font-semibold ${statusBadgeStyles[status]} ${statusColors[status]}`}
                  >
                    {statusBadges[status]}
                  </span>
                  <span className="truncate">{statusLabels[status] || status}</span>
                </button>
              );
            })}
          </div>
          {statusFilters.length > 0 ? (
            <button
              type="button"
              className="mt-3 w-full rounded border border-border/60 px-2 py-1 text-[10px] hover:text-foreground"
              onClick={() => setStatusFilters([])}
            >
              Clear status filters
            </button>
          ) : null}
        </div>
      )}

      {selectedCell ? (
        <div className="border-b border-border/50 px-4 py-2 text-[10px] text-muted-foreground/70">
          <div className="mb-1 text-[10px] font-semibold uppercase text-muted-foreground/60">
            Sessions
          </div>
          <div className="space-y-1">
            {(sessions || []).filter((session) => session.status !== 'closed').map((session) => {
              const key = `${selectedCell.id}:${session.id}`;
              const lastActivity = sessionActivityByKey?.[key];
              const fallbackTime = session.updatedAt ? new Date(session.updatedAt).getTime() : now;
              const idleMs = now - (lastActivity || fallbackTime);
              const isActive = session.id === activeSessionId;
              const statusLabel =
                session.status === 'detached'
                  ? 'Detached'
                  : session.status === 'stale'
                    ? 'Stale'
                    : isActive
                      ? 'Active'
                      : `Idle ${formatIdle(idleMs)}`;
              return (
                <div key={session.id} className="flex items-center justify-between gap-2">
                  <span className="truncate">{session.name || session.id}</span>
                  <span className={isActive ? 'text-emerald-400' : 'text-muted-foreground/50'}>
                    {statusLabel}
                  </span>
                </div>
              );
            })}
            {sessions && sessions.filter((session) => session.status !== 'closed').length === 0 ? (
              <div className="text-[10px] text-muted-foreground/50">No active sessions</div>
            ) : null}
          </div>
        </div>
      ) : null}

      {error && (
        <div className="mx-2 mt-2 flex items-start gap-2 rounded border border-rose-500/20 bg-rose-500/5 px-3 py-2 text-[11px] text-rose-300 animate-tab-in">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div
        ref={listRef}
        data-testid="explorer-tree"
        className="flex-1 overflow-y-auto px-1 py-2 focus:outline-none"
        tabIndex={0}
        onClick={() => closeContextMenu()}
        onKeyDown={handleKeyDown}
      >
        {visibleItems.length === 0 ? (
          <div className="px-3 py-2 text-xs text-muted-foreground/60">No files to display.</div>
        ) : shouldVirtualize ? (
          <div style={{ height: totalHeight, position: 'relative' }}>
            <div style={{ transform: `translateY(${offsetY}px)` }}>
              {visibleSlice.map((item) => renderRow(item))}
            </div>
          </div>
        ) : (
          <div>
            {visibleSlice.map((item) => renderRow(item))}
          </div>
        )}
      </div>

      {contextMenu && (
        <div
          className="fixed z-[70] w-48 rounded-lg border border-border/60 bg-popover/90 py-1 text-[11px] shadow-2xl backdrop-blur-md animate-tab-in"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={closeContextMenu}
        >
          <ContextMenuItem icon={FilePlus2} label="New File" onClick={() => startDraft('file')} />
          <ContextMenuItem icon={FolderPlus} label="New Folder" onClick={() => startDraft('dir')} />
          <div className="my-1 border-t border-border/40" />
          <ContextMenuItem
            icon={Pencil}
            label="Rename"
            onClick={() =>
              setRenameTarget({
                path: selectionTargets[0],
                value: explorerPathUtils.basename(selectionTargets[0]),
              })
            }
            disabled={selectionTargets.length !== 1}
          />
          <ContextMenuItem
            icon={Copy}
            label="Copy"
            onClick={() => handleCopySelection('copy')}
            disabled={!selectionTargets.length}
          />
          <ContextMenuItem
            icon={Scissors}
            label="Cut"
            onClick={() => handleCopySelection('cut')}
            disabled={!selectionTargets.length}
          />
          <ContextMenuItem
            icon={ClipboardPaste}
            label="Paste"
            onClick={handlePasteSelection}
            disabled={!canPaste}
          />
          <ContextMenuItem
            icon={Copy}
            label="Duplicate"
            onClick={() => handleDuplicate(selectionTargets[0])}
            disabled={selectionTargets.length !== 1}
          />
          <ContextMenuItem
            icon={Copy}
            label={selectionTargets.length > 1 ? 'Copy Paths' : 'Copy Path'}
            onClick={() => handleCopyPath(selectionTargets)}
            disabled={!selectionTargets.length}
          />
          <div className="my-1 border-t border-border/40" />
          <ContextMenuItem
            icon={Eye}
            label="Reveal in Finder"
            onClick={() => handleReveal(selectionTargets)}
            disabled={!selectionTargets.length}
          />
          <ContextMenuItem
            icon={Trash2}
            label={selectionTargets.length > 1 ? `Delete (${selectionTargets.length})` : 'Delete'}
            onClick={() => handleDelete(selectionTargets)}
            disabled={!selectionTargets.length}
            variant="destructive"
          />
          <div className="my-1 border-t border-border/40" />
          <ContextMenuItem icon={ArrowRightLeft} label="Clear Selection" onClick={() => { clearSelection(); closeContextMenu(); }} />
        </div>
      )}
    </aside>
  );
}

export function ProjectExplorerSidebar({
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
  projectReady,
  projectError,
  onSelectProject,
  recentProjects,
  onOpenRecentProject,
}) {
  if (!projectReady) {
    return (
      <aside className="flex w-full flex-col text-sidebar-foreground" data-testid="explorer-sidebar">
        <div className="flex items-center justify-between px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <span>Explorer</span>
        </div>
        <div className="flex-1 px-4 py-6 text-xs text-muted-foreground">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground/70">
            No project selected
          </div>
          <div className="mt-2 text-sm text-foreground">Choose a project to browse files.</div>
          {projectError ? (
            <div className="mt-2 text-rose-300">{projectError}</div>
          ) : null}
          <button
            type="button"
            onClick={onSelectProject}
            className="mt-4 inline-flex items-center gap-2 rounded-full border border-primary/40 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-primary transition-colors hover:bg-primary/10"
          >
            Select Project
          </button>
          <RecentProjectsList
            projects={recentProjects}
            onOpen={onOpenRecentProject}
            title="Recent Projects"
            emptyLabel="No recent projects yet"
          />
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
      projectReady={projectReady}
      projectError={projectError}
      onSelectProject={onSelectProject}
      recentProjects={recentProjects}
      onOpenRecentProject={onOpenRecentProject}
    />
  );
}

function ContextMenuItem({ icon: Icon, label, onClick, disabled, variant }) {
    return (
        <button
            className={`flex w-full items-center gap-2.5 px-3 py-1.5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
                variant === 'destructive' 
                    ? 'text-rose-400 hover:bg-rose-500/10' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
            onClick={(e) => { e.stopPropagation(); !disabled && onClick(); }}
            disabled={disabled}
        >
            <Icon size={12} strokeWidth={1.5} />
            <span className="truncate">{label}</span>
        </button>
    );
}
