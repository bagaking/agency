import React, { useMemo } from 'react';
import { Layers, Play, Terminal } from 'lucide-react';

export function HilDraftsPanel({
  drafts = [],
  summarizeBody,
  onOpenDraft,
  onViewSession,
  onRunDraft,
  actionSheets = [],
  sessions = [],
  activeSessionId,
}) {
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

  return (
    <div className="flex flex-col gap-3 py-1 select-none">
      <div className="flex items-center justify-between px-0.5">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold tracking-wider text-foreground/80">
            Drafts
          </span>
          <span className="text-[9px] font-medium text-muted-foreground/60">
            {drafts.length} total
          </span>
        </div>
      </div>

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
                className={`group flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left transition focus:outline-none ${
                  isRunning
                    ? 'border-primary/30 bg-primary/5 hover:bg-primary/10'
                    : 'border-border/10 bg-muted/5 hover:border-primary/30 hover:bg-muted/10'
                }`}
              >
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-lg border bg-background/60 ${
                    isRunning
                      ? 'border-primary/40 text-primary/70'
                      : 'border-border/20 text-muted-foreground/60 group-hover:text-primary/70'
                  }`}
                >
                  <Layers size={14} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[12px] font-semibold text-foreground/80 truncate group-hover:text-foreground">
                    {summarizeBody ? summarizeBody(draft) : draft.body || 'Untitled Draft'}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[9px] uppercase tracking-widest text-muted-foreground/40">
                    <span>{draft.status || 'open'}</span>
                    {actionSheetId ? <span className="text-muted-foreground/30">· AS</span> : null}
                    {isRunning ? (
                      <span className="inline-flex items-center gap-1 text-primary/70">
                        <Terminal size={10} />
                        {sessionLabel || 'Session'}
                      </span>
                    ) : (
                      <span className="text-muted-foreground/30">Idle</span>
                    )}
                  </div>
                </div>
                {!isRunning ? (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onRunDraft?.(draft);
                    }}
                    disabled={!canRun}
                    className="rounded-md border border-primary/40 bg-primary/5 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-widest text-primary transition hover:bg-primary/10 disabled:opacity-40"
                    title={canRun ? 'Run in active session' : 'Select a session to run'}
                  >
                    <Play size={11} className="inline -mt-0.5 mr-1" />
                    Run
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-border/10 bg-muted/5 px-4 py-6 text-center text-[10px] text-muted-foreground/40">
          No active drafts
        </div>
      )}
    </div>
  );
}
