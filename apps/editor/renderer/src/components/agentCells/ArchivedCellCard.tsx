import React from 'react';
import { ArrowUpRight, FolderArchive, GitBranch, Layers3, ShieldCheck } from 'lucide-react';

import type { AttentionItem } from '../../attention/attentionModel';
import {
  buildArchivedCellCopy,
  buildCellSessionSummary,
  resolveCellAttachmentMeta,
} from './cellPresentation';
import { resolveAgentCellsAttentionTone } from './surfaceTokens';
import { LifecycleCellRailCard, type LifecycleChip } from './LifecycleCellRailCard';

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
  const chips: LifecycleChip[] = [
    {
      key: 'archived',
      label: 'Archived',
      tone: 'legacy',
      icon: <FolderArchive size={10} strokeWidth={1.7} />,
    },
    {
      key: 'attachment',
      label: attachmentMeta.label,
      tone:
        attachmentMeta.attachmentState === 'attached'
          ? 'attached'
          : attachmentMeta.attachmentState === 'missing'
            ? 'missing'
            : 'detached',
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
