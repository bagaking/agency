import React from 'react';

import type { AttentionItem } from '../../attention/attentionModel';

function resolveToneClasses(
  item: AttentionItem | null | undefined,
  variant: 'default' | 'agentCells'
): string {
  switch (item?.kind) {
    case 'failed':
      return variant === 'agentCells'
        ? 'border-[rgba(82,46,52,0.92)] bg-rose-500/[0.085] text-rose-100/86'
        : 'border-rose-400/28 bg-rose-500/12 text-rose-100';
    case 'pending_confirmation':
      return variant === 'agentCells'
        ? 'border-[rgba(74,57,35,0.92)] bg-amber-500/[0.085] text-amber-100/86'
        : 'border-amber-300/30 bg-amber-500/12 text-amber-100';
    case 'return_required':
      return variant === 'agentCells'
        ? 'border-[rgba(34,54,72,0.92)] bg-cyan-500/[0.085] text-cyan-100/86'
        : 'border-cyan-300/30 bg-cyan-500/12 text-cyan-100';
    case 'running':
      return variant === 'agentCells'
        ? 'border-[rgba(34,54,72,0.92)] bg-sky-500/[0.075] text-sky-100/84'
        : 'border-sky-300/28 bg-sky-500/10 text-sky-100';
    case 'unread':
      return variant === 'agentCells'
        ? 'border-black/24 bg-black/12 text-white/72'
        : 'border-white/12 bg-white/[0.05] text-white/78';
    default:
      return variant === 'agentCells'
        ? 'border-black/22 bg-black/10 text-white/60'
        : 'border-white/10 bg-white/[0.04] text-white/60';
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
  variant = 'default',
}: {
  item: AttentionItem | null | undefined;
  count?: number;
  className?: string;
  variant?: 'default' | 'agentCells';
}) {
  const normalizedCount = Number.isFinite(count) ? Math.max(0, Math.floor(Number(count))) : 0;
  const shellClass =
    variant === 'agentCells'
      ? 'inline-flex items-center gap-1 rounded-[7px] border px-1.5 py-[3px] text-[8px] font-semibold uppercase tracking-[0.14em]'
      : 'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em]';
  const countClass =
    variant === 'agentCells'
      ? 'rounded-[5px] bg-black/18 px-1 py-[1px] text-[8px] leading-none'
      : 'rounded-full bg-black/20 px-1 py-[1px] text-[8px] leading-none';
  return (
    <span
      className={`${shellClass} ${resolveToneClasses(item, variant)} ${className}`}
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
