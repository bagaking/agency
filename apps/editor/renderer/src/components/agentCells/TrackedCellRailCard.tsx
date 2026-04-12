import React from 'react';
import { ChevronDown, ChevronRight, FolderOpen, GitBranch, MoreHorizontal, Plus } from 'lucide-react';

import { IconButton } from '../ui/IconButton';
import { AgentCellsAttentionBadge } from './AgentCellsAttentionBadge';
import {
  buildAgentCellsBadgeClass,
  buildAgentCellsIconWellClass,
  buildAgentCellsWorkspacePanelClass,
  buildAgentCellsGhostControlClass,
  buildAgentCellsPrimaryActionClass,
} from './surfaceTokens';
import type { TrackedCellRailModel } from './railModels';

type TrackedCellRailCardProps = {
  model: TrackedCellRailModel;
  onSelect?: (cellId: string) => void;
  onToggleCollapse?: (cellId: string) => void;
  onJumpAttention?: (item: any) => void;
  onOpenExplorer?: (cellId: string) => void;
  onCreateSessionMenu?: (cell: any, event: React.MouseEvent<HTMLButtonElement>) => void;
  onBindBranch?: (cell: any) => void;
  onCreateAttachment?: (cell: any) => void;
  onOpenOverflow?: (cell: any, event: React.MouseEvent<HTMLButtonElement>) => void;
  sessionTree?: React.ReactNode;
};

export function TrackedCellRailCard({
  model,
  onSelect,
  onToggleCollapse,
  onJumpAttention,
  onOpenExplorer,
  onCreateSessionMenu,
  onBindBranch,
  onCreateAttachment,
  onOpenOverflow,
  sessionTree,
}: TrackedCellRailCardProps) {
  const {
    cell,
    attachmentMeta,
    branchMeta,
    attention,
    isSelected,
    isCollapsed,
    isWindowHome,
    isProjectRootRuntime,
    hasRunnableRuntimeRoot,
    hasOverflow,
    runtimeLabel,
    runtimeTitle,
    canOpenExplorer,
    canCreateSession,
    createSessionTitle,
    canBindBranch,
    bindBranchTitle,
    canCreateAttachment,
    createAttachmentTitle,
  } = model;
  return (
    <div
      className={`${buildAgentCellsWorkspacePanelClass({
        selected: isSelected,
        tone: 'tracked',
        attentionTone: attention?.tone || 'none',
      })} transition-colors`}
    >
      <div
        role="treeitem"
        aria-level={1}
        aria-expanded={!isCollapsed}
        aria-selected={isSelected}
        tabIndex={0}
        onClick={() => onSelect?.(cell.id)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onSelect?.(cell.id);
            return;
          }
          if (event.key === 'ArrowLeft' && !isCollapsed) {
            event.preventDefault();
            onToggleCollapse?.(cell.id);
            return;
          }
          if (event.key === 'ArrowRight' && isCollapsed) {
            event.preventDefault();
            onToggleCollapse?.(cell.id);
          }
        }}
        data-testid={`cell-item-${cell.id}`}
        className={`group flex w-full items-start gap-2.5 rounded-[16px] px-2.5 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/30 ${
          isSelected ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onToggleCollapse?.(cell.id);
          }}
          className="mt-0.5 rounded p-0.5 text-muted-foreground/60 hover:bg-muted/30 hover:text-foreground"
          title={isCollapsed ? 'Expand sessions' : 'Collapse sessions'}
        >
          {isCollapsed ? <ChevronRight size={12} strokeWidth={1.5} /> : <ChevronDown size={12} strokeWidth={1.5} />}
        </button>
        <div
          className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-[10px] ${buildAgentCellsIconWellClass('tracked')}`}
        >
          <GitBranch size={14} strokeWidth={1.6} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate text-[12px] font-semibold tracking-[0.01em]">{cell.name}</span>
            {attachmentMeta.attachmentState !== 'attached' ? (
              <span
                className={buildAgentCellsBadgeClass(attachmentMeta.tone)}
                title={attachmentMeta.pathLabel || attachmentMeta.label}
              >
                {attachmentMeta.label}
              </span>
            ) : null}
            {attention?.item ? (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onJumpAttention?.(attention.item);
                }}
                className="shrink-0"
                title={attention.item.detail}
              >
                <AgentCellsAttentionBadge
                  item={attention.item}
                  count={attention.count}
                />
              </button>
            ) : null}
          </div>
          <div
            className={`mt-1 flex min-w-0 items-center gap-1.5 text-[9px] ${
              branchMeta.isDetachedHead ? 'text-amber-100/78' : 'text-muted-foreground/72'
            }`}
          >
            <GitBranch size={10} strokeWidth={1.7} className="shrink-0" />
            <span className="truncate" title={runtimeTitle}>{runtimeLabel}</span>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-1 self-center opacity-100">
          {canOpenExplorer ? (
            <IconButton
              label="Open in Explorer"
              focusRing="sidebar"
              className="h-7 w-7 rounded-md bg-black/18 text-muted-foreground/72 shadow-[inset_0_0_0_1px_rgba(8,10,14,0.34)] transition-colors hover:bg-black/26 hover:text-foreground"
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
              disabled={!canCreateSession}
              className="h-7 w-7 rounded-md bg-sky-500/[0.18] text-sky-50 shadow-[inset_0_0_0_1px_rgba(29,65,94,0.42)] transition-colors hover:bg-sky-500/[0.26] hover:text-sky-50 disabled:bg-black/14 disabled:text-muted-foreground/40 disabled:hover:bg-black/14 disabled:shadow-[inset_0_0_0_1px_rgba(8,10,14,0.24)]"
              title={createSessionTitle}
              onClick={(event) => {
                if (!canCreateSession) {
                  return;
                }
                event.stopPropagation();
                onCreateSessionMenu?.(cell, event);
              }}
            >
              <Plus size={14} strokeWidth={1.8} aria-hidden="true" />
            </IconButton>
          ) : null}
          {hasOverflow ? (
            <IconButton
              label="Detached and closed sessions"
              focusRing="sidebar"
              className="h-7 w-7 rounded-md bg-black/18 text-muted-foreground/72 shadow-[inset_0_0_0_1px_rgba(8,10,14,0.34)] transition-colors hover:bg-black/26 hover:text-foreground"
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

      {isProjectRootRuntime && (canBindBranch || canCreateAttachment) ? (
        <div className="flex items-center gap-2 bg-black/14 px-2.5 py-2 shadow-[inset_0_1px_0_rgba(0,0,0,0.24)]">
          {canBindBranch ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onBindBranch?.(cell);
              }}
              title={bindBranchTitle}
              className={buildAgentCellsGhostControlClass()}
            >
              Bind Branch
            </button>
          ) : null}
          {canCreateAttachment ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onCreateAttachment?.(cell);
              }}
              title={createAttachmentTitle}
              className={buildAgentCellsPrimaryActionClass('sky')}
            >
              Create Worktree Attachment
            </button>
          ) : null}
        </div>
      ) : null}

      {sessionTree ? (
        <div className="bg-black/10 px-2.5 pb-1.5 pt-1.5 shadow-[inset_0_1px_0_rgba(0,0,0,0.24)]" role="group">
          {sessionTree}
        </div>
      ) : null}
    </div>
  );
}
