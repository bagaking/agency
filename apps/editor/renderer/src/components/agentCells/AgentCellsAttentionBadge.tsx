import React from 'react';

import type { AttentionItem } from '../../attention/attentionModel';
import {
  buildAgentCellsAttentionCountClass,
  buildAgentCellsAttentionPillClass,
  resolveAgentCellsAttentionTone,
} from './surfaceTokens';

function resolveLabel(item: AttentionItem | null | undefined): string {
  switch (item?.kind) {
    case 'failed':
      return 'Failed';
    case 'pending_confirmation':
      return 'Confirm';
    case 'return_required':
      return 'Review';
    case 'running':
      return 'Running';
    case 'unread':
      return 'Unread';
    default:
      return 'Attention';
  }
}

export function AgentCellsAttentionBadge({
  item,
  count,
  className = '',
}: {
  item: AttentionItem | null | undefined;
  count?: number;
  className?: string;
}) {
  const normalizedCount = Number.isFinite(count) ? Math.max(0, Math.floor(Number(count))) : 0;
  return (
    <span
      className={`${buildAgentCellsAttentionPillClass(
        resolveAgentCellsAttentionTone(String(item?.kind || 'none'))
      )} ${className}`}
    >
      <span>{resolveLabel(item)}</span>
      {normalizedCount > 1 ? <span className={buildAgentCellsAttentionCountClass()}>{normalizedCount}</span> : null}
    </span>
  );
}
