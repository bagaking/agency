import React, { useMemo } from 'react';
import { ChevronRight, MessageSquareText } from 'lucide-react';
import {
  SessionMapCommanderAvatar,
} from './SessionMapCommanderAvatar';
import {
  resolveActiveCommanderRun,
  resolveCommanderDirectiveLabel,
  resolveCommanderProviderLabel,
  resolvePrimaryCommanderRun,
} from '../../../../shared/commanderCore';

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
  briefingOpen = false,
  onOpenBriefing,
  buttonRef,
}: any) {
  const runList = Array.isArray(harnessRuns) ? harnessRuns : [];
  const activeCommanderRun = useMemo(
    () => resolveActiveCommanderRun(runList),
    [runList]
  );
  const activeRun = useMemo(() => resolvePrimaryCommanderRun(runList), [runList]);
  const tone = statusTone(activeRun?.status || '');
  const directiveLabel = resolveCommanderDirectiveLabel(activeRun);
  const providerLabel = resolveCommanderProviderLabel(activeRun);

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={() => onOpenBriefing?.()}
      aria-expanded={briefingOpen}
      aria-controls="session-map-commander-briefing"
      aria-label="Open commander briefing"
      data-commander-trigger="true"
      title={directiveLabel}
      className={`group flex h-full min-h-0 flex-col overflow-hidden rounded-2xl bg-[linear-gradient(180deg,rgba(11,17,24,0.97),rgba(6,9,14,0.97))] px-3 py-3 text-left transition-colors ${tone.glow} shadow-[inset_0_0_0_1px_rgba(34,211,238,0.08),0_10px_24px_rgba(0,0,0,0.22)] hover:bg-[linear-gradient(180deg,rgba(13,20,28,0.99),rgba(8,12,18,0.99))] ${
        briefingOpen ? 'ring-1 ring-cyan-300/28 shadow-[inset_0_0_0_1px_rgba(34,211,238,0.14),0_0_0_1px_rgba(34,211,238,0.12),0_10px_24px_rgba(0,0,0,0.22)]' : ''
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="text-[7px] font-black uppercase tracking-[0.2em] text-cyan-100/68">
          Commander
        </div>
        <div
          className={`rounded-full border px-1.5 py-0.5 text-[6px] font-bold uppercase tracking-[0.12em] ${tone.pill}`}
        >
          {briefingOpen ? 'OPEN' : tone.label}
        </div>
      </div>

      <div className="mt-3 flex min-h-0 flex-1 flex-col gap-3">
        <div className="rounded-2xl border border-cyan-300/10 bg-[linear-gradient(180deg,rgba(16,22,31,0.96),rgba(8,11,17,0.98))] px-3 py-3 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03)]">
          <div className="flex items-center gap-3">
            <SessionMapCommanderAvatar
              busy={Boolean(activeCommanderRun)}
              size={42}
              ringSize={50}
              className="shrink-0"
            />
            <div className="min-w-0">
              <div className="font-mono text-[8px] font-black uppercase tracking-[0.12em] text-white">
                Agency
              </div>
              <div className="mt-0.5 text-[6px] uppercase tracking-[0.16em] text-white/40">
                Backend Operator
              </div>
              <div className="mt-1 inline-flex rounded-full border border-white/10 bg-white/[0.05] px-2 py-0.5 text-[6px] font-bold uppercase tracking-[0.12em] text-white/64">
                {providerLabel}
              </div>
            </div>
          </div>

          <div className="mt-3 rounded-xl border border-white/8 bg-black/26 px-2.5 py-2.5">
            <div className="text-[6px] font-bold uppercase tracking-[0.14em] text-white/34">
              Current Brief
            </div>
            <div className="mt-1.5 max-h-12 overflow-hidden text-[8px] leading-snug text-white/78">
              {directiveLabel}
            </div>
          </div>
        </div>

        <div className="mt-auto rounded-2xl border border-white/8 bg-white/[0.035] px-2.5 py-2.5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]">
          <div className="inline-flex items-center gap-1.5 text-[7px] font-bold uppercase tracking-[0.12em] text-cyan-100/76">
            <MessageSquareText size={10} className="text-cyan-300/80" />
            <span>{briefingOpen ? 'Briefing open' : 'Open briefing'}</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[7px] uppercase tracking-[0.14em] text-white/34">
            <span>{activeCommanderRun ? 'Commander task live' : 'Standby'}</span>
            <ChevronRight size={12} className="text-white/28 transition-transform group-hover:translate-x-0.5 group-hover:text-cyan-100/72" />
          </div>
        </div>
      </div>
    </button>
  );
}
