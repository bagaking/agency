import React from 'react';
import { ArrowUpLeft, ChevronDown, ChevronRight, FolderOpen, GitBranch, MoreHorizontal, Plus, SquareTerminal } from 'lucide-react';

import { AttentionPill } from '../attention/AttentionPill';
import { IconButton } from '../ui/IconButton';
import {
  AGENT_CELLS_SECTION_BADGE_BASE,
  buildAgentCellsIconWellClass,
  buildAgentCellsWorkspacePanelClass,
} from './surfaceTokens';

type TrackedCellRailCardProps = {
  cell: any;
  attachmentMeta: any;
  branchMeta: any;
  cellAttention?: any;
  selected?: boolean;
  collapsed?: boolean;
  isWindowHome?: boolean;
  isProjectRootRuntime?: boolean;
  hasRunnableRuntimeRoot?: boolean;
  hasOverflow?: boolean;
  onSelect?: (cellId: string) => void;
  onToggleCollapse?: (cellId: string) => void;
  onJumpAttention?: (item: any) => void;
  onOpenExplorer?: (cellId: string) => void;
  onCreateSessionMenu?: (cell: any, event: React.MouseEvent<HTMLButtonElement>) => void;
  onBindBranch?: (cell: any) => void;
  onCreateAttachment?: (cell: any) => void;
  onOpenOverflow?: (cell: any, event: React.MouseEvent<HTMLButtonElement>) => void;
  children?: React.ReactNode;
};

