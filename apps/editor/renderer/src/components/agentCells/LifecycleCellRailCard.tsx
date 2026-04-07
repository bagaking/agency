import React from 'react';
import type { LucideIcon } from 'lucide-react';

import { AttentionPill } from '../attention/AttentionPill';
import type { AttentionItem } from '../../attention/attentionModel';
import { focusRing } from '../ui/focusRing';
import { buildAgentCellsWorkspacePanelClass } from './surfaceTokens';

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

type LifecycleChip = {
  key: string;
  label: string;
  className: string;
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
  shellClassName?: string;
};

const focusRingClass = focusRing.dark;

const toneClassByKind = {
  cleanup: {
    shell: buildAgentCellsWorkspacePanelClass({ selected: false, tone: 'detached' }),
    shellSelected: buildAgentCellsWorkspacePanelClass({ selected: true, tone: 'detached' }),
    inset: 'bg-[linear-gradient(180deg,rgba(255,245,220,0.012),rgba(255,255,255,0.004))]',
    eyebrow: 'text-amber-100/72',
    path: 'text-stone-300/54',
    primary:
      'bg-[linear-gradient(180deg,rgba(246,210,126,0.2),rgba(202,138,4,0.18))] text-amber-50 hover:bg-[linear-gradient(180deg,rgba(250,220,150,0.26),rgba(217,148,8,0.24))] shadow-[0_10px_24px_-18px_rgba(251,191,36,0.45)]',
  },
  archived: {
    shell: buildAgentCellsWorkspacePanelClass({ selected: false, tone: 'legacy' }),
    shellSelected: buildAgentCellsWorkspacePanelClass({ selected: true, tone: 'legacy' }),
    inset: 'bg-[linear-gradient(180deg,rgba(255,255,255,0.018),rgba(255,255,255,0.006))]',
    eyebrow: 'text-slate-100/66',
    path: 'text-slate-300/52',
    primary:
      'bg-white/[0.08] text-slate-50 hover:bg-white/[0.12] shadow-[0_10px_24px_-18px_rgba(148,163,184,0.14)]',
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
  shellClassName = '',
}: LifecycleCellRailCardProps) {
  const toneClass = toneClassByKind[tone];

  return (
    <div
      data-testid={testId}
      className={`${selected ? toneClass.shellSelected : toneClass.shell} ${shellClassName}`.trim()}
    >
      <div className={`px-4 py-3.5 ${toneClass.inset}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 flex-wrap items-start gap-x-2 gap-y-1">
              <span className="truncate text-[14px] font-semibold tracking-[0.005em] text-foreground">
                {title}
              </span>
              {chips.length ? (
                <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 pt-[1px]">
                  {chips.map((chip, index) => (
                    <React.Fragment key={chip.key}>
                      {index > 0 ? (
                        <span className="h-1 w-1 rounded-full bg-white/[0.14]" aria-hidden="true" />
                      ) : null}
                      <span className={chip.className} title={chip.title}>
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
            <AttentionPill item={attentionItem} count={attentionCount} className="shrink-0 px-1.5 py-[2px]" />
          ) : null}
        </div>
      </div>

      <div className="border-t border-black/18 bg-black/16 px-4 py-3">
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

        <p className="mt-2.5 max-w-[62ch] text-[12px] leading-[1.58] text-muted-foreground/82">
          {body}
        </p>

        {(primaryAction || secondaryAction) ? (
          <div className="mt-3 flex items-center justify-between gap-2">
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
      className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] transition-colors ${toneClass} ${focusRingClass}`}
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
      className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[10px] font-medium text-muted-foreground/82 transition-colors hover:bg-white/[0.04] hover:text-foreground ${focusRingClass}`}
    >
      <Icon size={12} strokeWidth={1.7} />
      <span>{action.label}</span>
    </button>
  );
}
