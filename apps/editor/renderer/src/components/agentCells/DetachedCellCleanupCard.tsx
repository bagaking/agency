import React from 'react';
import { Archive, ArrowUpRight, GitBranch, Layers3, ShieldCheck } from 'lucide-react';

import type { AttentionItem } from '../../attention/attentionModel';
import {
  buildCellSessionSummary,
  resolveCellAttachmentMeta,
} from './cellPresentation';
import { LifecycleCellRailCard } from './LifecycleCellRailCard';

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
  const chips = [
    {
      key: 'state',
      label: String(cell?.state || 'draft'),
      className: 'inline-flex items-center gap-1 text-[8px] font-semibold uppercase tracking-[0.18em] text-white/48',
    },
    {
      key: 'attachment',
      label: attachmentMeta.label,
      className:
        attachmentMeta.attachmentState === 'missing'
          ? 'inline-flex items-center gap-1 text-[8px] font-semibold uppercase tracking-[0.18em] text-rose-200/72'
          : 'inline-flex items-center gap-1 text-[8px] font-semibold uppercase tracking-[0.18em] text-amber-100/74',
      title: worktreeLabel,
    },
  ];

  return (
    <LifecycleCellRailCard
      testId={`detached-cell-cleanup-${cell?.id || 'unknown'}`}
      tone="cleanup"
      selected={selected}
      title={cell?.name || 'Detached Cell'}
      chips={chips}
      pathLabel={worktreeLabel}
      pathIcon={<GitBranch size={10} strokeWidth={1.7} />}
      eyebrow={copy.eyebrow}
      body={copy.body}
      meta={[
        {
          icon: ShieldCheck,
          label: 'Evidence retained',
          tone: 'emphasis',
        },
        {
          icon: Layers3,
          label: copy.summary,
          tone: 'muted',
        },
      ]}
      attentionItem={attentionItem}
      attentionCount={attentionCount}
      primaryAction={{
        label: 'Archive Cell',
        icon: Archive,
        onClick: (event) => {
          event.stopPropagation();
          onArchive?.(cell);
        },
        title:
          attachmentMeta.attachmentState === 'missing'
            ? 'Archive this missing Cell'
            : 'Archive this detached Cell',
      }}
      secondaryAction={{
        label: 'Details',
        icon: ArrowUpRight,
        onClick: (event) => {
          event.stopPropagation();
          onSelect?.(cell.id);
        },
      }}
    />
  );
}
