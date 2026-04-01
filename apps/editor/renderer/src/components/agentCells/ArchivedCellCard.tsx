import React from 'react';
import { ArrowUpRight, FolderArchive, GitBranch, Layers3, ShieldCheck } from 'lucide-react';

import { AttentionPill } from '../attention/AttentionPill';
import type { AttentionItem } from '../../attention/attentionModel';
import {
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
      data-testid={`archived-cell-card-${cell?.id || 'unknown'}`}
      className={`rounded-xl px-3 py-2.5 text-foreground transition-colors duration-200 ${
        selected
          ? 'bg-slate-900/50 ring-1 ring-slate-300/26 shadow-[0_18px_32px_-28px_rgba(148,163,184,0.7)]'
          : 'bg-slate-950/26 ring-1 ring-slate-400/12 shadow-[0_18px_34px_-34px_rgba(0,0,0,0.75)] hover:ring-slate-300/18 hover:bg-slate-950/38'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-[12px] font-semibold tracking-[0.01em] text-foreground">
              {cell?.name || 'Archived Cell'}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-slate-400/18 bg-slate-400/[0.08] px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.16em] text-slate-200/78">
              <FolderArchive size={10} strokeWidth={1.7} />
              Archived
            </span>
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
          <p className="mt-2 text-[11px] leading-[1.45] text-muted-foreground">{copy.body}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[9px]">
            <span className="inline-flex items-center gap-1 text-foreground/76">
              <ShieldCheck size={10} strokeWidth={1.6} />
              Evidence retained
            </span>
            <span className="inline-flex items-center gap-1 text-muted-foreground/78">
              <Layers3 size={10} strokeWidth={1.6} />
              {copy.summary}
            </span>
          </div>
        </div>
        {attentionItem ? (
          <AttentionPill item={attentionItem} count={attentionCount} className="shrink-0 px-1.5 py-[2px]" />
        ) : null}
      </div>

      <div className="mt-2.5 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onSelect?.(cell.id);
          }}
          onKeyDown={(event) => {
            event.stopPropagation();
          }}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.035] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-foreground/80 transition-colors hover:bg-white/[0.08]"
        >
          <ArrowUpRight size={12} strokeWidth={1.7} />
          <span>View Details</span>
        </button>
      </div>
    </div>
  );
}
