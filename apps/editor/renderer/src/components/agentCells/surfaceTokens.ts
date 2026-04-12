export const AGENT_CELLS_SECTION_BADGE_BASE =
  'inline-flex items-center rounded-[7px] bg-black/20 px-1.5 py-[3px] text-[8px] font-semibold uppercase tracking-[0.14em] shadow-[inset_0_0_0_1px_rgba(6,8,12,0.42)]';

export const AGENT_CELLS_PANEL_BASE =
  'overflow-hidden rounded-[18px] shadow-[0_20px_44px_-32px_rgba(0,0,0,0.82),inset_0_0_0_1px_rgba(9,11,15,0.58)]';

export type AgentCellsAttentionTone =
  | 'none'
  | 'failed'
  | 'pending_confirmation'
  | 'return_required'
  | 'running'
  | 'unread';

export type AgentCellsBadgeTone =
  | 'default'
  | 'detached'
  | 'unmanaged'
  | 'legacy'
  | 'project_root'
  | 'attached'
  | 'missing'
  | 'active'
  | 'paused';

export function buildAgentCellsBadgeClass(tone: AgentCellsBadgeTone = 'default') {
  const toneClasses = {
    default: 'bg-black/20 text-foreground/70 shadow-[inset_0_0_0_1px_rgba(6,8,12,0.42)]',
    detached: 'bg-amber-500/[0.14] text-amber-100/82 shadow-[inset_0_0_0_1px_rgba(79,57,26,0.56)]',
    unmanaged: 'bg-sky-500/[0.14] text-sky-100/82 shadow-[inset_0_0_0_1px_rgba(29,65,94,0.56)]',
    legacy: 'bg-slate-500/[0.13] text-slate-100/72 shadow-[inset_0_0_0_1px_rgba(29,34,41,0.5)]',
    project_root: 'bg-sky-500/[0.14] text-sky-100/82 shadow-[inset_0_0_0_1px_rgba(29,65,94,0.56)]',
    attached: 'bg-emerald-500/[0.14] text-emerald-100/82 shadow-[inset_0_0_0_1px_rgba(24,67,52,0.56)]',
    missing: 'bg-rose-500/[0.14] text-rose-100/84 shadow-[inset_0_0_0_1px_rgba(82,46,52,0.54)]',
    active: 'bg-emerald-500/[0.14] text-emerald-100/84 shadow-[inset_0_0_0_1px_rgba(24,67,52,0.56)]',
    paused: 'bg-amber-500/[0.14] text-amber-100/82 shadow-[inset_0_0_0_1px_rgba(79,57,26,0.56)]',
  } as const;
  return `${AGENT_CELLS_SECTION_BADGE_BASE} ${toneClasses[tone]}`;
}

export function buildAgentCellsIconWellClass(tone: 'tracked' | 'detached' | 'unmanaged' | 'virtual') {
  const classes = {
    tracked:
      'bg-[linear-gradient(180deg,rgba(28,32,40,0.96),rgba(16,19,24,0.98))] text-foreground/76 shadow-[inset_0_0_0_1px_rgba(7,9,12,0.42)]',
    detached:
      'bg-[linear-gradient(180deg,rgba(88,62,24,0.4),rgba(44,31,15,0.58))] text-amber-100/84 shadow-[inset_0_0_0_1px_rgba(79,57,26,0.48)]',
    unmanaged:
      'bg-[linear-gradient(180deg,rgba(25,72,108,0.38),rgba(13,38,58,0.56))] text-sky-100/84 shadow-[inset_0_0_0_1px_rgba(29,65,94,0.48)]',
    virtual:
      'bg-[linear-gradient(180deg,rgba(59,130,246,0.28),rgba(28,66,148,0.46))] text-primary-foreground/84 shadow-[inset_0_0_0_1px_rgba(24,55,124,0.42)]',
  } as const;
  return classes[tone];
}

export function buildAgentCellsGhostControlClass() {
  return 'rounded-lg bg-black/18 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/90 shadow-[inset_0_0_0_1px_rgba(8,10,14,0.34)] transition-colors hover:bg-black/26 hover:text-foreground';
}

