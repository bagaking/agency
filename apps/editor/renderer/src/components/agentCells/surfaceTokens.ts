export const AGENT_CELLS_SECTION_BADGE_BASE =
  'inline-flex items-center rounded-[7px] border px-1.5 py-[3px] text-[8px] font-semibold uppercase tracking-[0.14em]';

export const AGENT_CELLS_PANEL_BASE =
  'overflow-hidden rounded-[18px] border shadow-[0_18px_42px_-34px_rgba(0,0,0,0.72)]';

export function buildAgentCellsWorkspacePanelClass({
  selected,
  tone,
  attentionClass = '',
}: {
  selected: boolean;
  tone: 'tracked' | 'detached' | 'unmanaged' | 'legacy';
  attentionClass?: string;
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
  return `${AGENT_CELLS_PANEL_BASE} ${baseByTone[tone]} ${attentionClass}`.trim();
}

export function buildAgentCellsInlineControlClass() {
  return 'inline-flex items-center rounded-[7px] border border-black/22 bg-black/12 px-2 py-1 text-[10px] font-medium text-muted-foreground transition-colors hover:border-black/30 hover:text-foreground';
}
