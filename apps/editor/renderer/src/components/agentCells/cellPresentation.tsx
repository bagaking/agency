import React from 'react';
import { Circle } from 'lucide-react';
import { AGENT_CELLS_SECTION_BADGE_BASE } from './surfaceTokens';

const cellStateColors: Record<string, string> = {
  draft: 'text-muted-foreground',
  active: 'text-emerald-400',
  paused: 'text-amber-400',
  archived: 'text-slate-500',
};

const cellStateBadgeTone: Record<string, string> = {
  draft: 'border-black/24 bg-black/12 text-white/58',
  active: 'border-[rgba(31,78,54,0.92)] bg-emerald-500/[0.075] text-emerald-200/86',
  paused: 'border-[rgba(74,57,35,0.92)] bg-amber-500/[0.075] text-amber-100/86',
  archived: 'border-black/22 bg-black/12 text-slate-300/70',
};

export type CellAttachmentMeta = {
  attachmentState: 'attached' | 'project_root' | 'detached' | 'missing';
  label: string;
  tone: string;
  pathLabel: string;
};

export type CellBranchMeta = {
  label: string;
  title: string;
  isDetachedHead: boolean;
};

export function CellStateBadge({ state }: { state?: string }) {
  const normalized = String(state || '').trim().toLowerCase();
  if (!normalized) {
    return null;
  }
  const label = normalized === 'archived' ? 'legacy archived' : `legacy ${normalized}`;
  return (
    <span
      className={`${AGENT_CELLS_SECTION_BADGE_BASE} gap-1 ${
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
  if (attachmentState === 'project_root') {
    return {
      attachmentState: 'project_root',
      label: 'Project Root',
      tone: 'border-[rgba(34,54,72,0.92)] bg-sky-500/[0.075] text-sky-100/80',
      pathLabel: String(cell?.projectRoot || cell?.repoRoot || '').trim(),
    };
  }
  if (attachmentState === 'missing') {
    return {
      attachmentState: 'missing',
      label: 'Missing',
      tone: 'border-[rgba(82,46,52,0.92)] bg-rose-500/[0.075] text-rose-100/82',
      pathLabel: pathLabelBase,
    };
  }
  if (attachmentState === 'detached') {
    return {
      attachmentState: 'detached',
      label: 'Detached',
      tone: 'border-[rgba(74,57,35,0.92)] bg-amber-500/[0.075] text-amber-100/82',
      pathLabel: pathLabelBase,
    };
  }
  return {
    attachmentState: 'attached',
    label: 'Attached',
    tone: 'border-[rgba(31,78,54,0.92)] bg-emerald-500/[0.072] text-emerald-100/82',
    pathLabel: String(cell?.branch || pathLabelBase || '').trim(),
  };
}

export function resolveCellBranchMeta(cell: any): CellBranchMeta {
  const branch = String(cell?.branch || '').trim();
  const head = String(cell?.head || '').trim();
  const isDetachedHead = Boolean(cell?.isDetachedHead) || (!branch && Boolean(head));
  if (isDetachedHead) {
    const shortHead = head ? head.slice(0, 7) : '';
    return {
      label: shortHead ? `Detached HEAD · ${shortHead}` : 'Detached HEAD',
      title: head ? `Detached HEAD at ${head}` : 'Detached HEAD',
      isDetachedHead: true,
    };
  }
  return {
    label: branch,
    title: branch,
    isDetachedHead: false,
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
  return ['detached', 'missing'].includes(attachmentState) && !isArchivedCell(cell);
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
