import React from 'react';
import { ArrowUpRight, FolderArchive, GitBranch, Layers3, ShieldCheck } from 'lucide-react';

import type { AttentionItem } from '../../attention/attentionModel';
import {
  buildArchivedCellCopy,
  buildCellSessionSummary,
  resolveCellAttachmentMeta,
} from './cellPresentation';
import { resolveAgentCellsAttentionTone } from './surfaceTokens';
import { LifecycleCellRailCard } from './LifecycleCellRailCard';

type ArchivedCellCardProps = {
  cell: any;
  sessions?: any[];
  selected?: boolean;
  attentionItem?: AttentionItem | null;
  attentionCount?: number;
  onSelect?: (cellId: string) => void;
  onJumpAttention?: (item: AttentionItem) => void;
  testId?: string;
};

export function ArchivedCellCard({
  cell,
  sessions = [],
  selected = false,
  attentionItem = null,
  attentionCount = 0,
  onSelect,
  onJumpAttention,
  testId,
}: ArchivedCellCardProps) {
  const attachmentMeta = resolveCellAttachmentMeta(cell);
  const sessionSummary = buildCellSessionSummary(sessions);
  const copy = buildArchivedCellCopy(cell, sessionSummary);
  const worktreeLabel = attachmentMeta.pathLabel || `${attachmentMeta.label} worktree`;
  const chips = [
    {
      key: 'archived',
      label: 'Archived',
      className:
        'inline-flex items-center gap-1 text-[8px] font-semibold uppercase tracking-[0.18em] text-slate-100/60',
      icon: <FolderArchive size={10} strokeWidth={1.7} />,
    },
    {
      key: 'attachment',
      label: attachmentMeta.label,
      className:
        attachmentMeta.attachmentState === 'attached'
          ? 'inline-flex items-center gap-1 text-[8px] font-semibold uppercase tracking-[0.18em] text-emerald-100/58'
          : attachmentMeta.attachmentState === 'missing'
            ? 'inline-flex items-center gap-1 text-[8px] font-semibold uppercase tracking-[0.18em] text-rose-200/58'
            : 'inline-flex items-center gap-1 text-[8px] font-semibold uppercase tracking-[0.18em] text-amber-100/58',
      title: worktreeLabel,
    },
  ];

  return (
    <LifecycleCellRailCard
      data-testid={testId || `archived-cell-card-${cell?.id || 'unknown'}`}
      testId={testId || `archived-cell-card-${cell?.id || 'unknown'}`}
      tone="archived"
      selected={selected}
      attentionTone={resolveAgentCellsAttentionTone(String(attentionItem?.kind || ''))}
      title={cell?.name || 'Archived Cell'}
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
      onAttentionClick={onJumpAttention}
      secondaryAction={{
        label: 'View Details',
        icon: ArrowUpRight,
        onClick: (event) => {
          event.stopPropagation();
          onSelect?.(cell.id);
        },
      }}
    />
  );
}