export function buildAgentCellsPrimaryActionClass(tone: 'sky' | 'amber' | 'neutral' = 'sky') {
  const classes = {
    sky: 'rounded-lg bg-sky-500/[0.18] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-50 shadow-[inset_0_0_0_1px_rgba(29,65,94,0.48)] transition-colors hover:bg-sky-500/[0.26]',
    amber:
      'rounded-lg bg-amber-500/[0.2] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-50 shadow-[inset_0_0_0_1px_rgba(79,57,26,0.48)] transition-colors hover:bg-amber-500/[0.28]',
    neutral:
      'rounded-lg bg-black/22 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground shadow-[inset_0_0_0_1px_rgba(8,10,14,0.38)] transition-colors hover:bg-black/30',
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

export function buildAgentCellsAttentionPillClass(tone: AgentCellsAttentionTone) {
  const toneClasses = {
    none: 'bg-black/24 text-white/64 shadow-[inset_0_0_0_1px_rgba(8,10,14,0.34)]',
    failed: 'bg-rose-500/[0.14] text-rose-100/88 shadow-[inset_0_0_0_1px_rgba(82,46,52,0.54)]',
    pending_confirmation:
      'bg-amber-500/[0.14] text-amber-100/88 shadow-[inset_0_0_0_1px_rgba(79,57,26,0.54)]',
    return_required:
      'bg-cyan-500/[0.13] text-cyan-100/88 shadow-[inset_0_0_0_1px_rgba(29,65,94,0.52)]',
    running: 'bg-sky-500/[0.13] text-sky-100/86 shadow-[inset_0_0_0_1px_rgba(29,65,94,0.5)]',
    unread: 'bg-black/28 text-white/74 shadow-[inset_0_0_0_1px_rgba(8,10,14,0.4)]',
  } as const;
  return `inline-flex items-center gap-1 rounded-[7px] px-1.5 py-[3px] text-[8px] font-semibold uppercase tracking-[0.14em] ${toneClasses[tone]}`;
}

export function buildAgentCellsAttentionCountClass() {
  return 'rounded-[5px] bg-black/32 px-1 py-[1px] text-[8px] leading-none text-white/78 shadow-[inset_0_0_0_1px_rgba(8,10,14,0.32)]';
}

export function buildAgentCellsAttentionCardClass(tone: AgentCellsAttentionTone): string {
  switch (tone) {
    case 'failed':
      return 'bg-[linear-gradient(180deg,rgba(47,23,29,0.985),rgba(27,16,19,0.99))] shadow-[inset_0_0_0_1px_rgba(82,46,52,0.54),0_20px_44px_-32px_rgba(0,0,0,0.82)]';
    case 'pending_confirmation':
      return 'bg-[linear-gradient(180deg,rgba(48,37,21,0.985),rgba(26,20,12,0.99))] shadow-[inset_0_0_0_1px_rgba(79,57,26,0.54),0_20px_44px_-32px_rgba(0,0,0,0.82)]';
    case 'return_required':
      return 'bg-[linear-gradient(180deg,rgba(18,35,47,0.985),rgba(11,20,29,0.99))] shadow-[inset_0_0_0_1px_rgba(29,65,94,0.54),0_20px_44px_-32px_rgba(0,0,0,0.82)]';
    case 'running':
      return 'bg-[linear-gradient(180deg,rgba(20,36,47,0.985),rgba(12,20,29,0.99))] shadow-[inset_0_0_0_1px_rgba(29,65,94,0.5),0_20px_44px_-32px_rgba(0,0,0,0.82)]';
    case 'unread':
      return 'bg-[linear-gradient(180deg,rgba(30,34,40,0.985),rgba(19,22,27,0.99))] shadow-[inset_0_0_0_1px_rgba(26,31,38,0.54),0_20px_44px_-32px_rgba(0,0,0,0.82)]';
    default:
      return '';
  }
}

export function buildAgentCellsAttentionRowClass(tone: AgentCellsAttentionTone): string {
  switch (tone) {
    case 'failed':
      return 'bg-rose-500/[0.06] shadow-[inset_0_0_0_1px_rgba(82,46,52,0.32)] hover:bg-rose-500/[0.08]';
    case 'pending_confirmation':
      return 'bg-amber-500/[0.06] shadow-[inset_0_0_0_1px_rgba(79,57,26,0.32)] hover:bg-amber-500/[0.08]';
    case 'return_required':
      return 'bg-cyan-500/[0.055] shadow-[inset_0_0_0_1px_rgba(29,65,94,0.3)] hover:bg-cyan-500/[0.072]';
    case 'running':
      return 'bg-sky-500/[0.05] shadow-[inset_0_0_0_1px_rgba(29,65,94,0.28)] hover:bg-sky-500/[0.068]';
    case 'unread':
      return 'bg-white/[0.022] shadow-[inset_0_0_0_1px_rgba(19,22,27,0.24)] hover:bg-white/[0.04]';
    default:
      return '';
  }
}

export function buildAgentCellsSessionRowClass({
  selected,
  attentionTone = 'none',
  dropInto = false,
  dragging = false,
}: {
  selected: boolean;
  attentionTone?: AgentCellsAttentionTone;
  dropInto?: boolean;
  dragging?: boolean;
}) {
  const base =
    'group relative flex w-full min-w-0 items-center gap-2.5 rounded-xl py-1.5 pr-2 text-left text-[11px] transition-all duration-200 select-none';
  if (selected) {
    return `${base} bg-primary/[0.1] text-foreground shadow-[inset_0_0_0_1px_rgba(44,82,140,0.34),0_8px_18px_-16px_rgba(59,130,246,0.42)]`;
  }
  const attentionClass = buildAgentCellsAttentionRowClass(attentionTone);
  return `${base} ${attentionClass || 'bg-black/[0.02] hover:bg-white/[0.02]'} text-muted-foreground hover:text-foreground ${
    dropInto ? 'ring-1 ring-primary/24 bg-primary/[0.05]' : ''
  } ${dragging ? 'opacity-45' : ''}`.trim();
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
      'bg-[linear-gradient(180deg,rgba(21,24,31,0.965),rgba(13,16,22,0.99))]',
    detached:
      'bg-[linear-gradient(180deg,rgba(37,29,21,0.965),rgba(20,16,12,0.99))]',
    unmanaged:
      'bg-[linear-gradient(180deg,rgba(19,28,37,0.965),rgba(11,17,24,0.99))]',
    legacy:
      'bg-[linear-gradient(180deg,rgba(26,30,36,0.965),rgba(16,19,23,0.99))]',
  } as const;
  const selectedByTone = {
    tracked:
      'bg-[linear-gradient(180deg,rgba(31,38,51,0.99),rgba(21,26,35,0.99))] shadow-[0_22px_46px_-32px_rgba(59,130,246,0.34),inset_0_0_0_1px_rgba(44,82,140,0.36)]',
    detached:
      'bg-[linear-gradient(180deg,rgba(49,38,22,0.99),rgba(27,21,13,0.99))] shadow-[0_22px_46px_-32px_rgba(245,158,11,0.32),inset_0_0_0_1px_rgba(79,57,26,0.38)]',
    unmanaged:
      'bg-[linear-gradient(180deg,rgba(24,36,47,0.99),rgba(14,20,28,0.99))] shadow-[0_22px_46px_-32px_rgba(56,189,248,0.3),inset_0_0_0_1px_rgba(29,65,94,0.36)]',
    legacy:
      'bg-[linear-gradient(180deg,rgba(31,35,41,0.99),rgba(20,23,28,0.99))] shadow-[0_22px_46px_-32px_rgba(148,163,184,0.28),inset_0_0_0_1px_rgba(29,34,41,0.34)]',
  } as const;
  if (selected) {
    return `${AGENT_CELLS_PANEL_BASE} ${selectedByTone[tone]}`;
  }
  return `${AGENT_CELLS_PANEL_BASE} ${baseByTone[tone]} ${
    buildAgentCellsAttentionCardClass(attentionTone) || ''
  }`.trim();
}

export function buildAgentCellsInlineControlClass() {
  return 'inline-flex items-center rounded-[7px] bg-black/18 px-2 py-1 text-[10px] font-medium text-muted-foreground/88 shadow-[inset_0_0_0_1px_rgba(8,10,14,0.34)] transition-colors hover:bg-black/26 hover:text-foreground';
}
