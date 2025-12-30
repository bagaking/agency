import React, { useMemo, useState } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Folder,
  File,
  RefreshCw,
  FilePlus,
  FolderPlus,
  Search,
  X,
  Copy,
  Pencil,
  Trash2,
  ArrowRightLeft,
  Eye,
  Filter,
} from 'lucide-react';
import { useProjectExplorer, explorerPathUtils } from '../../hooks/useProjectExplorer.js';

const statusColors = {
  added: 'text-emerald-400',
  modified: 'text-amber-300',
  deleted: 'text-rose-400',
  renamed: 'text-sky-400',
  copied: 'text-sky-400',
  untracked: 'text-emerald-300',
  ignored: 'text-muted-foreground',
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

export function ProjectExplorerSidebar({
  rootPath: scopeRootPath,
  rootLabel: scopeRootLabel,
  cells,
  selectedId,
  onSelectCell,
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

  const isSearchActive = searchQuery.trim().length > 0;
  const tree = isSearchActive ? searchTree : { nodes: nodesByPath, children: childrenByPath };

  const activeRootLabel = rootLabel || 'Project';
  const hasCells = cells && cells.length > 0;

  const selectionSet = useMemo(() => new Set(selectedPaths), [selectedPaths]);

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
    const entry = type === 'dir' ? folderStatusByPath[path] : statusByPath[path];
    if (!entry) {
      return null;
    }
    const status = entry.status;
    const badge = statusBadges[status] || '?';
    const color = statusColors[status] || 'text-muted-foreground';
    const added = entry.added || 0;
    const deleted = entry.deleted || 0;
    return (
      <div className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground">
        <span className={`rounded border border-border px-1 ${color}`} title={statusLabels[status] || status}>
          {badge}
        </span>
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

    const row = path ? (
      <div
        className={`group flex items-center gap-2 rounded px-2 py-1 text-xs transition-colors ${
          isSelected ? 'bg-primary/20 text-foreground' : 'text-muted-foreground hover:text-foreground'
        }`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={(event) => {
          handleSelectPath(path, event);
          if (!isDir && !event.metaKey && !event.ctrlKey && !event.shiftKey) {
            onOpenFile?.(path);
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
            className="text-muted-foreground/60 hover:text-muted-foreground"
          >
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        ) : (
          <span className="w-4" />
        )}
        {isDir ? <Folder size={14} /> : <File size={14} />}
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
          <span className="flex-1 truncate">{node.name}</span>
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
              {draftEntry.type === 'dir' ? <FolderPlus size={12} /> : <FilePlus size={12} />}
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
    <aside className="flex w-full flex-col">
      <header className="border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-foreground">Explorer</div>
            <div
              className="text-[11px] text-muted-foreground/70 truncate"
              title={rootPath || repoRoot}
            >
              {activeRootLabel}
            </div>
          </div>
          <button
            type="button"
            className="rounded border border-border p-1 text-muted-foreground hover:text-foreground"
            onClick={() => refreshAll()}
            title="Refresh"
          >
            <RefreshCw size={14} />
          </button>
        </div>
        {hasCells ? (
          <div className="mt-2 flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase text-muted-foreground/60">
              Scope
            </span>
            <select
              className="flex-1 rounded border border-border bg-transparent px-2 py-1 text-xs text-foreground focus:outline-none"
              value={selectedId || ''}
              onChange={(event) => onSelectCell?.(event.target.value)}
            >
              {cells.map((cell) => (
                <option key={cell.id} value={cell.id}>
                  {cell.name}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="mt-2 text-[10px] text-muted-foreground/60">
            Repository scope (no active Cells).
          </div>
        )}
        <div className="mt-3 flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={12} className="absolute left-2 top-2.5 text-muted-foreground/60" />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Filter files..."
              className="w-full rounded border border-border bg-transparent px-7 py-1.5 text-xs text-foreground focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                className="absolute right-2 top-2 text-muted-foreground/60 hover:text-foreground"
                onClick={() => setSearchQuery('')}
              >
                <X size={12} />
              </button>
            )}
          </div>
          <button
            type="button"
            className={`rounded border px-2 py-1 text-[10px] ${
              showChangesOnly ? 'border-primary text-primary' : 'border-border text-muted-foreground'
            }`}
            onClick={() => setShowChangesOnly((value) => !value)}
            title="Show changes only"
          >
            <Filter size={12} />
          </button>
        </div>
        {searchTruncated && (
          <div className="mt-2 text-[10px] text-amber-200/70">
            Search limited to first {searchResults.length} matches.
          </div>
        )}
      </header>

      <div className="flex items-center gap-2 border-b border-border px-4 py-2 text-[10px] text-muted-foreground/70">
        <button
          type="button"
          className="rounded border border-border px-2 py-1 hover:text-foreground"
          onClick={() => startDraft('file')}
        >
          <FilePlus size={12} />
        </button>
        <button
          type="button"
          className="rounded border border-border px-2 py-1 hover:text-foreground"
          onClick={() => startDraft('dir')}
        >
          <FolderPlus size={12} />
        </button>
        <span className="text-[10px]">New</span>
      </div>

      {error && (
        <div className="border-b border-border px-4 py-2 text-xs text-rose-300">
          {error}
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-1 py-2" onClick={() => closeContextMenu()}>
        {renderNode('')}
      </div>

      {contextMenu && (
        <div
          className="fixed z-[70] w-48 rounded border border-border bg-popover py-1 text-xs shadow-xl"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={closeContextMenu}
        >
          <button
            className="flex w-full items-center gap-2 px-3 py-1.5 text-muted-foreground hover:text-foreground hover:bg-muted"
            onClick={() => startDraft('file')}
          >
            <FilePlus size={12} /> New File
          </button>
          <button
            className="flex w-full items-center gap-2 px-3 py-1.5 text-muted-foreground hover:text-foreground hover:bg-muted"
            onClick={() => startDraft('dir')}
          >
            <FolderPlus size={12} /> New Folder
          </button>
          <button
            className="flex w-full items-center gap-2 px-3 py-1.5 text-muted-foreground hover:text-foreground hover:bg-muted"
            onClick={() =>
              setRenameTarget({
                path: activeTarget,
                value: explorerPathUtils.basename(activeTarget),
              })
            }
            disabled={!activeTarget}
          >
            <Pencil size={12} /> Rename
          </button>
          <button
            className="flex w-full items-center gap-2 px-3 py-1.5 text-muted-foreground hover:text-foreground hover:bg-muted"
            onClick={() => handleDuplicate(activeTarget)}
            disabled={!activeTarget}
          >
            <Copy size={12} /> Duplicate
          </button>
          <button
            className="flex w-full items-center gap-2 px-3 py-1.5 text-muted-foreground hover:text-foreground hover:bg-muted"
            onClick={() => handleCopyPath(activeTarget)}
            disabled={!activeTarget}
          >
            <Copy size={12} /> Copy Path
          </button>
          <button
            className="flex w-full items-center gap-2 px-3 py-1.5 text-muted-foreground hover:text-foreground hover:bg-muted"
            onClick={() => revealEntry({ targetPath: activeTarget })}
            disabled={!activeTarget}
          >
            <Eye size={12} /> Reveal in Finder
          </button>
          <button
            className="flex w-full items-center gap-2 px-3 py-1.5 text-rose-300 hover:bg-rose-500/10"
            onClick={() => handleDelete(activeTarget)}
            disabled={!activeTarget}
          >
            <Trash2 size={12} /> Delete
          </button>
          <button
            className="flex w-full items-center gap-2 px-3 py-1.5 text-muted-foreground hover:text-foreground hover:bg-muted"
            onClick={() => {
              clearSelection();
              closeContextMenu();
            }}
          >
            <ArrowRightLeft size={12} /> Clear Selection
          </button>
        </div>
      )}
    </aside>
  );
}
