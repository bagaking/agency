import React, { useEffect, useMemo, useState } from 'react';
import { Activity, ChevronDown, ChevronUp, Copy, Radar, ShieldAlert, Square, X } from 'lucide-react';
import { writeTextToClipboard } from '../../utils/clipboard';
import { formatRelativeTime } from '../../utils/timeFormat';
import {
  isHarnessRunActiveStatus,
  isHarnessRunResumableStatus,
  resolvePrimaryHarnessRun,
} from '../../../../shared/commanderCore';

const statusTone = (status: string) => {
  const normalized = String(status || '').trim().toLowerCase();
  if (normalized === 'succeeded') {
    return {
      pill: 'border-emerald-400/35 bg-emerald-500/15 text-emerald-200',
      icon: 'text-emerald-300',
      label: 'COMPLETE',
    };
  }
  if (normalized === 'failed') {
    return {
      pill: 'border-rose-400/35 bg-rose-500/15 text-rose-100',
      icon: 'text-rose-300',
      label: 'FAILED',
    };
  }
  if (normalized === 'cancelled') {
    return {
      pill: 'border-amber-300/35 bg-amber-500/15 text-amber-100',
      icon: 'text-amber-300',
      label: 'CANCELLED',
    };
  }
  return {
    pill: 'border-cyan-300/35 bg-cyan-500/15 text-cyan-100',
    icon: 'text-cyan-300',
    label: 'RUNNING',
  };
};

const buildRunClipboardText = (run: any) => {
  if (!run) {
    return '';
  }
  return JSON.stringify(run, null, 2);
};

const buildErrorClipboardText = (message: string) => String(message || '').trim();

function buildTimelineDetailPreview(entry: any): string {
  const detail = entry?.detail;
  if (!detail) {
    return '';
  }
  return String(
    detail?.message ||
      detail?.summary ||
      detail?.reason ||
      detail?.failures?.[0]?.message ||
      ''
  ).trim();
}

