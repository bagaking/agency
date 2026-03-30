import React from 'react';
import { AgentAvatarBadge } from '../ui/AgentAvatarBadge';
import { AttentionQueue } from '../attention/AttentionQueue';
import { resolveSessionAvatarId } from '../../utils/agentAvatar';
import { resolveCommanderContext } from '../../utils/sessionMapCommander';
import { SessionMapCommandPanel } from './SessionMapCommandPanel';
import { SessionMapCommanderAvatar } from './SessionMapCommanderAvatar';
import {
  resolveActiveCommanderRun,
  resolveCommanderDirectiveLabel,
  resolveCommanderProviderLabel,
  resolvePrimaryCommanderRun,
} from '../../../../shared/commanderCore';

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

function summarizeAttentionDetail(detail: unknown): string {
  const normalized = String(detail || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!normalized) {
    return '';
  }
  if (normalized.length <= 120) {
    return normalized;
  }
  return `${normalized.slice(0, 117).trimEnd()}...`;
}

export function SessionMapOperationsRail({
  focusData,
  attentionItems,
  harnessRuns,
  sessionError,
  onClearSessionError,
  onCancelHarnessRun,
  onResumeHarnessRun,
  onSelectAttention,
  onOpenCommanderBriefing,
  commanderTriggerRef,
  commanderBriefingOpen = false,
}: any) {
  const runList = Array.isArray(harnessRuns) ? harnessRuns : [];
  const context = resolveCommanderContext({
    focusData,
    harnessRuns: runList,
    sessionError,
  });
  const activeCommanderRun = resolveActiveCommanderRun(runList);
  const commanderRun = resolvePrimaryCommanderRun(runList);
  const commanderDirective = resolveCommanderDirectiveLabel(commanderRun);
  const commanderProvider = resolveCommanderProviderLabel(commanderRun);
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
  const queueItems = (Array.isArray(attentionItems) ? attentionItems : []).map((item: any) => ({
    ...item,
    detail: summarizeAttentionDetail(item?.detail),
  }));

  return (
    <div className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-white/[0.06] bg-[linear-gradient(180deg,rgba(16,21,30,0.98),rgba(8,11,17,0.98))] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03),0_12px_28px_rgba(0,0,0,0.24)]">
      <div className="flex min-h-0 items-start justify-between gap-3 border-b border-white/[0.06] px-3 py-3">
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
              Ops
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
        <button
          ref={commanderTriggerRef}
          type="button"
          onClick={() => onOpenCommanderBriefing?.()}
          aria-controls="session-map-commander-briefing"
          aria-expanded={commanderBriefingOpen}
          aria-label="Open commander briefing"
          data-commander-trigger="true"
          title={commanderDirective}
          className="group flex shrink-0 items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.035] px-2.5 py-2 text-left transition-colors hover:bg-white/[0.06]"
        >
          <SessionMapCommanderAvatar
            busy={Boolean(activeCommanderRun)}
            size={18}
            ringSize={24}
            className="shrink-0"
          />
          <div className="min-w-0">
            <div className="text-[8px] font-semibold uppercase tracking-[0.14em] text-cyan-100/84">
              Commander
            </div>
            <div className="mt-0.5 text-[7px] uppercase tracking-[0.12em] text-white/38">
              {commanderProvider}
            </div>
            <div className="mt-1 text-[8px] text-white/52">
              Open briefing
            </div>
          </div>
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2.5 px-3 py-2.5">
        <AttentionQueue
          title="Priority Queue"
          items={queueItems}
          onSelectItem={onSelectAttention}
          emptyLabel="No immediate attention inside this window."
          className="shrink-0 border-white/[0.05] bg-white/[0.025]"
          itemClassName="bg-black/14"
          itemsContainerClassName="max-h-32 overflow-y-auto pr-1"
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
    </div>
  );
}
