import React from 'react';
import { 
  ChevronRight, 
  ChevronDown, 
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
  resolveExplorerNodeName,
  statusBadges,
  statusLabels,
  statusMarkToneClasses,
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
  onNameDoubleClick,
  onContextMenu,
  onDragStart,
  onDragOver,
  onDrop,
  renameTarget,
  handleRenameSubmit,
  setRenameTarget,
}: any) {
  const isDraftComposingRef = React.useRef(false);
  const isRenameComposingRef = React.useRef(false);
  const isDir = item.type === 'dir';
  const isLink = item.isSymbolicLink;
  const nodeName = resolveExplorerNodeName(node, item.path);
  const symlinkBoundaryState = node?.symlinkBoundaryState;
  const canExpand = isDir && symlinkBoundaryState !== 'outside-root' && symlinkBoundaryState !== 'cycle' && symlinkBoundaryState !== 'broken';
  const symlinkBoundaryLabel =
    symlinkBoundaryState === 'outside-root'
      ? 'Symbolic link resolves outside workspace'
      : symlinkBoundaryState === 'cycle'
        ? 'Symbolic link cycle blocked'
        : symlinkBoundaryState === 'broken'
          ? 'Broken symbolic link'
          : isLink
            ? 'Symbolic link'
            : '';
  const hasComments = Number(commentCount) > 0;
  const primarySemanticTag = Array.isArray(semanticTags) ? semanticTags[0] : null;
  const semanticOverflowCount = Array.isArray(semanticTags) && semanticTags.length > 1 ? semanticTags.length - 1 : 0;
  const focusRingClass = focusRing.sidebar;

  const iconInfo = isDir ? null : getFileIcon(nodeName, isLink);
  const FileIcon = isDir ? getFolderIcon(nodeName, isExpanded) : iconInfo.icon;
  const iconColor = isDir ? 'text-primary/70' : iconInfo.color;

  const paddingLeft = `${depth * 12 + 8}px`;
  const ariaLevel = depth + 1;
  const statusLabel = status ? statusLabels[status] || status : '';
  const rowAriaLabel = [
    nodeName,
    isDir ? 'folder' : 'file',
    statusLabel ? `${statusLabel} git status` : '',
    isIgnored ? 'ignored' : '',
    isOpen ? 'open in workbench' : '',
    isDirty ? 'has unsaved changes' : '',
    symlinkBoundaryLabel ? symlinkBoundaryLabel.toLowerCase() : '',
    primarySemanticTag ? `semantic file ${primarySemanticTag.label || primarySemanticTag.id}` : '',
    hasComments ? `${commentCount} comment${commentCount === 1 ? '' : 's'}` : '',
  ]
    .filter(Boolean)
    .join(', ');

  const rowStateBadgeBase = 'flex h-4 items-center justify-center rounded-full border border-white/10 px-2 text-[8px] font-semibold uppercase tracking-[0.18em]';
  const rowStateBadge = isDirty
    ? {
        key: 'dirty',
        label: 'Dirty',
        className: `${rowStateBadgeBase} bg-amber-400/[0.12] text-amber-200/90 border-amber-200/40`,
      }
    : isOpen
      ? {
          key: 'open',
          label: 'Open',
          className: `${rowStateBadgeBase} bg-sky-500/[0.12] text-sky-200/88 border-sky-200/34`,
        }
      : null;

  const baseRowClass = 'group relative flex h-7 items-center gap-2 rounded-md border border-transparent border-l-2 px-2 py-1 text-xs transition-colors select-none';
  const selectedRowClass = 'border-l-primary border-white/10 bg-primary/[0.17] text-foreground shadow-[inset_0_0_0_1px_rgba(59,130,246,0.14)]';
  const focusedRowClass = 'border-l-primary/70 bg-white/[0.065] text-foreground shadow-[inset_0_0_0_1px_rgba(255,255,255,0.045)]';
  const idleRowClass = 'border-l-transparent text-muted-foreground/80 hover:border-l-white/[0.08] hover:bg-white/[0.065] hover:text-foreground';
  const rowToneClass = isIgnored && !isSelected && !isFocused ? 'text-muted-foreground/70' : '';
  const rowClassName = `${baseRowClass} ${renameTarget ? 'cursor-text' : 'cursor-pointer'} ${isSelected ? selectedRowClass : isFocused ? focusedRowClass : idleRowClass} ${rowToneClass}`.trim();
  const statusIndicatorTone = status ? statusMarkToneClasses[status] || 'bg-white/[0.08] text-muted-foreground/70' : '';
  const statusIndicatorBadge = status
    ? statusBadges[status] || status[0]?.toUpperCase() || ''
    : '';
  const shouldRenderStatusMark = Boolean(status && status !== 'ignored');

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
          onCompositionStart={() => {
            isDraftComposingRef.current = true;
          }}
          onCompositionEnd={() => {
            isDraftComposingRef.current = false;
          }}
          onKeyDown={(event) => {
            if (isDraftComposingRef.current || event.nativeEvent?.isComposing) {
              return;
            }
            item.onKeyDown?.(event);
          }}
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
      aria-label={rowAriaLabel || nodeName}
      aria-level={ariaLevel}
      aria-selected={isSelected}
      aria-expanded={isDir ? isExpanded : undefined}
      aria-busy={isLoading || undefined}
      aria-setsize={item.setSize || undefined}
      aria-posinset={item.posInSet || undefined}
      data-explorer-path={item.path}
      className={rowClassName}
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
      {canExpand ? (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onToggle(); }}
          aria-label={isExpanded ? `Collapse ${nodeName}` : `Expand ${nodeName}`}
          aria-expanded={isExpanded}
          tabIndex={-1}
          className={`shrink-0 rounded-sm text-muted-foreground/70 transition-colors hover:bg-white/5 hover:text-foreground ${focusRingClass}`}
        >
          {isExpanded ? <ChevronDown size={14} strokeWidth={1.5} /> : <ChevronRight size={14} strokeWidth={1.5} />}
        </button>
      ) : (
        <span className="w-4 shrink-0" />
      )}

      <div className="relative flex h-4 w-4 shrink-0 items-center justify-center">
        <FileIcon
          size={14}
          strokeWidth={1.5}
          className={isIgnored ? 'text-slate-300/74 group-hover:text-slate-200/88' : iconColor}
        />
        {isLink && (
          <div
            title={symlinkBoundaryLabel}
            className={`absolute -bottom-1 -right-1 rounded-full bg-background p-[0.5px] ring-1 ${
              symlinkBoundaryState && symlinkBoundaryState !== 'inside-root'
                ? 'ring-amber-300/55'
                : 'ring-sky-500/50'
            }`}
          >
            <Link2 size={8} className="text-sky-400" strokeWidth={3} />
          </div>
        )}
        {isIgnored && (
          <div
            data-explorer-ignored="true"
            aria-hidden="true"
            className={`absolute -top-1 -right-1 rounded-full p-[0.5px] ring-1 ring-white/10 ${
              isSelected || isFocused
                ? 'bg-background/95 text-slate-200/92'
                : 'bg-background/88 text-slate-300/80 group-hover:text-slate-200/90'
            }`}
          >
            <EyeOff size={8} className="text-current" strokeWidth={2} />
          </div>
        )}
      </div>

      {/* Name / Rename Input */}
      {renameTarget ? (
        <input
          autoFocus
          aria-label={`Rename ${nodeName}`}
          className="flex-1 rounded border border-border bg-transparent px-1 text-xs text-foreground focus:outline-none select-text"
          value={renameTarget.value}
          onChange={(e) => setRenameTarget(prev => ({ ...prev, value: e.target.value }))}
          onBlur={handleRenameSubmit}
          onCompositionStart={() => {
            isRenameComposingRef.current = true;
          }}
          onCompositionEnd={() => {
            isRenameComposingRef.current = false;
          }}
          onKeyDown={(e) => {
            if (isRenameComposingRef.current || e.nativeEvent?.isComposing) {
              return;
            }
            if (e.key === 'Enter') handleRenameSubmit();
            if (e.key === 'Escape') setRenameTarget(null);
          }}
          onMouseDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
        />
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span
            data-explorer-name="true"
            title={nodeName}
            className={`truncate font-medium transition-colors ${
              isIgnored
                ? isSelected
                  ? 'text-foreground/84'
                  : isFocused
                    ? 'text-foreground/80'
                    : 'text-muted-foreground/78 group-hover:text-muted-foreground/92'
                : 'text-inherit'
            }`}
            onDoubleClick={
              onNameDoubleClick
                ? (event) => {
                    event.stopPropagation();
                    onNameDoubleClick(event);
                  }
                : undefined
            }
          >
            {nodeName}
          </span>
          {rowStateBadge ? (
            <div className="flex shrink-0 items-center gap-1">
              <span
                data-explorer-state={rowStateBadge.key}
                className={rowStateBadge.className}
              >
                {rowStateBadge.label}
              </span>
            </div>
          ) : null}
        </div>
      )}

      {!renameTarget ? (
        <div
          data-explorer-meta-rail="true"
          className="ml-auto flex min-w-0 max-w-[45%] items-center justify-end gap-1.5 overflow-hidden pl-2"
        >
          {shouldRenderStatusMark ? (
            <span
              data-explorer-status={status}
              aria-hidden="true"
              title={statusLabel}
              className={`flex h-4 min-w-[1rem] shrink-0 items-center justify-center rounded-sm px-1 text-[8px] font-semibold uppercase tracking-[0.12em] ${statusIndicatorTone}`}
            >
              {statusIndicatorBadge}
            </span>
          ) : null}
          {primarySemanticTag && (
            <span
              className="min-w-0 truncate text-[8px] font-semibold uppercase tracking-[0.16em] text-sky-200/[0.58]"
              title={`Semantic file: ${primarySemanticTag.label || primarySemanticTag.id}`}
            >
              {primarySemanticTag.label || primarySemanticTag.id}
            </span>
          )}
          {semanticOverflowCount > 0 && (
            <span className="shrink-0 text-[8px] font-semibold uppercase tracking-[0.16em] text-sky-200/[0.44]">
              +{semanticOverflowCount}
            </span>
          )}

          {/* Diff Counts */}
          {(added > 0 || deleted > 0) && (
            <div className="flex shrink-0 items-center gap-1 text-[9px] font-semibold tabular-nums">
              {added > 0 && <span className="text-emerald-300/90">+{added}</span>}
              {deleted > 0 && <span className="text-rose-300/90">-{deleted}</span>}
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
                className={`flex items-center gap-1 rounded-md px-1 py-0.5 text-muted-foreground/45 transition-colors hover:bg-white/[0.06] hover:text-primary ${focusRingClass}`}
                onClick={(event) => {
                  event.stopPropagation();
                  onJumpToComments?.(item.path);
                }}
                aria-label={`View ${commentCount} comment${commentCount === 1 ? '' : 's'} for ${nodeName}`}
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
