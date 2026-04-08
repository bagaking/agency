import React from 'react';
import { ArrowUpRight, GitBranch, Layers3, ShieldCheck } from 'lucide-react';

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
  onJumpAttention?: (item: AttentionItem) => void;
  testId?: string;
  shellClassName?: string;
};

function buildCleanupCopy(cell: any, sessionSummary: string[]) {
  const attachmentState = resolveCellAttachmentMeta(cell).attachmentState;
  return {
    eyebrow: 'Detached Workspace',
    body:
      attachmentState === 'missing'
        ? 'The recorded worktree path is no longer available for this Cell. Repo-owned sessions and evidence remain available while you decide whether to reattach this work elsewhere or remove the record.'
        : 'This Cell is detached from its previous worktree. Repo-owned sessions and evidence remain available while you reattach it or remove the record.',
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
  onJumpAttention,
  testId,
  shellClassName = '',
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
      testId={testId || `detached-cell-cleanup-${cell?.id || 'unknown'}`}
      shellClassName={shellClassName}
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
          label: 'Sessions retained',
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
      onAttentionClick={onJumpAttention}
      primaryAction={{
        label: 'View Details',
        icon: ArrowUpRight,
        onClick: (event) => {
          event.stopPropagation();
          onSelect?.(cell.id);
        },
        title:
          attachmentMeta.attachmentState === 'missing'
            ? 'View this missing Cell'
            : 'View this detached Cell',
      }}
    />
  );
}
