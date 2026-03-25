import React, { useEffect, useMemo, useState } from 'react';
import { Activity, Bot, ChevronDown, ChevronUp, Copy, Radar, ShieldAlert, Square, X } from 'lucide-react';
import { writeTextToClipboard } from '../../utils/clipboard';
import { formatRelativeTime } from '../../utils/timeFormat';

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

export function SessionMapCommandPanel({
  focusData,
  harnessRuns,
  sessionError,
  onClearSessionError,
  onCancelHarnessRun,
}: any) {
  const [collapsed, setCollapsed] = useState(false);
  const [copiedKind, setCopiedKind] = useState('');
  const runList = Array.isArray(harnessRuns) ? harnessRuns : [];
  const activeRun = useMemo(
    () =>
      runList.find((run) =>
        ['queued', 'running', 'cancelling'].includes(String(run?.status || '').trim().toLowerCase())
      ) || runList[0] || null,
    [runList]
  );
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
          className="flex items-center gap-2 rounded border border-cyan-400/25 bg-black/50 px-3 py-2 text-left text-[9px] font-bold uppercase tracking-[0.2em] text-cyan-100 transition-colors hover:bg-cyan-500/10"
        >
          <Radar size={12} className="text-cyan-300" />
          <span>Command Ops</span>
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
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl bg-[linear-gradient(180deg,rgba(13,18,25,0.98),rgba(7,10,16,0.96))] shadow-[inset_0_0_0_1px_rgba(34,211,238,0.08),0_12px_28px_rgba(0,0,0,0.24)]">
      <div className="flex items-center justify-between px-3 py-2.5">
        <div className="font-mono text-[8px] font-bold uppercase tracking-[0.28em] text-cyan-100/75">
          Command Ops
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            className="rounded-lg bg-white/[0.04] p-1 text-white/50 transition-colors hover:bg-white/[0.08] hover:text-cyan-100"
            aria-label="Collapse command panel"
          >
            <ChevronDown size={14} />
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden px-3 pb-3">
          <div className="rounded-xl bg-white/[0.04] px-3 py-2 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate font-mono text-[11px] font-black uppercase tracking-[0.08em] text-white">
                  {focusData?.session?.name || focusData?.session?.id || 'No Unit Selected'}
                </div>
                <div className="mt-1 truncate text-[9px] uppercase tracking-[0.16em] text-white/45">
                  {focusData?.cell?.name || focusData?.cell?.id || 'No Active Cell'} ·{' '}
                  {focusData?.typeLabel || 'Command View'}
                </div>
              </div>
              <Bot size={16} className="shrink-0 text-cyan-300" />
            </div>
          </div>

          {sessionError ? (
            <div className="max-h-40 overflow-y-auto rounded-xl bg-rose-500/10 px-3 py-2 shadow-[inset_0_0_0_1px_rgba(251,113,133,0.2)]">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.18em] text-rose-100">
                  <ShieldAlert size={13} className="text-rose-300" />
                  Session Error
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
                <div className="mt-2 text-[8px] font-bold uppercase tracking-[0.16em] text-rose-200">
                  Error copied
                </div>
              ) : null}
            </div>
          ) : null}

          {activeRun ? (
            <div className="min-h-0 flex-1 overflow-hidden rounded-xl bg-black/26 px-3 py-2 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-white">
                    {activeRun?.goal?.title || activeRun?.goal?.type || 'Harness Run'}
                  </div>
                  <div className="mt-1 truncate text-[9px] text-white/50">
                    {activeRun?.runner?.adapterId || 'agent_backed'} /{' '}
                    {activeRun?.runner?.providerId || 'auto'} /{' '}
                    {activeRun?.clientRequestId || activeRun?.runId}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {['queued', 'running', 'cancelling'].includes(
                    String(activeRun?.status || '').trim().toLowerCase()
                  ) ? (
                    <button
                      type="button"
                      onClick={() => onCancelHarnessRun?.(activeRun.runId)}
                      className="rounded-lg bg-amber-500/10 px-2 py-1 text-[8px] font-bold uppercase tracking-[0.15em] text-amber-100 shadow-[inset_0_0_0_1px_rgba(251,191,36,0.2)] transition-colors hover:bg-amber-500/18"
                    >
                      Cancel
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

              <div className="mt-2 flex items-center gap-2 text-[8px] font-bold uppercase tracking-[0.16em] text-white/50">
                <Activity size={12} className={tone.icon} />
                <span>{String(activeRun?.currentStep?.title || activeRun?.status || 'Idle')}</span>
                {activeRun?.updatedAt ? (
                  <span className="ml-auto text-white/35">
                    {formatRelativeTime(activeRun.updatedAt).toUpperCase()}
                  </span>
                ) : null}
              </div>

              <div className="mt-3 min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
                {timeline.length ? (
                  timeline.map((entry: any) => {
                    const entryTone = statusTone(entry?.status || entry?.phase || '');
                    return (
                      <div
                        key={entry?.id || `${entry?.phase}-${entry?.at}`}
                        className="rounded-xl bg-white/[0.03] px-2 py-1.5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]"
                      >
                        <div className="flex items-center gap-2 text-[8px] font-bold uppercase tracking-[0.16em]">
                          <span className={`rounded border px-1.5 py-0.5 ${entryTone.pill}`}>
                            {entry?.phase || entryTone.label}
                          </span>
                          <span className="truncate text-white/85">
                            {entry?.title || entry?.type || 'Event'}
                          </span>
                        </div>
                        {entry?.detail ? (
                          <pre className="mt-1 whitespace-pre-wrap break-words text-[9px] leading-relaxed text-white/45 select-text">
                            {JSON.stringify(entry.detail, null, 2)}
                          </pre>
                        ) : null}
                      </div>
                    );
                  })
                ) : (
                  <div className="rounded border border-dashed border-white/10 px-2 py-3 text-center text-[9px] uppercase tracking-[0.18em] text-white/25">
                    Awaiting command telemetry
                  </div>
                )}
              </div>

              <div className="mt-3 rounded-xl bg-white/[0.03] px-2 py-2 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]">
                <div className="text-[8px] font-bold uppercase tracking-[0.18em] text-white/45">
                  Quick Ops
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCollapsed(true)}
                    className="rounded-lg bg-black/28 px-2 py-1 text-[8px] font-bold uppercase tracking-[0.15em] text-white/70 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)] transition-colors hover:bg-white/10"
                  >
                    <ChevronUp size={10} className="mr-1 inline" />
                    Minimize
                  </button>
                  {['queued', 'running', 'cancelling'].includes(
                    String(activeRun?.status || '').trim().toLowerCase()
                  ) ? (
                    <button
                      type="button"
                      onClick={() => onCancelHarnessRun?.(activeRun.runId)}
                      className="rounded-lg bg-amber-500/10 px-2 py-1 text-[8px] font-bold uppercase tracking-[0.15em] text-amber-100 shadow-[inset_0_0_0_1px_rgba(251,191,36,0.18)] transition-colors hover:bg-amber-500/20"
                    >
                      <Square size={10} className="mr-1 inline" />
                      Halt Run
                    </button>
                  ) : null}
                </div>
                {copiedKind === 'run' ? (
                  <div className="mt-2 text-[8px] font-bold uppercase tracking-[0.16em] text-cyan-200">
                    Run details copied
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center rounded border border-dashed border-white/10 bg-white/[0.03] text-center font-mono text-[9px] uppercase tracking-[0.18em] text-white/25">
              No active backend directive
            </div>
          )}
      </div>
    </div>
  );
}
