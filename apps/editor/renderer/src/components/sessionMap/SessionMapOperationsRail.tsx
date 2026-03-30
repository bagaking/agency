import React from 'react';
import { AgentAvatarBadge } from '../ui/AgentAvatarBadge';
import { AttentionQueue } from '../attention/AttentionQueue';
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
  attentionItems,
  harnessRuns,
  sessionError,
  onClearSessionError,
  onCancelHarnessRun,
  onResumeHarnessRun,
  onSelectAttention,
}: any) {
  const context = resolveCommanderContext({
    focusData,
    harnessRuns,
    sessionError,
  });
  const focusSessionLabel = context.sessionName;
  const focusAvatarId = resolveSessionAvatarId(focusData?.session, focusData?.cell) || 'AGENCY_BACKEND_COMMANDER';
  const runStatusLabel = context.sessionError
    ? 'ISSUE'
    : context.runStatus
      ? context.runStatusLabel
      : 'IDLE';
  const runToneClass = statusTone(context.runStatus || (context.sessionError ? 'failed' : 'idle'));

  return (
    <div className="flex min-h-0 flex-col gap-1.5 overflow-hidden">
      <div className="flex min-h-0 items-center justify-between gap-2 rounded-xl bg-[linear-gradient(180deg,rgba(28,33,42,0.94),rgba(18,22,29,0.95))] px-2.5 py-1.5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]">
        <div className="flex min-w-0 items-center gap-2">
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
              Ops
            </div>
            <div className="truncate text-[12px] font-semibold tracking-[0.01em] text-white">
              {focusSessionLabel}
            </div>
          </div>
          <span className={`rounded-full border px-2 py-0.5 text-[7px] font-semibold uppercase tracking-[0.12em] ${runToneClass}`}>
            {runStatusLabel}
          </span>
        </div>
      </div>

      <AttentionQueue
        title="Priority Queue"
        items={attentionItems || []}
        onSelectItem={onSelectAttention}
        emptyLabel="No immediate attention inside this window."
        className="min-h-0"
        itemClassName="bg-black/14"
        itemsContainerClassName="max-h-36 overflow-y-auto pr-1"
        detailClassName="truncate"
      />

      <div className="min-h-0 flex-1 overflow-hidden">
        <SessionMapCommandPanel
          focusData={focusData}
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
