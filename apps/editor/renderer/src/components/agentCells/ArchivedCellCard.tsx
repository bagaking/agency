import React from 'react';
import { ArrowUpRight, FolderArchive, GitBranch, Layers3 } from 'lucide-react';

import { AttentionPill } from '../attention/AttentionPill';
import type { AttentionItem } from '../../attention/attentionModel';
import {
  CellStateBadge,
  buildArchivedCellCopy,
  buildCellSessionSummary,
  resolveCellAttachmentMeta,
} from './cellPresentation';

type ArchivedCellCardProps = {
  cell: any;
  sessions?: any[];
  selected?: boolean;
  attentionItem?: AttentionItem | null;
  attentionCount?: number;
  onSelect?: (cellId: string) => void;
};

export function ArchivedCellCard({
  cell,
  sessions = [],
  selected = false,
  attentionItem = null,
  attentionCount = 0,
  onSelect,
}: ArchivedCellCardProps) {
  const attachmentMeta = resolveCellAttachmentMeta(cell);
  const sessionSummary = buildCellSessionSummary(sessions);
  const copy = buildArchivedCellCopy(cell, sessionSummary);
  const worktreeLabel = attachmentMeta.pathLabel || `${attachmentMeta.label} worktree`;

  return (
    <div
      role="button"
      tabIndex={0}
      data-testid={`archived-cell-card-${cell?.id || 'unknown'}`}
      onClick={() => onSelect?.(cell.id)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect?.(cell.id);
        }
      }}
      className={`rounded-2xl border px-3 py-3 transition-colors ${
        selected
          ? 'border-slate-300/22 bg-slate-400/[0.08] shadow-[0_10px_30px_-20px_rgba(148,163,184,0.55)]'
          : 'border-white/8 bg-white/[0.025] hover:border-slate-300/18 hover:bg-white/[0.04]'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-[12px] font-semibold tracking-[0.01em] text-foreground">
              {cell?.name || 'Archived Cell'}
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
        </div>
        {attentionItem ? (
          <AttentionPill item={attentionItem} count={attentionCount} className="shrink-0 px-1.5 py-[2px]" />
        ) : null}
      </div>

      <div className="mt-3 rounded-xl border border-white/6 bg-black/10 px-3 py-2.5">
        <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-200/80">
          {copy.eyebrow}
        </div>
        <p className="mt-1 text-[11px] leading-5 text-muted-foreground">{copy.body}</p>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-full border border-white/8 bg-white/[0.04] px-2 py-0.5 text-[9px] font-medium text-foreground/80">
            <Layers3 size={10} strokeWidth={1.6} />
            {copy.summary}
          </span>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/8 bg-white/[0.03] px-2.5 py-1 text-[10px] font-medium text-muted-foreground">
          <FolderArchive size={12} strokeWidth={1.7} />
          Archived
        </span>

        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onSelect?.(cell.id);
          }}
          onKeyDown={(event) => {
            event.stopPropagation();
          }}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-foreground/80 transition-colors hover:bg-white/[0.08]"
        >
          <ArrowUpRight size={12} strokeWidth={1.7} />
          <span>View Details</span>
        </button>
      </div>
    </div>
  );
}
