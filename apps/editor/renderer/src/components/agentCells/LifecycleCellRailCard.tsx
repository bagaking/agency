import React from 'react';
import type { LucideIcon } from 'lucide-react';

import type { AttentionItem } from '../../attention/attentionModel';
import { focusRing } from '../ui/focusRing';
import { AgentCellsAttentionBadge } from './AgentCellsAttentionBadge';
import {
  buildAgentCellsBadgeClass,
  resolveAgentCellsAttentionTone,
  buildAgentCellsGhostControlClass,
  buildAgentCellsPrimaryActionClass,
  buildAgentCellsWorkspacePanelClass,
  type AgentCellsBadgeTone,
  type AgentCellsAttentionTone,
} from './surfaceTokens';

type LifecycleMetaItem = {
  icon: LucideIcon;
  label: string;
  tone?: 'default' | 'muted' | 'emphasis';
};

type LifecycleAction = {
  label: string;
  icon: LucideIcon;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  title?: string;
  tone?: 'primary' | 'secondary';
};

export type LifecycleChip = {
  key: string;
  label: string;
  tone: AgentCellsBadgeTone;
  title?: string;
  icon?: React.ReactNode;
};

type LifecycleCellRailCardProps = {
  tone: 'cleanup' | 'archived';
  selected?: boolean;
  title: string;
  chips?: LifecycleChip[];
  pathLabel: string;
  pathIcon: React.ReactNode;
  eyebrow: string;
  body: string;
  meta: LifecycleMetaItem[];
  attentionItem?: AttentionItem | null;
  attentionCount?: number;
  primaryAction?: LifecycleAction | null;
  secondaryAction?: LifecycleAction | null;
  testId?: string;
  attentionTone?: AgentCellsAttentionTone;
  onAttentionClick?: (item: AttentionItem) => void;
};

const focusRingClass = focusRing.dark;

const toneClassByKind = {
  cleanup: {
    shell: buildAgentCellsWorkspacePanelClass({ selected: false, tone: 'detached' }),
    shellSelected: buildAgentCellsWorkspacePanelClass({ selected: true, tone: 'detached' }),
    inset: 'bg-[linear-gradient(180deg,rgba(255,245,220,0.012),rgba(255,255,255,0.004))]',
    eyebrow: 'text-amber-100/72',
    path: 'text-stone-300/54',
    primary: buildAgentCellsPrimaryActionClass('amber'),
  },
  archived: {
    shell: buildAgentCellsWorkspacePanelClass({ selected: false, tone: 'legacy' }),
    shellSelected: buildAgentCellsWorkspacePanelClass({ selected: true, tone: 'legacy' }),
    inset: 'bg-[linear-gradient(180deg,rgba(255,255,255,0.018),rgba(255,255,255,0.006))]',
    eyebrow: 'text-slate-100/66',
    path: 'text-slate-300/52',
    primary: buildAgentCellsPrimaryActionClass('neutral'),
  },
} as const;

const metaToneClass = {
  default: 'text-foreground/74',
  muted: 'text-muted-foreground/64',
  emphasis: 'text-foreground/82',
} as const;

export function LifecycleCellRailCard({
  tone,
  selected = false,
  title,
  chips = [],
  pathLabel,
  pathIcon,
  eyebrow,
  body,
  meta,
  attentionItem = null,
  attentionCount = 0,
  primaryAction = null,
  secondaryAction = null,
  testId,
  attentionTone = resolveAgentCellsAttentionTone(String(attentionItem?.kind || '')),
  onAttentionClick,
}: LifecycleCellRailCardProps) {
  const toneClass = toneClassByKind[tone];

  return (
    <div
      data-testid={testId}
      className={
        selected
          ? toneClass.shellSelected
          : buildAgentCellsWorkspacePanelClass({
              selected: false,
              tone: tone === 'cleanup' ? 'detached' : 'legacy',
              attentionTone,
            })
      }
    >
      <div className={`px-3 py-2.5 ${toneClass.inset}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 flex-wrap items-start gap-x-2 gap-y-1">
              <span className="truncate text-[12px] font-semibold tracking-[0.01em] text-foreground">
                {title}
              </span>
              {chips.length ? (
                <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 pt-[1px]">
                  {chips.map((chip, index) => (
                    <React.Fragment key={chip.key}>
                      {index > 0 ? <span className="h-1 w-1 rounded-full bg-black/24" aria-hidden="true" /> : null}
                      <span className={`${buildAgentCellsBadgeClass(chip.tone)} gap-1`} title={chip.title}>
                        {chip.icon}
                        <span>{chip.label}</span>
                      </span>
                    </React.Fragment>
                  ))}
                </div>
              ) : null}
            </div>
            <div className={`mt-1.5 flex min-w-0 items-center gap-1.5 text-[10px] ${toneClass.path}`}>
              <span className="shrink-0">{pathIcon}</span>
              <span className="truncate">{pathLabel}</span>
            </div>
          </div>
          {attentionItem ? (
            onAttentionClick ? (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onAttentionClick(attentionItem);
                }}
                className="shrink-0"
                title={attentionItem.detail}
              >
                <AgentCellsAttentionBadge
                  item={attentionItem}
                  count={attentionCount}
                  className="shrink-0"
                />
              </button>
            ) : (
              <AgentCellsAttentionBadge
                item={attentionItem}
                count={attentionCount}
                className="shrink-0"
              />
            )
          ) : null}
        </div>
      </div>

      <div className="bg-black/12 px-3 py-2.5 shadow-[inset_0_1px_0_rgba(0,0,0,0.24)]">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <span className={`text-[9px] font-semibold uppercase tracking-[0.22em] ${toneClass.eyebrow}`}>
            {eyebrow}
          </span>
          {meta.map((item) => {
            const Icon = item.icon;
            return (
              <span
                key={`${item.label}`}
                className={`inline-flex items-center gap-1.5 text-[10px] ${metaToneClass[item.tone || 'default']}`}
              >
                <Icon size={10} strokeWidth={1.7} />
                <span>{item.label}</span>
              </span>
            );
          })}
        </div>

        <p className="mt-2 max-w-[62ch] text-[11px] leading-[1.55] text-muted-foreground/80">
          {body}
        </p>

        {(primaryAction || secondaryAction) ? (
          <div className="mt-2.5 flex items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              {primaryAction ? (
                <LifecycleActionButton action={primaryAction} toneClass={toneClass.primary} />
              ) : null}
            </div>
            {secondaryAction ? (
              <LifecycleSecondaryActionButton action={secondaryAction} />
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function LifecycleActionButton({
  action,
  toneClass,
}: {
  action: LifecycleAction;
  toneClass: string;
}) {
  const Icon = action.icon;
  return (
    <button
      type="button"
      onClick={action.onClick}
      title={action.title}
      className={`inline-flex items-center gap-1.5 ${toneClass} ${focusRingClass}`}
    >
      <Icon size={12} strokeWidth={1.8} />
      <span>{action.label}</span>
    </button>
  );
}

function LifecycleSecondaryActionButton({
  action,
}: {
  action: LifecycleAction;
}) {
  const Icon = action.icon;
  return (
    <button
      type="button"
      onClick={action.onClick}
      title={action.title}
      className={`${buildAgentCellsGhostControlClass()} inline-flex gap-1.5 ${focusRingClass}`}
    >
      <Icon size={12} strokeWidth={1.7} />
      <span>{action.label}</span>
    </button>
  );
}
