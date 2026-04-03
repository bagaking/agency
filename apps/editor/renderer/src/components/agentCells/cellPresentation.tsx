import React from 'react';
import { Circle } from 'lucide-react';

const cellStateColors: Record<string, string> = {
  draft: 'text-muted-foreground',
  active: 'text-emerald-400',
  paused: 'text-amber-400',
  archived: 'text-slate-500',
};

const cellStateBadgeTone: Record<string, string> = {
  draft: 'border-white/10 bg-white/[0.04] text-white/65',
  active: 'border-emerald-400/25 bg-emerald-500/10 text-emerald-200',
  paused: 'border-amber-300/25 bg-amber-500/10 text-amber-100',
  archived: 'border-slate-500/20 bg-slate-500/10 text-slate-300/75',
};

export type CellAttachmentMeta = {
  attachmentState: 'attached' | 'detached' | 'missing';
  label: string;
  tone: string;
  pathLabel: string;
};

export function CellStateBadge({ state }: { state?: string }) {
  const normalized = String(state || '').trim().toLowerCase();
  if (!normalized) {
    return null;
  }
  const label = normalized === 'archived' ? 'legacy archived' : `legacy ${normalized}`;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.16em] ${
        cellStateBadgeTone[normalized] || cellStateBadgeTone.draft
      }`}
    >
      <Circle size={6} className={cellStateColors[normalized] || cellStateColors.draft} fill="currentColor" />
      <span>{label}</span>
    </span>
  );
}

export function resolveCellAttachmentMeta(cell: any): CellAttachmentMeta {
  const attachmentState = String(cell?.attachmentState || 'attached').trim().toLowerCase();
  const attachedPath = String(cell?.attachedWorktreePath || '').trim();
  const fallbackPath = String(cell?.lastKnownWorktreePath || cell?.worktreePath || '').trim();
  const pathLabelBase = attachedPath || fallbackPath;
  if (attachmentState === 'missing') {
    return {
      attachmentState: 'missing',
      label: 'Missing',
      tone: 'border-rose-300/24 bg-rose-500/10 text-rose-100',
      pathLabel: pathLabelBase,
    };
  }
  if (attachmentState === 'detached') {
    return {
      attachmentState: 'detached',
      label: 'Detached',
      tone: 'border-amber-300/24 bg-amber-500/10 text-amber-100',
      pathLabel: pathLabelBase,
    };
  }
  return {
    attachmentState: 'attached',
    label: 'Attached',
    tone: 'border-emerald-300/20 bg-emerald-500/10 text-emerald-100',
    pathLabel: String(cell?.branch || pathLabelBase || '').trim(),
  };
}

export function isArchivedCell(cell: any): boolean {
  if (!cell || cell.isVirtual) {
    return false;
  }
  return String(cell?.state || 'draft').trim().toLowerCase() === 'archived';
}

export function isDetachedCellCleanupCandidate(cell: any): boolean {
  if (!cell || cell.isVirtual) {
    return false;
  }
  const attachmentState = resolveCellAttachmentMeta(cell).attachmentState;
  return attachmentState !== 'attached' && !isArchivedCell(cell);
}

export function buildCellSessionSummary(sessions: any[] = []): string[] {
  const counts = sessions.reduce<Record<string, number>>((summary, session) => {
    const status = String(session?.status || 'unknown').trim().toLowerCase();
    summary[status] = (summary[status] || 0) + 1;
    return summary;
  }, {});

  const summary = [
    counts.active ? `${counts.active} live` : '',
    counts.detached ? `${counts.detached} detached` : '',
    counts.stale ? `${counts.stale} stale` : '',
    counts.closed ? `${counts.closed} closed` : '',
    counts.archived ? `${counts.archived} archived` : '',
  ].filter(Boolean);

  if (summary.length > 0) {
    return summary.slice(0, 3);
  }
  if (sessions.length > 0) {
    return [`${sessions.length} session${sessions.length === 1 ? '' : 's'}`];
  }
  return ['No sessions'];
}

export function buildArchivedCellCopy(cell: any, sessionSummary: string[]) {
  const attachmentMeta = resolveCellAttachmentMeta(cell);
  const summary = sessionSummary.join(' · ');
  if (attachmentMeta.attachmentState === 'attached') {
    return {
      eyebrow: 'Archived Cell',
      body:
        'This Cell is archived but still keeps its worktree attached for reference. Runtime evidence remains available from details without putting the Cell back into the active flow.',
      summary,
    };
  }
  return {
    eyebrow: 'Archived Cell',
    body:
      'This Cell is archived and no longer has a live worktree attachment. Repo-owned sessions and evidence remain available from details.',
    summary,
  };
}
