import React from 'react';
import { 
  ChevronRight, 
  ChevronDown, 
  FolderClosed, 
  FolderOpen, 
  RefreshCw, 
  EyeOff, 
  Link2,
  FolderPlus,
  FilePlus2
} from 'lucide-react';
import { getFileIcon, getFolderIcon, statusColors, statusBadges } from './explorerUtils.jsx';

export function ExplorerItem({
  item,
  node,
  isSelected,
  isFocused,
  isLoading,
  isExpanded,
  isSearchActive,
  isOpen,
  isDirty,
  isIgnored,
  status,
  added,
  deleted,
  cellBadges,
  depth,
  onToggle,
  onClick,
  onDoubleClick,
  onContextMenu,
  onDragStart,
  onDragOver,
  onDrop,
  renameTarget,
  handleRenameSubmit,
  setRenameTarget,
}) {
  const isDir = item.type === 'dir';
  const isLink = item.isSymbolicLink;
  const isUntracked = status === 'untracked';
  const isAdded = status === 'added';

  const FileIcon = isDir ? getFolderIcon(node.name, isExpanded) : getFileIcon(node.name, isLink);

  const paddingLeft = `${depth * 12 + 8}px`;

  if (item.draft) {
    return (
      <div
        className="flex items-center gap-2 px-2 py-1 text-xs"
        style={{ paddingLeft: `${item.depth * 12 + 24}px` }}
      >
        <span className="text-xs text-muted-foreground">
          {item.type === 'dir' ? <FolderPlus size={12} strokeWidth={1.5} /> : <FilePlus2 size={12} strokeWidth={1.5} />}
        </span>
        <input
          autoFocus
          className="flex-1 rounded border border-border bg-transparent px-1 text-xs text-foreground focus:outline-none"
          placeholder={item.type === 'dir' ? 'New folder' : 'New file'}
          onBlur={item.onBlur}
          onKeyDown={item.onKeyDown}
          onChange={item.onChange}
          value={item.value}
        />
      </div>
    );
  }

  return (
    <div
      data-explorer-path={item.path}
      className={`group flex items-center gap-2 rounded px-2 py-1 text-xs transition-colors relative select-none ${
        isSelected ? 'bg-primary/20 text-foreground' : 'text-muted-foreground hover:text-foreground'
      } ${isIgnored ? 'opacity-70' : ''} ${isFocused ? 'ring-1 ring-primary/30' : ''}`}
      style={{ paddingLeft }}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {/* Expander */}
      {isDir ? (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onToggle(); }}
          className="text-muted-foreground/60 hover:text-foreground shrink-0"
        >
          {isExpanded ? <ChevronDown size={14} strokeWidth={1.5} /> : <ChevronRight size={14} strokeWidth={1.5} />}
        </button>
      ) : (
        <span className="w-4 shrink-0" />
      )}

      {/* Icon with status overlays */}
      <div className="relative shrink-0">
        <FileIcon
          size={14}
          strokeWidth={1.5}
          className={
            isDir
              ? 'text-primary/70'
              : isLink
                ? 'text-sky-400'
                : isIgnored
                  ? 'text-slate-400/40'
                  : 'text-muted-foreground/70'
          }
        />
        {isLink && (
          <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-[0.5px] ring-1 ring-sky-500/50">
            <Link2 size={8} className="text-sky-400" strokeWidth={3} />
          </div>
        )}
        {isIgnored && (
          <div className="absolute -top-1 -right-1 bg-background rounded-full p-[0.5px] opacity-40 group-hover:opacity-100 transition-opacity">
            <EyeOff size={8} className="text-slate-400" strokeWidth={2} />
          </div>
        )}
      </div>

      {/* Name / Rename Input */}
      {renameTarget ? (
        <input
          autoFocus
          className="flex-1 rounded border border-border bg-transparent px-1 text-xs text-foreground focus:outline-none"
          value={renameTarget.value}
          onChange={(e) => setRenameTarget(prev => ({ ...prev, value: e.target.value }))}
          onBlur={handleRenameSubmit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleRenameSubmit();
            if (e.key === 'Escape') setRenameTarget(null);
          }}
        />
      ) : (
        <div className="flex flex-1 items-center gap-2 min-w-0">
          <span className={`truncate ${isIgnored ? 'text-muted-foreground/30 line-through decoration-muted-foreground/10' : ''}`}>
            {node.name}
          </span>
          {isOpen && <span className="h-1 w-1 rounded-full bg-sky-400/60" title="Open" />}
          {isDirty && <span className="h-1 w-1 rounded-full bg-amber-400/60 shadow-[0_0_5px_rgba(251,191,36,0.3)]" title="Dirty" />}
          {isLink && (
            <span className="shrink-0 px-1 rounded-[2px] bg-sky-500/10 border border-sky-500/20 text-[8px] font-bold uppercase tracking-tighter text-sky-400">
              Link
            </span>
          )}
          {isIgnored && (
              <span className="shrink-0 text-[8px] font-bold uppercase tracking-widest text-muted-foreground/20 italic">
                  Ignored
              </span>
          )}
          {isUntracked && !isIgnored && (
            <span className="shrink-0 text-[8px] font-black uppercase tracking-tighter text-lime-400/60">
              untracked
            </span>
          )}
          {isAdded && !isIgnored && (
            <span className="shrink-0 text-[8px] font-black uppercase tracking-tighter text-emerald-400/60">
              added
            </span>
          )}
        </div>
      )}

      {/* Git Status Badge */}
      {status && (
        <div className="flex items-center pr-1 opacity-40 group-hover:opacity-100 transition-opacity">
            <span className={`text-[9px] font-black uppercase tracking-tighter ${statusColors[status]}`}>
                {statusBadges[status]}
            </span>
        </div>
      )}

      {/* Diff Counts */}
      {(added > 0 || deleted > 0) && (
        <div className="flex items-center gap-0.5 text-[8px] font-bold opacity-40 group-hover:opacity-100 transition-opacity">
          {added > 0 && <span className="text-emerald-500/50">+{added}</span>}
          {deleted > 0 && <span className="text-rose-500/50">-{deleted}</span>}
        </div>
      )}

      {/* Agent Badges */}
      {cellBadges}

      {/* Loading Indicator */}
      {isLoading && <RefreshCw size={12} className="animate-spin text-muted-foreground/50" />}
    </div>
  );
}
