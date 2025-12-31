import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  Pencil,
  Trash2,
  ArrowRightLeft,
  Eye,
  EyeOff,
  Filter,
  Link2,
  AlertCircle,
  Info,
} from 'lucide-react';

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
import { useProjectExplorer, explorerPathUtils } from '../../hooks/useProjectExplorer.js';

const statusColors = {
  added: 'text-emerald-400',
  modified: 'text-amber-300',
  deleted: 'text-rose-400',
  renamed: 'text-sky-400',
  copied: 'text-sky-400',
  untracked: 'text-lime-300',
  ignored: 'text-muted-foreground/70',
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
  ignored: 'border-muted-foreground/30 bg-muted/30',
  conflict: 'border-rose-500/50 bg-rose-500/15',
};

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
}) {
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
    searchResults,
    searchTruncated,
    searchTree,
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
  } = useProjectExplorer({ rootPath: scopeRootPath, rootLabel: scopeRootLabel });

  const [draftEntry, setDraftEntry] = useState(null);
  const [renameTarget, setRenameTarget] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [now, setNow] = useState(Date.now());

  const isSearchActive = searchQuery.trim().length > 0;
  const tree = isSearchActive ? searchTree : { nodes: nodesByPath, children: childrenByPath };

  const activeRootLabel = rootLabel || 'Project';
  const hasCells = cells && cells.length > 0;
  const selectedCellId = selectedCell?.id || null;

  const selectionSet = useMemo(() => new Set(selectedPaths), [selectedPaths]);
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

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(interval);
  }, []);

  const closeContextMenu = () => setContextMenu(null);

  const activeTarget = contextMenu?.path || selectedPaths[0] || '';
  const activeNode = tree.nodes[activeTarget];
  const activeDir =
    activeNode?.type === 'dir' ? activeTarget : explorerPathUtils.dirname(activeTarget);

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

  const handleCopyPath = async (targetPath) => {
    try {
      const base = rootPath || repoRoot || '';
      const fullPath = base ? `${base}/${targetPath}` : targetPath;
      await navigator.clipboard.writeText(fullPath);
    } catch (err) {
      // ignore clipboard errors silently
    }
  };

  const handleDelete = async (targetPath) => {
    const confirmed = window.confirm(`Delete ${targetPath}? This cannot be undone.`);
    if (!confirmed) {
      return;
    }
    try {
      await deleteEntry({ targetPath });
      setSelectedPaths((current) => current.filter((item) => item !== targetPath));
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

  const renderNode = (path, depth = 0) => {
    const node = tree.nodes[path];
    if (!node) {
      return null;
    }
    if (showChangesOnly && path) {
      const hasChange =
        node.type === 'dir' ? Boolean(folderStatusByPath[path]) : Boolean(statusByPath[path]);
      if (!hasChange) {
        return null;
      }
    }
    const isDir = node.type === 'dir';
    const isExpanded = isSearchActive ? true : expandedPaths.has(path);
    const isSelected = selectionSet.has(path);
    const isLoading = loadingPaths.has(path);
    const showDraft = draftEntry?.parentPath === path;
    const isRenaming = renameTarget?.path === path;
    const isLink = node.isSymbolicLink;

    const directEntry = statusByPath[path];
    const aggregateEntry = isDir ? folderStatusByPath[path] : null;
    const scopedEntry = getScopedEntry(directEntry || aggregateEntry, isDir ? 'dir' : 'file');
    let status = scopedEntry?.status || null;
    if (isDir && !directEntry && status === 'ignored') {
      status = null;
    }
    const isIgnored = (directEntry?.status === 'ignored') || hasIgnoredAncestor(path);
    const isUntracked = status === 'untracked';
    const isAdded = status === 'added';

    const FileIcon = isDir ? (isExpanded ? FolderOpen : FolderClosed) : getFileIcon(node.name, isLink);

    const row = path ? (
      <div
        className={`group flex items-center gap-2 rounded px-2 py-1 text-xs transition-colors relative ${
          isSelected ? 'bg-primary/20 text-foreground' : 'text-muted-foreground hover:text-foreground'
        } ${isIgnored ? 'opacity-50 italic' : ''}`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={(event) => {
          handleSelectPath(path, event);
          if (!isDir && !event.metaKey && !event.ctrlKey && !event.shiftKey) {
            onOpenFile?.({ path, mode: 'preview' });
          }
        }}
        onDoubleClick={(event) => {
          if (!isDir) {
            event.stopPropagation();
            onOpenFile?.({ path, mode: 'pinned' });
          }
        }}
        onContextMenu={(event) => {
          event.preventDefault();
          handleSelectPath(path, event);
          setContextMenu({
            x: event.clientX,
            y: event.clientY,
            path,
          });
        }}
        draggable
        onDragStart={(event) => {
          const payload = buildDragPayload(path);
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
          await handleMove(paths, path);
        }}
      >
        {isDir ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              togglePath(path);
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
                className={isDir ? "text-primary/70" : (isLink ? "text-sky-400" : (isIgnored ? "text-muted-foreground/30" : "text-muted-foreground/70"))} 
            />
            {isLink && (
                 <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-[0.5px] ring-1 ring-sky-500/50">
                    <Link2 size={8} className="text-sky-400" strokeWidth={3} />
                 </div>
            )}
            {isIgnored && (
                 <div className="absolute -top-1 -right-1 bg-background rounded-full p-[0.5px]">
                    <EyeOff size={8} className="text-muted-foreground/60" strokeWidth={2} />
                 </div>
            )}
        </div>

        {isRenaming ? (
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
            <span className={`truncate select-none ${isIgnored ? 'text-muted-foreground/40 line-through decoration-muted-foreground/20' : ''}`}>
                {node.name}
            </span>
            {isLink && (
                <span className="shrink-0 px-1 rounded-[2px] bg-sky-500/10 border border-sky-500/20 text-[8px] font-bold uppercase tracking-tighter text-sky-400">
                    Link
                </span>
            )}
            {isIgnored && (
                <span className="shrink-0 text-[8px] font-medium text-muted-foreground/30 italic">
                    ignored
                </span>
            )}
            {isUntracked && !isIgnored && (
              <span className="shrink-0 text-[8px] font-semibold uppercase tracking-tight text-lime-300">
                untracked
              </span>
            )}
            {isAdded && !isIgnored && (
              <span className="shrink-0 text-[8px] font-semibold uppercase tracking-tight text-emerald-300">
                added
              </span>
            )}
          </div>
        )}
        {renderStatus(path, node.type)}
        {renderCellBadges(path, node.type)}
        {isLoading && <RefreshCw size={12} className="animate-spin text-muted-foreground/50" />}
      </div>
    ) : null;

    return (
      <div key={path || 'root'}>
        {row}
        {isDir && isExpanded && showDraft ? (
          <div
            className="flex items-center gap-2 px-2 py-1"
            style={{ paddingLeft: `${depth * 12 + 24}px` }}
          >
            <span className="text-xs text-muted-foreground">
              {draftEntry.type === 'dir' ? <FolderPlus size={12} strokeWidth={1.5} /> : <FilePlus2 size={12} strokeWidth={1.5} />}
            </span>
            <input
              autoFocus
              value={draftEntry.value}
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
              placeholder={draftEntry.type === 'dir' ? 'New folder' : 'New file'}
            />
          </div>
        ) : null}
        {isDir && isExpanded
          ? (tree.children[path] || []).map((child) => renderNode(child, depth + 1))
          : null}
      </div>
    );
  };

  return (
    <aside className="flex h-full w-full flex-col bg-sidebar select-none">
      <header className="shrink-0 space-y-3 px-4 py-3 border-b border-border/50">
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
            className={`flex h-7 w-7 items-center justify-center rounded-full border transition-all ${
              showChangesOnly ? 'border-primary/40 bg-primary/10 text-primary active-tab-glow' : 'border-border/40 text-muted-foreground/50 hover:border-border hover:text-foreground'
            }`}
            onClick={() => setShowChangesOnly((value) => !value)}
            title="Changes Only"
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
      </header>

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

      <div className="flex-1 overflow-y-auto px-1 py-2" onClick={() => closeContextMenu()}>
        {renderNode('')}
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
          <ContextMenuItem icon={Pencil} label="Rename" onClick={() => setRenameTarget({ path: activeTarget, value: explorerPathUtils.basename(activeTarget) })} disabled={!activeTarget} />
          <ContextMenuItem icon={Copy} label="Duplicate" onClick={() => handleDuplicate(activeTarget)} disabled={!activeTarget} />
          <ContextMenuItem icon={Copy} label="Copy Path" onClick={() => handleCopyPath(activeTarget)} disabled={!activeTarget} />
          <div className="my-1 border-t border-border/40" />
          <ContextMenuItem icon={Eye} label="Reveal in Finder" onClick={() => revealEntry({ targetPath: activeTarget })} disabled={!activeTarget} />
          <ContextMenuItem icon={Trash2} label="Delete" onClick={() => handleDelete(activeTarget)} disabled={!activeTarget} variant="destructive" />
          <div className="my-1 border-t border-border/40" />
          <ContextMenuItem icon={ArrowRightLeft} label="Clear Selection" onClick={() => { clearSelection(); closeContextMenu(); }} />
        </div>
      )}
    </aside>
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
