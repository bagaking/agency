import React from 'react';
import { 
  ChevronRight, 
  ChevronDown, 
  FolderClosed, 
  FolderOpen, 
  RefreshCw, 
  EyeOff, 
  Link2,
  MessageSquare,
  FolderPlus,
  FilePlus2
} from 'lucide-react';
import {
  getFileIcon,
  getFolderIcon,
  statusBadgeStyles,
  statusBadges,
  statusColors,
  statusLabels,
} from './explorerUtils';
import { Tooltip } from '../ui/Tooltip';
import { focusRing } from '../ui/focusRing';

export function ExplorerItem({
  item,
  node,
  treeItemId,
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
  semanticTags,
  commentCount,
  onJumpToComments,
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
}: any) {
  const isDir = item.type === 'dir';
  const isLink = item.isSymbolicLink;
  const isUntracked = status === 'untracked';
  const isAdded = status === 'added';
  const hasComments = Number(commentCount) > 0;
  const primarySemanticTag = Array.isArray(semanticTags) ? semanticTags[0] : null;
  const semanticOverflowCount = Array.isArray(semanticTags) && semanticTags.length > 1 ? semanticTags.length - 1 : 0;
  const focusRingClass = focusRing.sidebar;

  const iconInfo = isDir ? null : getFileIcon(node.name, isLink);
  const FileIcon = isDir ? getFolderIcon(node.name, isExpanded) : iconInfo.icon;
  const iconColor = isDir ? 'text-primary/70' : iconInfo.color;

  const paddingLeft = `${depth * 12 + 8}px`;
  const ariaLevel = depth + 1;
  const statusLabel = status ? statusLabels[status] || status : '';
  const rowAriaLabel = [
    node.name,
    isDir ? 'folder' : 'file',
    statusLabel ? `${statusLabel} git status` : '',
    isIgnored ? 'ignored' : '',
    isOpen ? 'open in workbench' : '',
    isDirty ? 'has unsaved changes' : '',
    primarySemanticTag ? `semantic file ${primarySemanticTag.label || primarySemanticTag.id}` : '',
    hasComments ? `${commentCount} comment${commentCount === 1 ? '' : 's'}` : '',
  ]
    .filter(Boolean)
    .join(', ');

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
          aria-label={item.type === 'dir' ? 'New folder name' : 'New file name'}
          className="flex-1 rounded border border-border bg-transparent px-1 text-xs text-foreground focus:outline-none select-text"
          placeholder={item.type === 'dir' ? 'New folder' : 'New file'}
          onBlur={item.onBlur}
          onKeyDown={item.onKeyDown}
          onChange={item.onChange}
          value={item.value}
          onMouseDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
        />
      </div>
    );
  }

  return (
    <div
      id={treeItemId}
      role="treeitem"
      aria-label={rowAriaLabel || node.name}
      aria-level={ariaLevel}
      aria-selected={isSelected}
      aria-expanded={isDir ? isExpanded : undefined}
      aria-busy={isLoading || undefined}
      aria-setsize={item.setSize || undefined}
      aria-posinset={item.posInSet || undefined}
      data-explorer-path={item.path}
      className={`group relative flex h-7 items-center gap-2 rounded-md border border-transparent border-l-2 px-2 py-1 text-xs transition-colors select-none ${
        isSelected
          ? 'border-l-primary border-white/10 bg-primary/[0.16] text-foreground shadow-[inset_0_0_0_1px_rgba(59,130,246,0.12)]'
          : isFocused
            ? 'border-l-primary/60 bg-white/[0.045] text-foreground'
            : 'border-l-transparent text-muted-foreground/90 hover:bg-white/[0.04] hover:text-foreground'
      } ${isIgnored ? 'opacity-90' : ''}`}
      style={{ paddingLeft }}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
      draggable={!renameTarget}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {/* Expander */}
      {isDir ? (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onToggle(); }}
          aria-label={isExpanded ? `Collapse ${node.name}` : `Expand ${node.name}`}
          aria-expanded={isExpanded}
          tabIndex={-1}
          className={`shrink-0 rounded-sm text-muted-foreground/70 transition-colors hover:bg-white/5 hover:text-foreground ${focusRingClass}`}
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
            isIgnored
              ? 'text-slate-300/70'
              : iconColor
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
          aria-label={`Rename ${node.name}`}
          className="flex-1 rounded border border-border bg-transparent px-1 text-xs text-foreground focus:outline-none select-text"
          value={renameTarget.value}
          onChange={(e) => setRenameTarget(prev => ({ ...prev, value: e.target.value }))}
          onBlur={handleRenameSubmit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleRenameSubmit();
            if (e.key === 'Escape') setRenameTarget(null);
          }}
          onMouseDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
        />
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span
            title={node.name}
            className={`truncate font-medium ${isIgnored ? 'text-muted-foreground/70 line-through decoration-muted-foreground/40' : ''}`}
          >
            {node.name}
          </span>
        </div>
      )}

      {!renameTarget ? (
        <div className="ml-auto flex shrink-0 items-center gap-1.5 pl-2">
          {isOpen && (
            <span className="shrink-0 rounded-full border border-sky-400/20 bg-sky-500/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-sky-200">
              Open
            </span>
          )}
          {isDirty && (
            <span className="shrink-0 rounded-full border border-amber-400/20 bg-amber-400/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-amber-200">
              Dirty
            </span>
          )}
          {isLink && (
            <span className="shrink-0 rounded-[3px] border border-sky-500/20 bg-sky-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-tight text-sky-300">
              Link
            </span>
          )}
          {isIgnored && (
            <span className="shrink-0 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground/75 italic">
              Ignored
            </span>
          )}
          {isUntracked && !isIgnored && (
            <span className="shrink-0 rounded-[3px] border border-lime-500/20 bg-lime-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-tight text-lime-300">
              Untracked
            </span>
          )}
          {isAdded && !isIgnored && (
            <span className="shrink-0 rounded-[3px] border border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-tight text-emerald-300">
              Added
            </span>
          )}
          {primarySemanticTag && (
            <span className="shrink-0 rounded-[3px] border border-sky-400/30 bg-sky-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-tight text-sky-100">
              {primarySemanticTag.label || primarySemanticTag.id}
            </span>
          )}
          {semanticOverflowCount > 0 && (
            <span className="shrink-0 text-[9px] font-semibold uppercase tracking-tight text-sky-200/80">
              +{semanticOverflowCount}
            </span>
          )}

          {/* Git Status Badge */}
          {status && (
            <span
              className={`inline-flex rounded-[3px] border px-1.5 py-0.5 text-[9px] font-black uppercase tracking-[0.14em] ${statusColors[status]} ${statusBadgeStyles[status] || ''}`}
              title={statusLabel}
            >
              {statusBadges[status]}
            </span>
          )}

          {/* Diff Counts */}
          {(added > 0 || deleted > 0) && (
            <div className="flex items-center gap-1 text-[9px] font-semibold">
              {added > 0 && <span className="text-emerald-300">+{added}</span>}
              {deleted > 0 && <span className="text-rose-300">-{deleted}</span>}
            </div>
          )}

          {/* Agent Badges */}
          {cellBadges}

          {/* Comment Indicator */}
          {hasComments && !isDir && (
            <Tooltip label={`View ${commentCount} comment${commentCount === 1 ? '' : 's'}`}>
              <button
                type="button"
                tabIndex={isFocused ? 0 : -1}
                className={`flex items-center gap-1 rounded-md border border-white/10 px-1.5 py-0.5 text-muted-foreground/70 transition-colors hover:border-primary/30 hover:bg-primary/10 hover:text-primary ${focusRingClass}`}
                onClick={(event) => {
                  event.stopPropagation();
                  onJumpToComments?.(item.path);
                }}
                aria-label={`View ${commentCount} comment${commentCount === 1 ? '' : 's'} for ${node.name}`}
              >
                <MessageSquare size={12} strokeWidth={1.5} />
                <span className="text-[9px] font-semibold tabular-nums">{commentCount}</span>
              </button>
            </Tooltip>
          )}

          {/* Loading Indicator */}
          {isLoading && <RefreshCw size={12} className="animate-spin text-muted-foreground/70" />}
        </div>
      ) : null}
    </div>
  );
}
