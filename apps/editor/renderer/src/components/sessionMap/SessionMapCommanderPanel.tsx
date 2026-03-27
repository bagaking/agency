import React, { useMemo } from 'react';
import { MessageSquareText } from 'lucide-react';
import { AgentAvatarBadge } from '../ui/AgentAvatarBadge';

const statusTone = (status: string) => {
  const normalized = String(status || '').trim().toLowerCase();
  if (normalized === 'succeeded') {
    return {
      pill: 'border-emerald-400/30 bg-emerald-500/12 text-emerald-200',
      glow: 'shadow-[0_0_30px_rgba(16,185,129,0.18)]',
      label: 'COMPLETE',
    };
  }
  if (normalized === 'failed') {
    return {
      pill: 'border-rose-400/30 bg-rose-500/12 text-rose-100',
      glow: 'shadow-[0_0_30px_rgba(244,63,94,0.18)]',
      label: 'ALERT',
    };
  }
  if (normalized === 'cancelled') {
    return {
      pill: 'border-amber-300/30 bg-amber-500/12 text-amber-100',
      glow: 'shadow-[0_0_30px_rgba(251,191,36,0.14)]',
      label: 'HALTED',
    };
  }
  if (['queued', 'running', 'cancelling'].includes(normalized)) {
    return {
      pill: 'border-cyan-300/30 bg-cyan-500/12 text-cyan-100',
      glow: 'shadow-[0_0_30px_rgba(34,211,238,0.2)]',
      label: normalized === 'queued' ? 'QUEUED' : 'ACTIVE',
    };
  }
  return {
    pill: 'border-white/10 bg-white/[0.05] text-white/45',
    glow: '',
    label: 'IDLE',
  };
};

export function SessionMapCommanderPanel({
  harnessRuns,
  dialogOpen = false,
  onOpenDialog,
  buttonRef,
}: any) {
  const runList = Array.isArray(harnessRuns) ? harnessRuns : [];
  const activeRun = useMemo(
    () =>
      runList.find((run) =>
        ['queued', 'running', 'cancelling'].includes(String(run?.status || '').trim().toLowerCase())
      ) || runList[0] || null,
    [runList]
  );
  const tone = statusTone(activeRun?.status || '');
  const commanderAvatarId = 'AGENCY_BACKEND_COMMANDER';
  const directiveLabel = activeRun?.goal?.title || 'Awaiting command';
  const providerLabel = String(activeRun?.runner?.providerId || 'standby')
    .replace(/_/g, ' ')
    .toUpperCase();

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={() => onOpenDialog?.()}
      aria-expanded={dialogOpen}
      aria-haspopup="dialog"
      aria-controls="session-map-commander-drawer"
      aria-label="Open commander briefing drawer"
      data-commander-trigger="true"
      title={directiveLabel}
      className={`group flex h-full min-h-0 flex-col overflow-hidden rounded-2xl bg-[linear-gradient(180deg,rgba(11,17,24,0.97),rgba(6,9,14,0.97))] px-2 py-2 text-left transition-colors ${tone.glow} shadow-[inset_0_0_0_1px_rgba(34,211,238,0.08),0_10px_24px_rgba(0,0,0,0.22)] hover:bg-[linear-gradient(180deg,rgba(13,20,28,0.99),rgba(8,12,18,0.99))] ${
        dialogOpen ? 'ring-1 ring-cyan-300/28 shadow-[inset_0_0_0_1px_rgba(34,211,238,0.14),0_0_0_1px_rgba(34,211,238,0.12),0_10px_24px_rgba(0,0,0,0.22)]' : ''
      }`}
    >
      <div className="flex items-center justify-between gap-1">
        <div className="text-[7px] font-black uppercase tracking-[0.2em] text-cyan-100/68">
          Commander
        </div>
        <div
          className={`rounded-full border px-1.5 py-0.5 text-[6px] font-bold uppercase tracking-[0.12em] ${tone.pill}`}
        >
          {dialogOpen ? 'OPEN' : tone.label}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2.5 py-2">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-cyan-500/20 blur-2xl" />
          <AgentAvatarBadge
            avatarId={commanderAvatarId}
            size={48}
            showRing={false}
            className="relative rounded-full bg-black/55 p-1"
          />
        </div>

        <div className="text-center">
          <div className="font-mono text-[8px] font-black uppercase tracking-[0.12em] text-white">
            Agency
          </div>
          <div className="mt-0.5 text-[6px] uppercase tracking-[0.14em] text-white/40">
            Backend
          </div>
          <div className="mt-1 inline-flex rounded-full border border-white/10 bg-white/[0.05] px-2 py-0.5 text-[6px] font-bold uppercase tracking-[0.12em] text-white/64">
            {providerLabel}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/8 bg-white/[0.035] px-2 py-2 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]">
        <div className="text-[6px] font-bold uppercase tracking-[0.14em] text-white/34">
          Directive
        </div>
        <div className="mt-1 max-h-9 overflow-hidden text-[7px] leading-tight text-white/74">
          {directiveLabel}
        </div>
        <div className="mt-2 inline-flex items-center gap-1.5 text-[7px] font-bold uppercase tracking-[0.12em] text-cyan-100/76">
          <MessageSquareText size={10} className="text-cyan-300/80" />
          <span>{dialogOpen ? 'Briefing open' : 'Open drawer'}</span>
        </div>
      </div>
    </button>
  );
}
