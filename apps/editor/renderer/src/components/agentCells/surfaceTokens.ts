export const AGENT_CELLS_SECTION_BADGE_BASE =
  'inline-flex items-center rounded-[7px] border px-1.5 py-[3px] text-[8px] font-semibold uppercase tracking-[0.14em]';

export const AGENT_CELLS_PANEL_BASE =
  'overflow-hidden rounded-[18px] border shadow-[0_18px_42px_-34px_rgba(0,0,0,0.72)]';

export type AgentCellsAttentionTone =
  | 'none'
  | 'failed'
  | 'pending_confirmation'
  | 'return_required'
  | 'running'
  | 'unread';

export function buildAgentCellsIconWellClass(tone: 'tracked' | 'detached' | 'unmanaged' | 'virtual') {
  const classes = {
    tracked:
      'border-black/24 bg-[linear-gradient(180deg,rgba(0,0,0,0.14),rgba(0,0,0,0.24))] text-foreground/72',
    detached: 'border-[rgba(74,57,35,0.94)] bg-amber-500/[0.08] text-amber-100/80',
    unmanaged: 'border-[rgba(34,54,72,0.94)] bg-sky-500/[0.08] text-sky-100/80',
    virtual: 'border-primary/16 bg-primary/[0.09] text-primary/82',
  } as const;
  return classes[tone];
}

export function buildAgentCellsGhostControlClass() {
  return 'rounded-lg border border-black/22 bg-black/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:border-black/30 hover:text-foreground';
}

export function buildAgentCellsPrimaryActionClass(tone: 'sky' | 'amber' | 'neutral' = 'sky') {
  const classes = {
    sky: 'rounded-lg border border-[rgba(34,54,72,0.94)] bg-sky-500/[0.16] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-50 transition-colors hover:bg-sky-500/[0.24]',
    amber: 'rounded-lg border border-[rgba(74,57,35,0.94)] bg-amber-500/[0.16] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-50 transition-colors hover:bg-amber-500/[0.24]',
    neutral: 'rounded-lg border border-black/22 bg-black/12 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground transition-colors hover:border-black/30 hover:bg-black/16',
  } as const;
  return classes[tone];
}

export function resolveAgentCellsAttentionTone(kind: string): AgentCellsAttentionTone {
  switch (String(kind || '').trim().toLowerCase()) {
    case 'failed':
    case 'pending_confirmation':
    case 'return_required':
    case 'running':
    case 'unread':
      return String(kind || '').trim().toLowerCase() as AgentCellsAttentionTone;
    default:
      return 'none';
  }
}

export function buildAgentCellsAttentionCardClass(tone: AgentCellsAttentionTone): string {
  switch (tone) {
    case 'failed':
      return 'border-[rgba(82,46,52,0.94)] bg-rose-500/[0.055] hover:bg-rose-500/[0.07]';
    case 'pending_confirmation':
      return 'border-[rgba(74,57,35,0.94)] bg-amber-500/[0.055] hover:bg-amber-500/[0.07]';
    case 'return_required':
      return 'border-[rgba(34,54,72,0.94)] bg-cyan-500/[0.048] hover:bg-cyan-500/[0.064]';
    case 'running':
      return 'border-[rgba(34,54,72,0.94)] bg-sky-500/[0.045] hover:bg-sky-500/[0.06]';
    case 'unread':
      return 'border-[rgba(45,50,60,0.94)] bg-white/[0.02] hover:bg-white/[0.035]';
    default:
      return '';
  }
}

export function buildAgentCellsAttentionRowClass(tone: AgentCellsAttentionTone): string {
  switch (tone) {
    case 'failed':
      return 'border-[rgba(82,46,52,0.86)] bg-rose-500/[0.05] hover:bg-rose-500/[0.07]';
    case 'pending_confirmation':
      return 'border-[rgba(74,57,35,0.86)] bg-amber-500/[0.048] hover:bg-amber-500/[0.066]';
    case 'return_required':
      return 'border-[rgba(34,54,72,0.86)] bg-cyan-500/[0.042] hover:bg-cyan-500/[0.062]';
    case 'running':
      return 'border-[rgba(34,54,72,0.86)] bg-sky-500/[0.038] hover:bg-sky-500/[0.055]';
    case 'unread':
      return 'border-[rgba(45,50,60,0.86)] bg-white/[0.018] hover:bg-white/[0.034]';
    default:
      return '';
  }
}

export function buildAgentCellsWorkspacePanelClass({
  selected,
  tone,
  attentionTone = 'none',
}: {
  selected: boolean;
  tone: 'tracked' | 'detached' | 'unmanaged' | 'legacy';
  attentionTone?: AgentCellsAttentionTone;
}) {
  const baseByTone = {
    tracked:
      'border-[rgba(35,42,53,0.94)] bg-[linear-gradient(180deg,rgba(21,24,31,0.965),rgba(15,18,24,0.99))]',
    detached:
      'border-[rgba(74,57,35,0.94)] bg-[linear-gradient(180deg,rgba(37,29,21,0.965),rgba(21,17,13,0.99))]',
    unmanaged:
      'border-[rgba(34,54,72,0.94)] bg-[linear-gradient(180deg,rgba(19,28,37,0.965),rgba(12,18,25,0.99))]',
    legacy:
      'border-[rgba(45,50,60,0.94)] bg-[linear-gradient(180deg,rgba(26,30,36,0.965),rgba(17,20,24,0.99))]',
  } as const;
  const selectedByTone = {
    tracked: 'border-primary/18 bg-primary/[0.05] shadow-[0_20px_44px_-32px_rgba(59,130,246,0.32)]',
    detached: 'border-amber-300/20 bg-amber-500/[0.075] shadow-[0_20px_44px_-32px_rgba(245,158,11,0.28)]',
    unmanaged: 'border-sky-300/18 bg-sky-500/[0.07] shadow-[0_20px_44px_-32px_rgba(56,189,248,0.26)]',
    legacy: 'border-slate-300/16 bg-slate-500/[0.06] shadow-[0_20px_44px_-32px_rgba(148,163,184,0.22)]',
  } as const;
  if (selected) {
    return `${AGENT_CELLS_PANEL_BASE} ${selectedByTone[tone]}`;
  }
  return `${AGENT_CELLS_PANEL_BASE} ${baseByTone[tone]} ${buildAgentCellsAttentionCardClass(attentionTone)}`.trim();
}

export function buildAgentCellsInlineControlClass() {
  return 'inline-flex items-center rounded-[7px] border border-black/22 bg-black/12 px-2 py-1 text-[10px] font-medium text-muted-foreground transition-colors hover:border-black/30 hover:text-foreground';
}
