import React from 'react';
import { Archive, ArrowUpRight, GitBranch, Layers3, ShieldCheck } from 'lucide-react';

import { AttentionPill } from '../attention/AttentionPill';
import type { AttentionItem } from '../../attention/attentionModel';
import {
  CellStateBadge,
  buildCellSessionSummary,
  resolveCellAttachmentMeta,
} from './cellPresentation';

type DetachedCellCleanupCardProps = {
  cell: any;
  sessions?: any[];
  selected?: boolean;
  attentionItem?: AttentionItem | null;
  attentionCount?: number;
  onSelect?: (cellId: string) => void;
  onArchive?: (cell: any) => void;
};

function buildCleanupCopy(cell: any, sessionSummary: string[]) {
  const attachmentState = resolveCellAttachmentMeta(cell).attachmentState;
  return {
    eyebrow: 'Cleanup Recommended',
    body:
      attachmentState === 'missing'
        ? 'The recorded worktree path is no longer available for this Cell. Archive it to remove it from the active Agent Cells flow while preserving repo-owned sessions and evidence.'
        : 'This Cell is detached from its worktree and no longer belongs in the active Agent Cells flow. Archive it while preserving repo-owned sessions and evidence.',
    summary: sessionSummary.join(' · '),
  };
}

export function DetachedCellCleanupCard({
  cell,
  sessions = [],
  selected = false,
  attentionItem = null,
  attentionCount = 0,
  onSelect,
  onArchive,
}: DetachedCellCleanupCardProps) {
  const attachmentMeta = resolveCellAttachmentMeta(cell);
  const sessionSummary = buildCellSessionSummary(sessions);
  const copy = buildCleanupCopy(cell, sessionSummary);
  const worktreeLabel = attachmentMeta.pathLabel || `${attachmentMeta.label} worktree`;

  return (
    <div
      data-testid={`detached-cell-cleanup-${cell?.id || 'unknown'}`}
      className={`rounded-xl px-3 py-2.5 text-foreground transition-colors duration-200 ${
        selected
          ? 'bg-gradient-to-br from-amber-500/[0.14] via-amber-500/[0.06] to-transparent ring-1 ring-amber-300/26 shadow-[0_22px_42px_-34px_rgba(251,191,36,0.9)]'
          : 'bg-slate-950/38 ring-1 ring-amber-200/12 shadow-[0_18px_36px_-34px_rgba(0,0,0,0.9)] hover:ring-amber-300/20 hover:bg-slate-950/52'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-[12px] font-semibold tracking-[0.01em] text-foreground">
              {cell?.name || 'Detached Cell'}
            </span>
            <CellStateBadge state={cell?.state} />
            <span
              className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.16em] ${attachmentMeta.tone}`}
              title={worktreeLabel}
            >
              {attachmentMeta.label}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-[9px] text-muted-foreground/72">
            <GitBranch size={10} strokeWidth={1.7} className="shrink-0" />
            <span className="truncate">{worktreeLabel}</span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[9px]">
            <span className="font-semibold uppercase tracking-[0.18em] text-amber-100/78">{copy.eyebrow}</span>
            <span className="inline-flex items-center gap-1 text-foreground/76">
              <ShieldCheck size={10} strokeWidth={1.6} />
              Evidence retained
            </span>
            <span className="inline-flex items-center gap-1 text-muted-foreground/78">
              <Layers3 size={10} strokeWidth={1.6} />
              {copy.summary}
            </span>
          </div>
          <p className="mt-1.5 text-[11px] leading-[1.45] text-muted-foreground">{copy.body}</p>
        </div>
        {attentionItem ? (
          <AttentionPill item={attentionItem} count={attentionCount} className="shrink-0 px-1.5 py-[2px]" />
        ) : null}
      </div>

      <div className="mt-2.5 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onArchive?.(cell);
          }}
          onKeyDown={(event) => {
            event.stopPropagation();
          }}
          className="inline-flex items-center gap-2 rounded-full border border-amber-300/24 bg-amber-500/[0.12] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-100 transition-colors hover:bg-amber-500/[0.18]"
          title={
            attachmentMeta.attachmentState === 'missing'
              ? 'Archive this missing Cell'
              : 'Archive this detached Cell'
          }
        >
          <Archive size={12} strokeWidth={1.8} />
          <span>Archive Cell</span>
        </button>

        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onSelect?.(cell.id);
          }}
          onKeyDown={(event) => {
            event.stopPropagation();
          }}
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-white/[0.04] hover:text-foreground"
        >
          <ArrowUpRight size={12} strokeWidth={1.7} />
          <span>Details</span>
        </button>
      </div>
    </div>
  );
}