export function TrackedCellRailCard({
  cell,
  attachmentMeta,
  branchMeta,
  cellAttention,
  selected = false,
  collapsed = false,
  isWindowHome = false,
  isProjectRootRuntime = false,
  hasRunnableRuntimeRoot = false,
  hasOverflow = false,
  onSelect,
  onToggleCollapse,
  onJumpAttention,
  onOpenExplorer,
  onCreateSessionMenu,
  onBindBranch,
  onCreateAttachment,
  onOpenOverflow,
  children,
}: TrackedCellRailCardProps) {
  return (
    <div
      className={`${buildAgentCellsWorkspacePanelClass({
        selected,
        tone: 'tracked',
        attentionClass: '',
      })} transition-colors`}
    >
      <div
        role="treeitem"
        aria-level={1}
        aria-expanded={!collapsed}
        aria-selected={selected}
        tabIndex={0}
        onClick={() => onSelect?.(cell.id)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onSelect?.(cell.id);
            return;
          }
          if (event.key === 'ArrowLeft' && !collapsed) {
            event.preventDefault();
            onToggleCollapse?.(cell.id);
            return;
          }
          if (event.key === 'ArrowRight' && collapsed) {
            event.preventDefault();
            onToggleCollapse?.(cell.id);
          }
        }}
        data-testid={`cell-item-${cell.id}`}
        className={`group flex w-full items-start gap-2.5 px-2.5 py-2 text-left transition-colors ${
          selected ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onToggleCollapse?.(cell.id);
          }}
          className="mt-0.5 rounded p-0.5 text-muted-foreground/60 hover:bg-muted/30 hover:text-foreground"
          title={collapsed ? 'Expand sessions' : 'Collapse sessions'}
        >
          {collapsed ? <ChevronRight size={12} strokeWidth={1.5} /> : <ChevronDown size={12} strokeWidth={1.5} />}
        </button>
        <div
          className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-[10px] border ${
            cell.isVirtual ? buildAgentCellsIconWellClass('virtual') : buildAgentCellsIconWellClass('tracked')
          }`}
        >
          {cell.isVirtual ? <SquareTerminal size={14} strokeWidth={1.6} /> : <GitBranch size={14} strokeWidth={1.6} />}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate text-[12px] font-semibold tracking-[0.01em]">{cell.name}</span>
            {cell.isVirtual ? (
              <span className={`${AGENT_CELLS_SECTION_BADGE_BASE} border-primary/18 bg-primary/[0.1] text-primary/78`}>
                Local
              </span>
            ) : null}
            {!cell.isVirtual && attachmentMeta.attachmentState !== 'attached' ? (
              <span
                className={`${AGENT_CELLS_SECTION_BADGE_BASE} ${attachmentMeta.tone}`}
                title={attachmentMeta.pathLabel || attachmentMeta.label}
              >
                {attachmentMeta.label}
              </span>
            ) : null}
            {cellAttention?.strongest ? (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onJumpAttention?.(cellAttention.strongest);
                }}
                className="shrink-0"
                title={cellAttention.strongest.detail}
              >
                <AttentionPill
                  item={cellAttention.strongest}
                  count={cellAttention.count}
                  variant="agentCells"
                  className="px-1.5 py-[2px]"
                />
              </button>
            ) : null}
          </div>
          <div
            className={`mt-1 flex min-w-0 items-center gap-1.5 text-[9px] ${
              branchMeta.isDetachedHead ? 'text-amber-100/78' : 'text-muted-foreground/72'
            }`}
          >
            {cell.isVirtual ? (
              <SquareTerminal size={10} strokeWidth={1.7} className="shrink-0" />
            ) : (
              <GitBranch size={10} strokeWidth={1.7} className="shrink-0" />
            )}
            <span className="truncate" title={branchMeta.title || undefined}>
              {cell.isVirtual
                ? cell.worktreePath || 'Local shell'
                : attachmentMeta.attachmentState === 'attached'
                  ? branchMeta.label || attachmentMeta.pathLabel || 'Attached worktree'
                  : branchMeta.label
                    ? `Project root · ${branchMeta.label}`
                    : 'Project root runtime'}
            </span>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-1 self-center opacity-100">
          {!cell.isVirtual ? (
            <IconButton
              label="Open in Explorer"
              focusRing="sidebar"
              className="h-7 w-7 rounded-md text-muted-foreground/65 transition-colors hover:bg-black/14 hover:text-foreground"
              onClick={(event) => {
                event.stopPropagation();
                onOpenExplorer?.(cell.id);
              }}
            >
              <FolderOpen size={13} strokeWidth={1.7} aria-hidden="true" />
            </IconButton>
          ) : null}
          {!isWindowHome ? (
            <IconButton
              label="New Session"
              focusRing="sidebar"
              disabled={!hasRunnableRuntimeRoot}
              className="h-7 w-7 rounded-md text-primary transition-colors hover:bg-primary/12 hover:text-primary disabled:text-muted-foreground/40 disabled:hover:bg-transparent"
              title={
                hasRunnableRuntimeRoot
                  ? isProjectRootRuntime
                    ? 'Create a session on the project root.'
                    : 'Create a session inside the attached worktree.'
                  : 'This Cell cannot start sessions until it has a valid runtime root.'
              }
              onClick={(event) => {
                if (!hasRunnableRuntimeRoot) {
                  return;
                }
                event.stopPropagation();
                onCreateSessionMenu?.(cell, event);
              }}
            >
              <Plus size={14} strokeWidth={1.8} aria-hidden="true" />
            </IconButton>
          ) : null}
          {isProjectRootRuntime ? (
            <IconButton
              label="Bind Branch"
              focusRing="sidebar"
              className="h-7 w-7 rounded-md text-sky-100/78 transition-colors hover:bg-sky-500/12 hover:text-sky-50"
              title={
                cell?.branch
                  ? 'Update the branch metadata for this Cell without creating a worktree.'
                  : 'Bind this Cell to an existing branch without creating a worktree.'
              }
              onClick={(event) => {
                event.stopPropagation();
                onBindBranch?.(cell);
              }}
            >
              <GitBranch size={13} strokeWidth={1.7} aria-hidden="true" />
            </IconButton>
          ) : null}
          {isProjectRootRuntime ? (
            <IconButton
              label="Create Worktree Attachment"
              focusRing="sidebar"
              className="h-7 w-7 rounded-md text-sky-100/78 transition-colors hover:bg-sky-500/12 hover:text-sky-50"
              title={
                cell?.branch
                  ? 'Materialize a live worktree attachment for this Cell.'
                  : 'Choose a branch and materialize a live worktree attachment for this Cell.'
              }
              onClick={(event) => {
                event.stopPropagation();
                onCreateAttachment?.(cell);
              }}
            >
              <ArrowUpLeft size={13} strokeWidth={1.7} aria-hidden="true" />
            </IconButton>
          ) : null}
          {hasOverflow ? (
            <IconButton
              label="Detached and closed sessions"
              focusRing="sidebar"
              className="h-7 w-7 rounded-md text-muted-foreground/65 transition-colors hover:bg-black/14 hover:text-foreground"
              onClick={(event) => {
                event.stopPropagation();
                onOpenOverflow?.(cell, event);
              }}
            >
              <MoreHorizontal size={13} strokeWidth={1.7} aria-hidden="true" />
            </IconButton>
          ) : null}
        </div>
      </div>

      {children}
    </div>
  );
}
