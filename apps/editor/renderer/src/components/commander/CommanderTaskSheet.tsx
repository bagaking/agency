import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Clock3,
  Loader2,
  Sparkles,
  X,
  XCircle,
} from 'lucide-react';

import {
  cancelMainAgentHarnessRun,
  inspectMainAgentHarnessRun,
} from '../../services/mainAgentHarness';
import { useModal } from '../modals/ModalSystem';

const POLL_INTERVAL_MS = 800;
const ELAPSED_INTERVAL_MS = 1000;
const TERMINAL_RUN_STATUSES = new Set(['succeeded', 'failed', 'cancelled']);

function formatClock(iso: string) {
  const value = String(iso || '').trim();
  if (!value) {
    return '';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatElapsed(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes > 0) {
    return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
  }
  return `${totalSeconds}s`;
}

function statusTone(status: string) {
  if (status === 'succeeded') {
    return {
      pill: 'bg-emerald-400/14 text-emerald-100',
      panel: 'bg-emerald-400/10 text-emerald-100',
      icon: CheckCircle2,
    };
  }
  if (status === 'failed') {
    return {
      pill: 'bg-rose-400/14 text-rose-100',
      panel: 'bg-rose-400/10 text-rose-100',
      icon: AlertTriangle,
    };
  }
  if (status === 'cancelled') {
    return {
      pill: 'bg-amber-300/14 text-amber-100',
      panel: 'bg-amber-300/10 text-amber-100',
      icon: XCircle,
    };
  }
  return {
    pill: 'bg-cyan-300/14 text-cyan-100',
    panel: 'bg-cyan-300/10 text-cyan-100',
    icon: Loader2,
  };
}

function timelineTone(status: string) {
  if (status === 'completed' || status === 'succeeded') {
    return 'bg-emerald-300/80';
  }
  if (status === 'failed') {
    return 'bg-rose-300/80';
  }
  if (status === 'cancelled') {
    return 'bg-amber-300/80';
  }
  return 'bg-cyan-300/80';
}

function resolveSuggestions(run: any, stepId: string): string[] {
  const completed = run?.result?.stepOutputs?.[stepId];
  const live = run?.progress?.outputsByStepId?.[stepId];
  const candidates = Array.isArray(completed?.candidates)
    ? completed.candidates
    : Array.isArray(live?.candidates)
      ? live.candidates
      : [];
  return Array.from(
    new Set<string>(
      candidates.map((item: unknown) => String(item || '').trim()).filter(Boolean)
    )
  ).slice(0, 3);
}

function resolveStepOutput(run: any, stepId: string) {
  return run?.result?.stepOutputs?.[stepId] || run?.progress?.outputsByStepId?.[stepId] || null;
}

function resolveCreatedSession(run: any, stepId: string) {
  const stepOutput = resolveStepOutput(run, stepId);
  return stepOutput?.session || run?.result?.agent?.session || null;
}

function resolveCurrentActivity(run: any, stepId: string) {
  const status = String(run?.status || '').trim().toLowerCase();
  const timeline = Array.isArray(run?.timeline) ? run.timeline : [];
  const stepTimeline = timeline.filter(
    (entry) => !stepId || String(entry?.stepId || '').trim() === stepId
  );
  const completedCallIds = new Set(
    stepTimeline
      .filter((entry) =>
        ['completed', 'failed', 'cancelled'].includes(
          String(entry?.status || '').trim().toLowerCase()
        )
      )
      .map((entry) => String(entry?.callId || '').trim())
      .filter(Boolean)
  );

  if (status === 'queued') {
    return 'Queued and waiting for Commander execution.';
  }
  if (status === 'running') {
    const latestRunning = [...stepTimeline]
      .reverse()
      .find((entry) => {
        const entryStatus = String(entry?.status || '').trim().toLowerCase();
        if (entryStatus !== 'running') {
          return false;
        }
        const callId = String(entry?.callId || '').trim();
        if (callId && completedCallIds.has(callId)) {
          return false;
        }
        return true;
      });
    if (latestRunning?.title) {
      if (/suggest session name/i.test(String(latestRunning.title))) {
        return 'Commander provider is generating candidate names.';
      }
      if (/inspect/i.test(String(latestRunning.title))) {
        return 'Inspecting current session context.';
      }
      return String(latestRunning.title);
    }
    const hasCompletedInspect = stepTimeline.some(
      (entry) =>
        /inspect/i.test(String(entry?.title || '')) &&
        String(entry?.status || '').trim().toLowerCase() === 'completed'
    );
    if (hasCompletedInspect) {
      return 'Commander provider is generating candidate names.';
    }
    return 'Preparing Commander task context.';
  }
  if (status === 'succeeded') {
    return 'Suggestions are ready.';
  }
  if (status === 'failed') {
    return String(run?.failures?.[0]?.message || 'Commander task failed.');
  }
  if (status === 'cancelled') {
    return 'Commander task was cancelled.';
  }
  return 'Waiting for Commander.';
}

export function CommanderTaskSheet({
  modalId,
  runId,
  stepId,
  taskKind = 'smart-name',
  taskTitle,
  sessionName,
  cellName,
}: {
  modalId: string;
  runId: string;
  stepId: string;
  taskKind?: 'smart-name' | 'smart-fork';
  taskTitle: string;
  sessionName?: string;
  cellName?: string;
}) {
  const modal = useModal();
  const [run, setRun] = useState<any>(null);
  const [loadError, setLoadError] = useState('');
  const [pendingCancel, setPendingCancel] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    let active = true;
    let timer: number | null = null;

    const tick = async () => {
      try {
        const nextRun = await inspectMainAgentHarnessRun({ runId });
        if (!active) {
          return;
        }
        setRun(nextRun);
        setLoadError('');
        const status = String(nextRun?.status || '').trim().toLowerCase();
        if (!TERMINAL_RUN_STATUSES.has(status)) {
          timer = window.setTimeout(tick, POLL_INTERVAL_MS);
        }
      } catch (error: any) {
        if (!active) {
          return;
        }
        setLoadError(error?.message || 'Failed to inspect Commander task.');
        timer = window.setTimeout(tick, POLL_INTERVAL_MS);
      }
    };

    void tick();
    return () => {
      active = false;
      if (timer) {
        window.clearTimeout(timer);
      }
    };
  }, [runId]);

  useEffect(() => {
    const handle = window.setInterval(() => {
      setNow(Date.now());
    }, ELAPSED_INTERVAL_MS);
    return () => window.clearInterval(handle);
  }, []);

  const status = String(run?.status || 'queued').trim().toLowerCase() || 'queued';
  const tone = statusTone(status);
  const ToneIcon = tone.icon;
  const startedAtValue = new Date(String(run?.startedAt || '')).getTime();
  const elapsedMs = Number.isFinite(startedAtValue) ? Math.max(0, now - startedAtValue) : 0;
  const elapsedLabel = formatElapsed(elapsedMs);
  const activityLabel = resolveCurrentActivity(run, stepId);
  const suggestions = resolveSuggestions(run, stepId);
  const stepOutput = resolveStepOutput(run, stepId);
  const createdSession = resolveCreatedSession(run, stepId);
  const fallbackUsed = Boolean(stepOutput?.metadata?.providerFallbackUsed);
  const fallbackReason = String(stepOutput?.metadata?.providerFallbackReason || '').trim();
  const failures = Array.isArray(run?.failures) ? run.failures : [];
  const failure = failures[0] || null;
  const timeline = useMemo(() => {
    const entries = Array.isArray(run?.timeline) ? run.timeline : [];
    return entries
      .filter((entry) => {
        if (!stepId) {
          return true;
        }
        const entryStepId = String(entry?.stepId || '').trim();
        return !entryStepId || entryStepId === stepId;
      })
      .slice(-6)
      .reverse();
  }, [run?.timeline, stepId]);

  const handleCancel = async () => {
    if (pendingCancel || TERMINAL_RUN_STATUSES.has(status)) {
      return;
    }
    setPendingCancel(true);
    try {
      await cancelMainAgentHarnessRun({
        runId,
        reason: 'user-cancelled-commander-task',
      });
    } catch (_error) {
      // best effort cancellation
    } finally {
      setPendingCancel(false);
    }
  };

  return (
    <div className="w-[min(56rem,86vw)] text-white">
      <div className="rounded-[30px] border border-cyan-300/14 bg-[radial-gradient(circle_at_top_left,rgba(96,165,250,0.11),transparent_32%),linear-gradient(180deg,rgba(18,23,31,0.99),rgba(10,13,18,0.995))] px-7 py-6 shadow-[0_32px_96px_rgba(0,0,0,0.46)] ring-1 ring-black/35">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-cyan-400/10 text-cyan-100 shadow-[inset_0_0_0_1px_rgba(125,211,252,0.12)]">
                <Bot size={20} />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-semibold uppercase tracking-[0.34em] text-cyan-100/44">
                  Commander Task
                </div>
                <div className="mt-2 text-[20px] font-semibold tracking-[-0.03em] text-white">
                  {taskTitle}
                </div>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {cellName ? (
                <span className="inline-flex items-center rounded-full bg-white/[0.05] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/64">
                  Cell
                  <span className="ml-2 normal-case tracking-normal text-white">{cellName}</span>
                </span>
              ) : null}
              {sessionName ? (
                <span className="inline-flex items-center rounded-full bg-white/[0.05] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/64">
                  Session
                  <span className="ml-2 normal-case tracking-normal text-white">{sessionName}</span>
                </span>
              ) : null}
              <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${tone.pill}`}>
                <ToneIcon size={12} className={status === 'running' ? 'animate-spin' : ''} />
                <span>{status}</span>
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/[0.05] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/60">
                <Clock3 size={12} />
                <span>{elapsedLabel}</span>
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => modal?.closeModal?.(modalId, { type: 'closed' })}
            className="rounded-full p-2 text-white/30 transition-colors hover:bg-white/[0.05] hover:text-white/76"
            aria-label="Close Commander task"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4">
            <div className="rounded-[24px] bg-white/[0.035] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/36">
                <Sparkles size={12} />
                <span>Current Activity</span>
              </div>
              <div className="mt-3 text-[15px] font-semibold leading-7 text-white">
                {activityLabel}
              </div>
              {status === 'running' ? (
                <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/[0.05]">
                  <div className="h-full w-24 rounded-full bg-cyan-300/85 animate-commander-progress-sweep" />
                </div>
              ) : null}
              {loadError ? (
                <div className="mt-3 rounded-2xl bg-rose-500/10 px-3 py-2 text-[12px] leading-6 text-rose-100">
                  {loadError}
                </div>
              ) : null}
              {fallbackUsed ? (
                <div className="mt-3 rounded-2xl bg-amber-400/10 px-3.5 py-3 text-[12px] leading-6 text-amber-100">
                  Commander provider did not return in time, so Agency switched to bounded local suggestions.
                  {fallbackReason ? (
                    <div className="mt-1 text-[10px] uppercase tracking-[0.16em] text-amber-100/60">
                      {fallbackReason}
                    </div>
                  ) : null}
                </div>
              ) : null}
              {failure ? (
                <div className="mt-3 rounded-2xl bg-rose-500/10 px-3.5 py-3 text-[13px] leading-6 text-rose-100">
                  <div className="font-semibold">{failure.message}</div>
                  {failure.code ? (
                    <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-rose-100/60">
                      {failure.code}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="rounded-[24px] bg-white/[0.025] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/36">
                Timeline
              </div>
              <div className="mt-3 space-y-3">
                {timeline.length ? (
                  timeline.map((entry: any) => (
                    <div key={entry.id} className="flex items-start gap-3">
                      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${timelineTone(String(entry?.status || '').trim().toLowerCase())}`} />
                      <div className="min-w-0">
                        <div className="text-[13px] font-medium leading-6 text-white">
                          {entry.title || entry.phase || 'Commander event'}
                        </div>
                        <div className="text-[11px] uppercase tracking-[0.16em] text-white/34">
                          {String(entry?.status || '').trim() || 'running'}
                          {entry.at ? ` · ${formatClock(entry.at)}` : ''}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-[13px] leading-6 text-white/46">
                    Waiting for the first Commander timeline event.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-[24px] bg-white/[0.03] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/36">
                Result
              </div>
              {taskKind === 'smart-name' && status === 'succeeded' && suggestions.length ? (
                <div className="mt-3 space-y-2">
                  <div className="text-[13px] leading-6 text-white/60">
                    Suggestions are ready. Choose one to rename the session.
                  </div>
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() =>
                        modal?.closeModal?.(modalId, { type: 'apply', value: suggestion, runId })
                      }
                      className="w-full rounded-2xl bg-white/[0.045] px-3.5 py-3 text-left text-[13px] font-medium text-white transition-colors hover:bg-white/[0.08]"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              ) : taskKind === 'smart-fork' && createdSession?.id ? (
                <div className="mt-3 space-y-3">
                  <div className="text-[13px] leading-6 text-white/60">
                    {status === 'succeeded'
                      ? 'The child Commander session is ready. Open it to continue in the new lane.'
                      : 'The child session was created, but Commander could not confirm readiness in time. You can still open the session and inspect it directly.'}
                  </div>
                  <div className="rounded-2xl bg-white/[0.045] px-3.5 py-3 text-[13px] text-white">
                    <div className="font-medium">
                      {createdSession.name || createdSession.sessionId || createdSession.id}
                    </div>
                    <div className="mt-1 text-[10px] uppercase tracking-[0.16em] text-white/42">
                      {createdSession.nodeKind || 'fork'}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      modal?.closeModal?.(modalId, {
                        type: 'complete',
                        value: {
                          sessionId: createdSession.id || createdSession.sessionId,
                          profileId: createdSession.profileId || '',
                          nodeKind: createdSession.nodeKind || '',
                        },
                        runId,
                      })
                    }
                    className="w-full rounded-2xl bg-cyan-400/10 px-3.5 py-3 text-left text-[13px] font-medium text-cyan-50 transition-colors hover:bg-cyan-400/16"
                  >
                    Open Created Session
                  </button>
                </div>
              ) : (
                <div className="mt-3 text-[13px] leading-6 text-white/52">
                  {taskKind === 'smart-fork'
                    ? status === 'failed'
                      ? 'Commander did not complete the child-session creation flow.'
                      : status === 'cancelled'
                        ? 'The task was cancelled before the child session was ready.'
                        : 'Commander is inspecting the source session and preparing the child lane.'
                    : status === 'failed'
                      ? 'Commander did not produce rename suggestions.'
                      : status === 'cancelled'
                        ? 'The task was cancelled before suggestions were returned.'
                        : 'Suggestions will appear here as soon as the task completes.'}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              {TERMINAL_RUN_STATUSES.has(status) ? (
                <button
                  type="button"
                  onClick={() => modal?.closeModal?.(modalId, { type: 'closed', runId })}
                  className="rounded-full bg-white/[0.05] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/72 transition-colors hover:bg-white/[0.1] hover:text-white"
                >
                  Close
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void handleCancel()}
                  disabled={pendingCancel}
                  className="rounded-full bg-rose-500/14 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-rose-100 transition-colors hover:bg-rose-500/22 disabled:opacity-60"
                >
                  {pendingCancel ? 'Cancelling' : 'Cancel'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
