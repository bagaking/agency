import React, { useMemo } from 'react';
import { Layers, Play, Terminal } from 'lucide-react';
import {
  HIL_SURFACE_COPY,
  HilContextChip,
  HilStatusBadge,
  HilSurfaceHeader,
} from './hilSurfaceSystem';
import { Tooltip } from '../ui/Tooltip';
import { focusRing } from '../ui/focusRing';

export function HilDraftsPanel({
  drafts = [],
  summarizeBody,
  onOpenDraft,
  onViewSession,
  onRunDraft,
  actionSheets = [],
  sessions = [],
  activeSessionId,
}: any) {
  const actionSheetsById = useMemo(() => {
    const map = new Map();
    (actionSheets || []).forEach((sheet) => {
      if (sheet?.id) {
        map.set(sheet.id, sheet);
      }
    });
    return map;
  }, [actionSheets]);
  const sessionsById = useMemo(() => {
    const map = new Map();
    (sessions || []).forEach((session) => {
      if (session?.id) {
        map.set(session.id, session);
      }
    });
    return map;
  }, [sessions]);
  const focusRingClass = focusRing.default;

  return (
    <div className="flex flex-col gap-3 py-1 select-none">
      <HilSurfaceHeader
        eyebrow={HIL_SURFACE_COPY.draftsSubtitle}
        title={HIL_SURFACE_COPY.draftsTitle}
        subtitle="Review execution-ready artifacts and jump directly into the linked lane when needed."
        meta={<HilStatusBadge label={`${drafts.length} drafts`} tone="warning" />}
        compact
      />

      {drafts.length ? (
        <div className="flex flex-col gap-2">
          {drafts.map((draft) => {
            const actionSheetId = draft.meta?.actionSheetId || '';
            const actionSheetStatus = actionSheetId ? actionSheetsById.get(actionSheetId) : null;
            const actionSheetState = actionSheetStatus?.state || 'idle';
            const isRunning = actionSheetState === 'running' || actionSheetState === 'waiting_gate';
            const sessionId = isRunning ? actionSheetStatus?.sessionId || '' : '';
            const sessionLabel = sessionId ? sessionsById.get(sessionId)?.name || sessionId : '';
            const canRun = Boolean(activeSessionId);

            return (
              <div
                key={draft.id}
                role="button"
                tabIndex={0}
                onClick={() => {
                  if (isRunning && sessionId) {
                    onViewSession?.(sessionId);
                  } else {
                    onOpenDraft?.(draft.id);
                  }
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    if (isRunning && sessionId) {
                      onViewSession?.(sessionId);
                    } else {
                      onOpenDraft?.(draft.id);
                    }
                  }
                }}
                className={`group flex w-full items-center gap-3 rounded-2xl border px-3.5 py-3 text-left transition-colors cursor-pointer ${focusRingClass} ${
                  isRunning
                    ? 'border-primary/30 bg-primary/6 hover:bg-primary/10'
                    : 'border-white/[0.06] bg-[linear-gradient(180deg,rgba(28,33,42,0.68),rgba(16,19,24,0.9))] hover:border-primary/20 hover:bg-[linear-gradient(180deg,rgba(30,36,46,0.76),rgba(17,21,27,0.92))]'
                }`}
              >
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-lg border bg-background/60 ${
                    isRunning
                      ? 'border-primary/40 text-primary/70'
                      : 'border-border/20 text-muted-foreground/60 group-hover:text-primary/70'
                  }`}
                >
                  <Layers size={14} aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[12px] font-semibold text-foreground/84 truncate group-hover:text-foreground">
                    {summarizeBody ? summarizeBody(draft) : draft.body || 'Untitled Draft'}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <HilStatusBadge
                      label={draft.status || 'open'}
                      tone={isRunning ? 'active' : draft.status === 'resolved' ? 'success' : 'neutral'}
                      className="px-2 py-0.5"
                    />
                    {actionSheetId ? <HilContextChip label={`Action Sheet ${actionSheetId}`} className="max-w-[160px]" /> : null}
                    {isRunning ? (
                      <span className="inline-flex items-center gap-1 text-[10px] text-primary/74">
                        <Terminal size={10} aria-hidden="true" />
                        {sessionLabel || 'Session'}
                      </span>
                    ) : (
                      <span className="text-[10px] text-muted-foreground/34">Idle</span>
                    )}
                  </div>
                </div>
                {!isRunning ? (
                  <Tooltip label={canRun ? 'Run in active session' : 'Select a session to run'} side="left">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onRunDraft?.(draft);
                      }}
                      disabled={!canRun}
                      className={`inline-flex h-8 items-center gap-1.5 rounded-full border border-primary/40 bg-primary/5 px-3 text-[9px] font-semibold uppercase tracking-[0.16em] text-primary transition-colors hover:bg-primary/10 disabled:opacity-40 ${focusRingClass}`}
                    >
                      <Play size={11} aria-hidden="true" />
                      Run
                    </button>
                  </Tooltip>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-white/[0.06] bg-[linear-gradient(180deg,rgba(28,33,42,0.68),rgba(16,19,24,0.9))] px-4 py-6 text-center text-[10px] text-muted-foreground/40">
          No active drafts
        </div>
      )}
    </div>
  );
}
