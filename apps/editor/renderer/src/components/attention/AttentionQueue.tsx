import React from 'react';

import { AttentionPill } from './AttentionPill';
import type { AttentionItem } from '../../attention/attentionModel';

export function AttentionQueue({
  items,
  onSelectItem,
  title = 'Attention',
  emptyLabel = 'No active attention.',
  className = '',
  itemClassName = '',
  itemsContainerClassName = '',
  detailClassName = '',
}: {
  items?: AttentionItem[];
  onSelectItem?: (item: AttentionItem) => void;
  title?: string;
  emptyLabel?: string;
  className?: string;
  itemClassName?: string;
  itemsContainerClassName?: string;
  detailClassName?: string;
}) {
  const list = Array.isArray(items) ? items.filter(Boolean) : [];

  return (
    <div
      className={`rounded-xl border border-white/[0.06] bg-[linear-gradient(180deg,rgba(255,255,255,0.035),rgba(255,255,255,0.02))] px-2.5 py-2 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.02)] ${className}`}
      data-attention-queue="true"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="text-[8px] font-bold uppercase tracking-[0.18em] text-white/52">
          {title}
        </div>
        {list.length ? (
          <div className="text-[8px] font-semibold uppercase tracking-[0.14em] text-white/35">
            {list.length}
          </div>
        ) : null}
      </div>

      {list.length ? (
        <div className={`mt-2 space-y-1.5 ${itemsContainerClassName}`}>
          {list.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectItem?.(item)}
              title={item.detail || item.label}
              className={`flex w-full items-start gap-2 rounded-lg border border-transparent bg-white/[0.02] px-2 py-2 text-left transition-colors hover:border-white/[0.08] hover:bg-white/[0.045] ${itemClassName}`}
              data-attention-item-id={item.id}
            >
              <AttentionPill item={item} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[11px] font-medium text-white/92">
                  {item.label}
                </div>
                <div className={`mt-0.5 text-[10px] leading-relaxed text-white/54 ${detailClassName}`}>
                  {item.detail}
                </div>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="mt-2 text-[10px] text-white/34">{emptyLabel}</div>
      )}
    </div>
  );
}
