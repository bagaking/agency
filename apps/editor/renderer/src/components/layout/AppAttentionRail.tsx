import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BellDot, ChevronRight } from 'lucide-react';

import {
  resolveActiveCommanderRun,
  resolveCommanderDirectiveLabel,
  resolveCommanderProviderLabel,
  resolvePrimaryCommanderRun,
} from '../../../../shared/commanderCore';
import { useAttentionLayer } from '../../attention/AttentionLayerContext';
import { AttentionQueue } from '../attention/AttentionQueue';
import { SessionMapCommanderAvatar } from '../sessionMap/SessionMapCommanderAvatar';
import { SessionMapCommanderBriefingPanel } from '../sessionMap/SessionMapCommanderBriefingPanel';
import { focusRing } from '../ui/focusRing';

type RailMode = 'attention' | 'briefing';

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

export function AppAttentionRail({
  focusData,
  harnessRuns,
  sessionError,
  onClearSessionError,
  onCancelHarnessRun,
  onResumeHarnessRun,
}: any) {
  const attention = useAttentionLayer();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<RailMode>('attention');
  const autoOpenedKeyRef = useRef('');
  const focusRingClass = focusRing.default;
  const runList = Array.isArray(harnessRuns) ? harnessRuns : [];
  const activeCommanderRun = useMemo(
    () => resolveActiveCommanderRun(runList),
    [runList]
  );
  const commanderRun = useMemo(() => resolvePrimaryCommanderRun(runList), [runList]);
  const commanderDirective = resolveCommanderDirectiveLabel(commanderRun);
  const commanderProvider = resolveCommanderProviderLabel(commanderRun);
  const queueItems = useMemo(
    () =>
      (Array.isArray(attention.localItems) ? attention.localItems : []).map((item: any) => ({
        ...item,
        detail: summarizeAttentionDetail(item?.detail),
      })),
    [attention.localItems]
  );
  const queueCount = queueItems.length;
  const primarySeverity = String(attention.primaryItem?.severity || '').trim().toLowerCase();
  const primaryAttentionKey = String(attention.primaryItem?.id || '').trim();
  const shouldAutoOpen = primarySeverity === 'critical' || primarySeverity === 'high';

  useEffect(() => {
    if (!shouldAutoOpen || mode === 'briefing') {
      return;
    }
    if (!queueCount || !primaryAttentionKey || autoOpenedKeyRef.current === primaryAttentionKey) {
      return;
    }
    autoOpenedKeyRef.current = primaryAttentionKey;
    setOpen(true);
  }, [mode, primaryAttentionKey, queueCount, shouldAutoOpen]);

  useEffect(() => {
    if (mode === 'briefing') {
      setOpen(true);
    }
  }, [mode]);

  return (
    <aside
      className={`relative flex h-full shrink-0 flex-col border-l border-border/20 bg-[linear-gradient(180deg,rgba(18,23,31,0.98),rgba(10,13,19,0.98))] backdrop-blur-2xl transition-[width] duration-300 ${
        open ? 'w-[320px]' : 'w-11'
      }`}
      data-attention-rail={open ? 'open' : 'closed'}
    >
      {!open ? (
        <div className="flex h-full flex-col items-center gap-2 px-1.5 py-2">
          <button
            type="button"
            onClick={() => {
              setMode('attention');
              setOpen(true);
            }}
            aria-label="Open attention queue"
            className={`relative flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] text-white/72 transition-colors hover:bg-white/[0.08] hover:text-white ${focusRingClass}`}
          >
            <BellDot size={14} />
            {queueCount ? (
              <span className="absolute -right-1 -top-1 min-w-[16px] rounded-full border border-[#10151d] bg-cyan-400 px-1 text-center text-[8px] font-bold leading-4 text-slate-950">
                {queueCount}
              </span>
            ) : null}
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('briefing');
              setOpen(true);
            }}
            aria-label="Open commander briefing"
            title={commanderDirective}
            className={`flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] text-white/72 transition-colors hover:bg-white/[0.08] hover:text-white ${focusRingClass}`}
          >
            <SessionMapCommanderAvatar
              busy={Boolean(activeCommanderRun)}
              size={16}
              ringSize={20}
            />
          </button>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex items-center gap-2 border-b border-white/[0.06] px-2 py-2">
            <button
              type="button"
              onClick={() => {
                setMode('attention');
                setOpen(false);
              }}
              aria-label="Collapse attention rail"
              className={`flex h-6 w-6 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] text-white/60 transition-colors hover:bg-white/[0.08] hover:text-white ${focusRingClass}`}
            >
              <ChevronRight size={12} />
            </button>
            <button
              type="button"
              onClick={() => setMode('attention')}
              className={`rounded-full px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.14em] transition-colors ${focusRingClass} ${
                mode === 'attention'
                  ? 'bg-cyan-400/14 text-cyan-100'
                  : 'text-white/44 hover:bg-white/[0.06] hover:text-white/72'
              }`}
            >
              Attention
            </button>
            <button
              type="button"
              onClick={() => setMode('briefing')}
              title={commanderDirective}
              className={`ml-auto inline-flex items-center gap-2 rounded-full px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.14em] transition-colors ${focusRingClass} ${
                mode === 'briefing'
                  ? 'bg-cyan-400/14 text-cyan-100'
                  : 'text-white/44 hover:bg-white/[0.06] hover:text-white/72'
              }`}
            >
              <SessionMapCommanderAvatar
                busy={Boolean(activeCommanderRun)}
                size={16}
                ringSize={20}
              />
              <span>{commanderProvider}</span>
            </button>
          </div>

          {mode === 'attention' ? (
            <div className="flex min-h-0 flex-1 flex-col px-2.5 py-2.5">
              <div className="mb-2">
                <div className="text-[8px] font-semibold uppercase tracking-[0.18em] text-white/42">
                  Window Attention
                </div>
                <div className="mt-1 text-[12px] font-semibold tracking-[0.01em] text-white">
                  {queueCount ? `${queueCount} items need review` : 'No active attention'}
                </div>
              </div>
              <AttentionQueue
                title="Priority Queue"
                items={queueItems}
                onSelectItem={attention.jumpToAttention}
                emptyLabel="No immediate attention in this window."
                className="min-h-0 flex-1 border-white/[0.05] bg-white/[0.025]"
                itemClassName="bg-black/14"
                itemsContainerClassName="max-h-none flex-1 overflow-y-auto pr-1"
              />
            </div>
          ) : (
            <div className="min-h-0 flex-1 overflow-hidden px-2.5 py-2.5">
              <SessionMapCommanderBriefingPanel
                open={true}
                scopeLabel="Window Scope"
                focusData={focusData}
                harnessRuns={harnessRuns}
                sessionError={sessionError}
                onCancelHarnessRun={onCancelHarnessRun}
                onResumeHarnessRun={onResumeHarnessRun}
                onClearSessionError={onClearSessionError}
                onClose={() => setMode('attention')}
              />
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
