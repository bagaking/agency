import React from 'react';

import type { AttentionItem } from '../../attention/attentionModel';

function resolveToneClasses(
  item: AttentionItem | null | undefined
): string {
  switch (item?.kind) {
    case 'failed':
      return 'border-rose-400/28 bg-rose-500/12 text-rose-100';
    case 'pending_confirmation':
      return 'border-amber-300/30 bg-amber-500/12 text-amber-100';
    case 'return_required':
      return 'border-cyan-300/30 bg-cyan-500/12 text-cyan-100';
    case 'running':
      return 'border-sky-300/28 bg-sky-500/10 text-sky-100';
    case 'unread':
      return 'border-white/12 bg-white/[0.05] text-white/78';
    default:
      return 'border-white/10 bg-white/[0.04] text-white/60';
  }
}

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

export function AttentionPill({
  item,
  count,
  className = '',
}: {
  item: AttentionItem | null | undefined;
  count?: number;
  className?: string;
}) {
  const normalizedCount = Number.isFinite(count) ? Math.max(0, Math.floor(Number(count))) : 0;
  const shellClass =
    'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em]';
  const countClass = 'rounded-full bg-black/20 px-1 py-[1px] text-[8px] leading-none';
  return (
    <span
      className={`${shellClass} ${resolveToneClasses(item)} ${className}`}
    >
      <span>{resolveLabel(item)}</span>
      {normalizedCount > 1 ? (
        <span className={countClass}>
          {normalizedCount}
        </span>
      ) : null}
    </span>
  );
}
