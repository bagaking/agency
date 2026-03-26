import React, { useMemo } from 'react';
import { Bot, Cpu, MessageSquareText, Radar } from 'lucide-react';
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

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={() => onOpenDialog?.()}
      aria-pressed={dialogOpen}
      className={`flex h-full min-h-0 flex-col overflow-hidden rounded-2xl bg-[linear-gradient(180deg,rgba(11,17,24,0.96),rgba(7,10,15,0.95))] px-2.5 py-2 text-left transition-colors ${tone.glow} shadow-[inset_0_0_0_1px_rgba(34,211,238,0.08),0_10px_24px_rgba(0,0,0,0.22)] hover:bg-[linear-gradient(180deg,rgba(13,20,28,0.98),rgba(8,12,18,0.98))] ${
        dialogOpen ? 'ring-1 ring-cyan-300/28 shadow-[inset_0_0_0_1px_rgba(34,211,238,0.14),0_0_0_1px_rgba(34,211,238,0.12),0_10px_24px_rgba(0,0,0,0.22)]' : ''
      }`}
    >
      <div className="text-[7px] font-black uppercase tracking-[0.22em] text-cyan-100/68">
        Commander
      </div>

      <div className="relative mt-2">
        <div className="absolute inset-0 rounded-full bg-cyan-500/20 blur-2xl" />
        <AgentAvatarBadge
          avatarId={commanderAvatarId}
          size={52}
          showRing={false}
          className="relative rounded-full bg-black/55 p-1"
        />
      </div>

      <div className="mt-2 text-center">
        <div className="font-mono text-[9px] font-black uppercase tracking-[0.12em] text-white">
          Agency
        </div>
        <div className="mt-0.5 text-[7px] uppercase tracking-[0.14em] text-white/40">
          Agent Backend
        </div>
      </div>

      <div className={`mt-2 rounded border px-2 py-1 text-[7px] font-bold uppercase tracking-[0.14em] ${tone.pill}`}>
        {tone.label}
      </div>

      <div className="mt-2 min-h-0 w-full flex-1 space-y-1.5 overflow-y-auto pr-1 text-[7px] font-bold uppercase tracking-[0.12em] text-white/48">
        <div className="rounded-xl bg-white/[0.035] px-2 py-1.5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.045)]">
          <div className="flex items-center gap-1.5 text-white/38">
            <Radar size={10} className="text-cyan-300/80" />
            Directive
          </div>
          <div className="mt-1 text-[7px] leading-relaxed text-white/74">
            {activeRun?.goal?.title || 'Awaiting command'}
          </div>
        </div>

        <div className="rounded-xl bg-white/[0.035] px-2 py-1.5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.045)]">
          <div className="flex items-center gap-1.5 text-white/38">
            <Cpu size={10} className="text-cyan-300/80" />
            Provider
          </div>
          <div className="mt-1 text-[7px] text-white/74">
            {activeRun?.runner?.providerId || activeRun?.result?.agent?.metadata?.providerThreadId ? 'CODEX CLI' : 'STANDBY'}
          </div>
        </div>

        <div className="rounded-xl bg-white/[0.035] px-2 py-1.5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.045)]">
          <div className="flex items-center gap-1.5 text-white/38">
            <MessageSquareText size={10} className="text-cyan-300/80" />
            Dialog
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-[7px] text-white/70">
            <Bot size={10} className="text-cyan-200/70" />
            <span>{dialogOpen ? 'Dialog open' : 'Open commander popup'}</span>
          </div>
        </div>
      </div>
    </button>
  );
}