export function SessionMapCommandPanel({
  focusData,
  harnessRuns,
  sessionError,
  onClearSessionError,
  onCancelHarnessRun,
  onResumeHarnessRun,
}: any) {
  const [collapsed, setCollapsed] = useState(false);
  const [copiedKind, setCopiedKind] = useState('');
  const runList = Array.isArray(harnessRuns) ? harnessRuns : [];
  const activeRun = useMemo(() => resolvePrimaryHarnessRun(runList), [runList]);
  const timeline = Array.isArray(activeRun?.timeline) ? activeRun.timeline.slice(-6).reverse() : [];
  const tone = statusTone(activeRun?.status || '');

  useEffect(() => {
    if (activeRun || sessionError) {
      setCollapsed(false);
    }
  }, [activeRun, sessionError]);

  useEffect(() => {
    if (!copiedKind) {
      return undefined;
    }
    const timer = window.setTimeout(() => setCopiedKind(''), 1600);
    return () => window.clearTimeout(timer);
  }, [copiedKind]);

  const hasContent = Boolean(activeRun || sessionError || focusData);

  if (!hasContent) {
    return (
      <div className="flex h-full items-center justify-center font-mono text-[8px] uppercase tracking-[0.22em] text-white/20">
        NO COMMAND DATA
      </div>
    );
  }

  if (collapsed) {
    return (
      <div className="flex h-full flex-col justify-end">
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          className="flex items-center gap-2 rounded border border-cyan-400/25 bg-black/50 px-3 py-2 text-left text-[8px] font-semibold uppercase tracking-[0.16em] text-cyan-100/84 transition-colors hover:bg-cyan-500/10"
        >
          <Radar size={12} className="text-cyan-300" />
          <span>Show Evidence</span>
          {activeRun ? (
            <span className="rounded border border-cyan-300/25 bg-cyan-500/15 px-1.5 py-0.5 text-[8px] text-cyan-100">
              {tone.label}
            </span>
          ) : null}
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-white/[0.06] bg-[linear-gradient(180deg,rgba(15,19,27,0.78),rgba(8,12,18,0.86))] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03)]">
      <div className="min-h-0 flex-1 overflow-y-auto px-2.5 pb-2 pt-2 pr-1.5">
        <div className="flex flex-col gap-2">
          {sessionError ? (
            <div className="max-h-40 overflow-y-auto rounded-xl bg-rose-500/10 px-2.5 py-2 shadow-[inset_0_0_0_1px_rgba(251,113,133,0.2)]">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 text-[8px] font-semibold uppercase tracking-[0.14em] text-rose-100">
                  <ShieldAlert size={12} className="text-rose-300" />
                  Visible Error
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={async () => {
                      await writeTextToClipboard(buildErrorClipboardText(sessionError));
                      setCopiedKind('error');
                    }}
                    className="rounded-lg bg-rose-400/10 p-1 text-rose-100/70 transition-colors hover:bg-rose-400/15 hover:text-rose-100"
                    aria-label="Copy session error"
                  >
                    <Copy size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={onClearSessionError}
                    className="rounded-lg bg-rose-400/10 p-1 text-rose-100/70 transition-colors hover:bg-rose-400/15 hover:text-rose-100"
                    aria-label="Dismiss session error"
                  >
                    <X size={12} />
                  </button>
                </div>
              </div>
              <pre className="mt-2 whitespace-pre-wrap break-words text-[10px] leading-relaxed text-rose-100/90 select-text">
                {sessionError}
              </pre>
              {copiedKind === 'error' ? (
                <div className="mt-2 text-[7px] font-bold uppercase tracking-[0.12em] text-rose-200">
                  Error copied
                </div>
              ) : null}
            </div>
          ) : null}

          {activeRun ? (
            <div className="min-w-0 rounded-xl bg-black/26 px-2.5 py-2 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[8px] font-semibold uppercase tracking-[0.16em] text-white/42">
                    Run Evidence
                  </div>
                  <div className="mt-1 truncate text-[12px] font-semibold tracking-[0.01em] text-white">
                    {activeRun?.goal?.title || activeRun?.goal?.type || 'Harness Run'}
                  </div>
                  <div className="mt-1 truncate text-[9px] text-white/46">
                    {activeRun?.runner?.adapterId || 'agent_backed'} /{' '}
                    {activeRun?.runner?.providerId || 'auto'} /{' '}
                    {activeRun?.clientRequestId || activeRun?.runId}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {isHarnessRunActiveStatus(activeRun?.status) ? (
                    <button
                      type="button"
                      onClick={() => onCancelHarnessRun?.(activeRun.runId)}
                      className="rounded-lg bg-amber-500/10 px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.12em] text-amber-100 shadow-[inset_0_0_0_1px_rgba(251,191,36,0.2)] transition-colors hover:bg-amber-500/18"
                    >
                      Cancel
                    </button>
                  ) : isHarnessRunResumableStatus(activeRun?.status) ? (
                    <button
                      type="button"
                      onClick={() => onResumeHarnessRun?.(activeRun.runId)}
                      className="rounded-lg bg-emerald-500/10 px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.12em] text-emerald-100 shadow-[inset_0_0_0_1px_rgba(16,185,129,0.2)] transition-colors hover:bg-emerald-500/18"
                    >
                      Retry
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={async () => {
                      await writeTextToClipboard(buildRunClipboardText(activeRun));
                      setCopiedKind('run');
                    }}
                    className="rounded-lg bg-cyan-400/8 p-1 text-cyan-100/70 transition-colors hover:bg-cyan-400/12 hover:text-cyan-100"
                    aria-label="Copy harness run details"
                  >
                    <Copy size={12} />
                  </button>
                </div>
              </div>

              <div className="mt-2 flex items-center gap-2 text-[8px] font-semibold uppercase tracking-[0.12em] text-white/46">
                <Activity size={12} className={tone.icon} />
                <span>{String(activeRun?.currentStep?.title || activeRun?.status || 'Idle')}</span>
                {activeRun?.updatedAt ? (
                  <span className="ml-auto text-white/35">
                    {formatRelativeTime(activeRun.updatedAt).toUpperCase()}
                  </span>
                ) : null}
              </div>

              <div className="mt-2 max-h-44 space-y-1 overflow-y-auto pr-1">
                {timeline.length ? (
                  timeline.map((entry: any) => {
                    const entryTone = statusTone(entry?.status || entry?.phase || '');
                    return (
                      <div
                        key={entry?.id || `${entry?.phase}-${entry?.at}`}
                        className="rounded-xl bg-white/[0.03] px-2 py-1.5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]"
                      >
                        <div className="flex items-center gap-2 text-[8px] font-semibold uppercase tracking-[0.12em]">
                          <span className={`rounded border px-1.5 py-0.5 ${entryTone.pill}`}>
                            {entry?.phase || entryTone.label}
                          </span>
                          <span className="truncate text-white/85">
                            {entry?.title || entry?.type || 'Event'}
                          </span>
                        </div>
                        {buildTimelineDetailPreview(entry) ? (
                          <div className="mt-1 text-[9px] leading-relaxed text-white/50">
                            {buildTimelineDetailPreview(entry)}
                          </div>
                        ) : entry?.detail ? (
                          <details className="mt-1 text-white/45">
                            <summary className="cursor-pointer text-[8px] uppercase tracking-[0.12em] text-white/34">
                              Raw Payload
                            </summary>
                            <pre className="mt-1 whitespace-pre-wrap break-words text-[8px] leading-relaxed select-text">
                              {JSON.stringify(entry.detail, null, 2)}
                            </pre>
                          </details>
                        ) : null}
                      </div>
                    );
                  })
                ) : (
                  <div className="rounded border border-dashed border-white/10 px-2 py-2.5 text-center text-[8px] uppercase tracking-[0.14em] text-white/25">
                    Awaiting command telemetry
                  </div>
                )}
              </div>

              <div className="mt-2 flex items-center justify-between gap-2 rounded-xl bg-white/[0.03] px-2 py-1.5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]">
                <div className="text-[7px] font-semibold uppercase tracking-[0.14em] text-white/42">
                  {copiedKind === 'run' ? 'Run details copied' : 'Evidence stays pinned here.'}
                </div>
                <button
                  type="button"
                  onClick={() => setCollapsed(true)}
                  className="rounded-lg bg-black/28 px-2 py-1 text-[7px] font-bold uppercase tracking-[0.12em] text-white/70 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)] transition-colors hover:bg-white/10"
                >
                  <ChevronUp size={10} className="mr-1 inline" />
                  Collapse
                </button>
              </div>
            </div>
          ) : (
            <div className="flex min-h-24 items-center justify-center rounded border border-dashed border-white/10 bg-white/[0.03] px-2 text-center text-[9px] text-white/28">
              No run evidence is active for the current focus.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
