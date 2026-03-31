import React from 'react';
import {
  Camera,
  Layers,
  Quote,
  StickyNote,
  Terminal,
  type LucideIcon,
} from 'lucide-react';

export const HIL_MEMO_SECTION_DEFS: Array<{
  id: string;
  label: string;
  description: string;
  kind: 'comment' | 'memo';
  noteType: string | null;
  icon: LucideIcon;
}> = [
  {
    id: 'comments',
    label: 'Comments',
    description: 'File-linked review notes',
    kind: 'comment',
    noteType: null,
    icon: Terminal,
  },
  {
    id: 'flash',
    label: 'Flash',
    description: 'Quick note capture',
    kind: 'memo',
    noteType: 'flash',
    icon: StickyNote,
  },
  {
    id: 'excerpt',
    label: 'Excerpt',
    description: 'Source-backed capture',
    kind: 'memo',
    noteType: 'excerpt',
    icon: Quote,
  },
  {
    id: 'screenshot',
    label: 'Screenshot',
    description: 'Capture and annotate',
    kind: 'memo',
    noteType: 'screenshot',
    icon: Camera,
  },
];

export const HIL_SURFACE_COPY = {
  workspaceTitle: 'Memo',
  workspaceSubtitle: 'Artifact Workspace',
  commentsTitle: 'Comments',
  commentsSubtitle: 'Comment Inbox',
  draftsTitle: 'Drafts',
  draftsSubtitle: 'Execution-ready artifacts',
  promoteTitle: 'Promote',
  promoteSubtitle: 'Draft delivery plan',
  captureTitle: 'Capture',
  captureSubtitle: 'Inbox shortcuts',
  replyTitle: 'Session Reply',
} as const;

export function resolveHilDrawerMeta({
  activeView,
  hilDrawerPanel,
  hilReplyProps,
  hilSubtitle,
}: any) {
  const isMemoView = activeView === 'memo';
  const isAgentCellsView = activeView === 'agent-cells';
  const panels = isMemoView
    ? []
    : isAgentCellsView
      ? [{ id: 'reply', label: 'Reply' }]
      : [
          { id: 'comments', label: HIL_SURFACE_COPY.commentsTitle },
          { id: 'drafts', label: HIL_SURFACE_COPY.draftsTitle },
        ];
  const title = isMemoView
    ? HIL_SURFACE_COPY.workspaceTitle
    : hilDrawerPanel === 'reply'
      ? HIL_SURFACE_COPY.replyTitle
      : hilDrawerPanel === 'drafts'
        ? HIL_SURFACE_COPY.draftsTitle
        : HIL_SURFACE_COPY.commentsTitle;
  const subtitle = isMemoView
    ? HIL_SURFACE_COPY.captureSubtitle
    : hilDrawerPanel === 'reply'
      ? hilReplyProps?.session?.name || hilReplyProps?.session?.id || ''
      : hilDrawerPanel === 'drafts'
        ? HIL_SURFACE_COPY.draftsSubtitle
        : hilSubtitle || HIL_SURFACE_COPY.commentsSubtitle;
  const contentScrollable = !(isAgentCellsView && hilDrawerPanel === 'reply');
  const contentClassName = isAgentCellsView && hilDrawerPanel === 'reply' ? 'p-0' : '';
  return {
    isMemoView,
    isAgentCellsView,
    panels,
    title,
    subtitle,
    contentScrollable,
    contentClassName,
  };
}

export function HilSurfaceHeader({
  eyebrow,
  title,
  subtitle,
  meta,
  actions,
  compact = false,
}: any) {
  return (
    <div className={`flex items-start justify-between gap-3 ${compact ? '' : 'mb-3'}`}>
      <div className="min-w-0 flex-1">
        {eyebrow ? (
          <div className="text-[9px] font-semibold uppercase tracking-[0.22em] text-muted-foreground/48">
            {eyebrow}
          </div>
        ) : null}
        <div className={`${compact ? 'mt-0.5 text-[14px]' : 'mt-1 text-[16px]'} font-semibold tracking-[0.01em] text-foreground`}>
          {title}
        </div>
        {subtitle ? (
          <div className="mt-1 text-[11px] leading-relaxed text-muted-foreground/64">
            {subtitle}
          </div>
        ) : null}
        {meta ? <div className="mt-2 flex flex-wrap items-center gap-2">{meta}</div> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function HilStatusBadge({
  label,
  tone = 'neutral',
  className = '',
}: {
  label: string;
  tone?: 'neutral' | 'active' | 'success' | 'warning' | 'danger';
  className?: string;
}) {
  const toneClasses =
    tone === 'active'
      ? 'border-primary/35 bg-primary/12 text-primary'
      : tone === 'success'
        ? 'border-emerald-500/35 bg-emerald-500/10 text-emerald-300'
        : tone === 'warning'
          ? 'border-amber-500/35 bg-amber-500/10 text-amber-200'
          : tone === 'danger'
            ? 'border-rose-500/35 bg-rose-500/10 text-rose-200'
            : 'border-border/30 bg-background/40 text-muted-foreground/70';

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.16em] ${toneClasses} ${className}`}
    >
      {label}
    </span>
  );
}

export function HilSurfaceSection({
  eyebrow,
  title,
  description,
  actions,
  children,
  tone = 'default',
  className = '',
}: any) {
  const toneClass =
    tone === 'active'
      ? 'border-primary/18 bg-primary/[0.07] shadow-[inset_0_0_0_1px_rgba(59,130,246,0.05)]'
      : 'border-white/[0.06] bg-[linear-gradient(180deg,rgba(28,33,42,0.74),rgba(16,19,24,0.9))] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03)]';

  return (
    <section className={`rounded-2xl border px-4 py-4 ${toneClass} ${className}`}>
      <HilSurfaceHeader
        eyebrow={eyebrow}
        title={title}
        subtitle={description}
        actions={actions}
        compact
      />
      {children}
    </section>
  );
}
