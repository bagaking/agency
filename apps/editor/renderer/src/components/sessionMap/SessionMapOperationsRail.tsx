import React from 'react';
import { AgentAvatarBadge } from '../ui/AgentAvatarBadge';
import { resolveSessionAvatarId } from '../../utils/agentAvatar';
import { resolveCommanderContext } from '../../utils/sessionMapCommander';
import { SessionMapCommandPanel } from './SessionMapCommandPanel';

const statusTone = (status: string) => {
  const normalized = String(status || '').trim().toLowerCase();
  if (normalized === 'failed') {
    return 'border-rose-300/16 bg-rose-500/[0.08] text-rose-100/84';
  }
  if (normalized === 'cancelled') {
    return 'border-amber-300/16 bg-amber-500/[0.08] text-amber-100/84';
  }
  if (['queued', 'running', 'cancelling'].includes(normalized)) {
    return 'border-cyan-300/16 bg-cyan-500/[0.08] text-cyan-100/84';
  }
  if (normalized === 'succeeded') {
    return 'border-emerald-300/16 bg-emerald-500/[0.08] text-emerald-100/84';
  }
  return 'border-white/10 bg-white/[0.04] text-white/42';
};

export function SessionMapOperationsRail({
  focusData,
  focusedRunId = '',
  harnessRuns,
  sessionError,
  onClearSessionError,
  onCancelHarnessRun,
  onResumeHarnessRun,
}: any) {
  const runList = Array.isArray(harnessRuns) ? harnessRuns : [];
  const context = resolveCommanderContext({
    focusData,
    harnessRuns: runList,
    sessionError,
    preferredRunId: focusedRunId,
  });
  const focusSessionLabel = context.sessionName;
  const focusAvatarId = resolveSessionAvatarId(focusData?.session, focusData?.cell) || 'AGENCY_BACKEND_COMMANDER';
  const hasRelevantRun = Boolean(context.relevantRun);
  const runSummary = hasRelevantRun
    ? String(context.currentStepTitle || context.latestEvidenceLine || context.runTitle || '')
        .replace(/\s+/g, ' ')
        .trim() || 'No active backend directive'
    : 'No active backend directive';
  const runStatusLabel = context.sessionError
    ? 'ISSUE'
    : context.runStatus
      ? context.runStatusLabel
      : 'IDLE';
  const runToneClass = statusTone(context.runStatus || (context.sessionError ? 'failed' : 'idle'));

  return (
    <div className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-white/[0.06] bg-[linear-gradient(180deg,rgba(16,21,30,0.98),rgba(8,11,17,0.98))] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03),0_12px_28px_rgba(0,0,0,0.24)]">
      <div className="flex min-h-0 items-start gap-3 border-b border-white/[0.06] px-3 py-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <AgentAvatarBadge
            avatarId={focusAvatarId}
            size={18}
            ringSize={24}
            lastActivityAt={focusData?.session?.lastActivityAt}
            isClosed={focusData?.session?.isOffline}
            className="shrink-0"
          />
          <div className="min-w-0">
            <div className="text-[8px] font-semibold uppercase tracking-[0.18em] text-white/42">
              Ops Evidence
            </div>
            <div className="truncate text-[12px] font-semibold tracking-[0.01em] text-white">
              {focusSessionLabel}
            </div>
            <div className="mt-1 truncate text-[9px] leading-snug text-white/40">
              {runSummary}
            </div>
            <div className="mt-2">
              <span className={`rounded-full border px-2 py-0.5 text-[7px] font-semibold uppercase tracking-[0.12em] ${runToneClass}`}>
                {runStatusLabel}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden px-3 py-2.5">
        <SessionMapCommandPanel
          focusData={focusData}
          focusedRunId={focusedRunId}
          harnessRuns={harnessRuns}
          sessionError={sessionError}
          onClearSessionError={onClearSessionError}
          onCancelHarnessRun={onCancelHarnessRun}
          onResumeHarnessRun={onResumeHarnessRun}
        />
      </div>
    </div>
  );
}
