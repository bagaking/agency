import React from 'react';
import {
  Activity,
  Archive,
  CheckCircle2,
  Clock,
  Layers,
  Plus,
  RefreshCw,
  Target,
  Terminal,
  Trash2,
} from 'lucide-react';

import { ActionSheetStatusPanel } from '../../actionSheets/ActionSheetStatusPanel';
import { HilMemoRowAction } from './HilMemoRowAction';

export function HilMemoDraftDetail({
  draft,
  onUpdateStatus,
  onArchiveDraft,
  onDeleteDraft,
  mutationError,
  sessionsById,
  onViewSession,
  actionSheetsById,
  sessions,
  onDispatchActionSheet,
  onCancelActionSheet,
  onArchiveActionSheet,
  onDeleteActionSheet,
  onOpenActionSheets,
  onCreateActionSheet,
  resolveBody,
  summarizeBody,
  onOpenReference,
  onRevealReference,
  onReferenceDragStart,
  isGateReady,
}: any) {
    const createdAt = draft.createdAt ? new Date(draft.createdAt) : null;
    const references = Array.isArray(draft.references) ? draft.references : [];
    const executionStatus = draft.meta?.executionStatus || 'idle';
    const executionSessionId = draft.meta?.executionSessionId || draft.meta?.promoteSessionId || '';
    const executionRequestedAt = draft.meta?.executionRequestedAt ? new Date(draft.meta.executionRequestedAt) : null;
    const executionStartedAt = draft.meta?.executionStartedAt ? new Date(draft.meta.executionStartedAt) : null;
    const executionFinishedAt = draft.meta?.executionFinishedAt ? new Date(draft.meta.executionFinishedAt) : null;
    const actionSheetId = draft.meta?.actionSheetId || '';
    const actionSheetStatus = actionSheetId ? actionSheetsById?.get(actionSheetId) || null : null;
    const hasActionSheet = Boolean(actionSheetId);
    const sessionLabel = executionSessionId
        ? sessionsById?.get(executionSessionId)?.name || executionSessionId
        : '';
    const gateReady = Boolean(isGateReady);

    return (
        <div className="flex h-full flex-col">
            <header className="flex items-center justify-between px-6 py-4 border-b border-border/10">
                <div>
                    <div className="text-[11px] font-black uppercase tracking-[0.3em] text-muted-foreground/40">
                        Draft Detail
                    </div>
                    <div className="text-lg font-semibold text-foreground tracking-tight">
                        {summarizeBody(draft)}
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-[10px] text-muted-foreground/40 uppercase tracking-[0.2em]">
                        <span className="inline-flex items-center gap-1">
                            <Layers size={12} />
                            {draft.status}
                        </span>
                        {createdAt && (
                            <span className="inline-flex items-center gap-1">
                                <Clock size={12} />
                                {createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                            </span>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {draft.status === 'open' ? (
                        <HilMemoRowAction
                            icon={CheckCircle2}
                            title="Resolve"
                            onClick={() => onUpdateStatus(draft, 'resolved')}
                            color="hover:text-emerald-500 hover:bg-emerald-500/10"
                        />
                    ) : (
                        <HilMemoRowAction
                            icon={RefreshCw}
                            title="Reopen"
                            onClick={() => onUpdateStatus(draft, 'open')}
                            color="hover:text-amber-500 hover:bg-amber-500/10"
                        />
                    )}
                    <HilMemoRowAction
                        icon={Archive}
                        title="Archive"
                        onClick={() => onArchiveDraft?.(draft)}
                    />
                    <HilMemoRowAction
                        icon={Trash2}
                        title="Delete"
                        onClick={() => onDeleteDraft?.(draft)}
                        color="hover:text-rose-400 hover:bg-rose-500/10"
                    />
                </div>
            </header>
            {mutationError ? (
                <div
                  role="status"
                  aria-live="polite"
                  className="mx-6 mt-4 rounded-2xl border border-rose-500/10 bg-rose-500/5 px-4 py-3 text-[11px] font-medium text-rose-400 animate-slide-down"
                >
                    <Activity size={14} className="inline mr-2" /> {mutationError}
                </div>
            ) : null}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-4">
                <div className="rounded-2xl border border-border/10 bg-muted/5 p-4">
                    <div className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/40">
                        Execution Status
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground/70">
                        <span className="inline-flex items-center gap-2 rounded-full border border-border/20 bg-muted/10 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-muted-foreground/60">
                            {executionStatus}
                        </span>
                        <span className="inline-flex items-center gap-2">
                            <Target size={12} className={gateReady ? 'text-emerald-400' : 'text-muted-foreground/40'} />
                            {gateReady ? 'Gate ready' : 'Gate waiting'}
                        </span>
                        {executionSessionId ? (
                            <span className="inline-flex items-center gap-2">
                                <Terminal size={12} className="text-primary/60" />
                                {sessionLabel}
                            </span>
                        ) : null}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-3 text-[10px] text-muted-foreground/40">
                        {executionRequestedAt ? (
                            <span>Requested {executionRequestedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
                        ) : null}
                        {executionStartedAt ? (
                            <span>Started {executionStartedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
                        ) : null}
                        {executionFinishedAt ? (
                            <span>Finished {executionFinishedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
                        ) : null}
                        {actionSheetStatus ? (
                            <span>Action Sheet {actionSheetId}</span>
                        ) : null}
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => onViewSession?.(executionSessionId)}
                            disabled={!executionSessionId}
                            className="rounded-md border border-border/20 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground hover:text-foreground hover:border-primary/40 disabled:opacity-40"
                        >
                            View Session
                        </button>
                    </div>
                </div>
                {hasActionSheet ? (
                  actionSheetStatus ? (
                    <ActionSheetStatusPanel
                      sheet={actionSheetStatus}
                      sessions={sessions}
                      sessionId={actionSheetStatus?.sessionId || executionSessionId}
                      onDispatchSheet={onDispatchActionSheet}
                      onCancelSheet={onCancelActionSheet}
                      onArchiveSheet={onArchiveActionSheet}
                      onDeleteSheet={onDeleteActionSheet}
                      onViewSession={onViewSession}
                      onOpenPanel={onOpenActionSheets}
                      compact
                      showSessionSelect={false}
                    />
                  ) : (
                    <div className="rounded-2xl border border-border/10 bg-muted/5 p-4 mt-4">
                      <div className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/40">
                        Action Sheet
                      </div>
                      <div className="mt-2 text-[11px] text-muted-foreground/60">
                        Linked Action Sheet: {actionSheetId}
                      </div>
                      <div className="mt-3">
                        <button
                          type="button"
                          onClick={() => onOpenActionSheets?.(actionSheetId)}
                          className="rounded-md border border-border/30 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground hover:text-foreground"
                        >
                          Open Action Sheets
                        </button>
                      </div>
                    </div>
                  )
                ) : (
                  <div className="rounded-2xl border border-border/10 bg-muted/5 p-4 mt-4">
                    <div className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/40">
                      Action Sheet
                    </div>
                    <div className="mt-2 text-[11px] text-muted-foreground/60">
                      No Action Sheet linked.
                    </div>
                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={() => onCreateActionSheet?.(draft)}
                        disabled={!onCreateActionSheet}
                        className="rounded-md border border-primary/40 bg-primary/5 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-primary hover:bg-primary/10 disabled:opacity-40"
                      >
                        <Plus size={12} className="inline mr-1" />
                        Create Action Sheet
                      </button>
                    </div>
                  </div>
                )}
                <div className="rounded-2xl border border-border/10 bg-muted/5 p-4 mt-4">
                    <div className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/40">
                        Draft Body
                    </div>
                    <div className="mt-3 text-[13px] leading-relaxed text-foreground/80 whitespace-pre-wrap font-mono">
                        {resolveBody(draft) || 'No content.'}
                    </div>
                </div>

                {references.length > 0 && (
                    <div className="mt-6">
                        <div className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/40">
                            References
                        </div>
                        <div className="mt-2 flex flex-col gap-2">
                            {references.map((ref, index) => {
                                const refPath = ref.path || ref.id || '';
                                const canOpen = Boolean(refPath);
                                return (
                                  <div
                                      key={`${ref.id || ref.path || index}`}
                                      className="rounded-xl border border-border/10 bg-muted/5 px-3 py-2 text-[11px] text-muted-foreground/70"
                                  >
                                      <div className="flex items-center gap-2">
                                          <button
                                            type="button"
                                            onClick={() =>
                                              onOpenReference?.({
                                                path: refPath,
                                                line: ref.line,
                                                column: ref.column,
                                              })
                                            }
                                            disabled={!canOpen}
                                            draggable={canOpen}
                                            onDragStart={(event) => onReferenceDragStart?.(event, refPath)}
                                            className="inline-flex min-w-0 items-center gap-2 font-mono truncate text-left hover:text-primary disabled:cursor-default disabled:opacity-60"
                                          >
                                            <Target size={12} className="text-primary/60" />
                                            <span className="truncate">
                                              {refPath || 'Unknown reference'}
                                            </span>
                                            {ref.line ? (
                                                <span className="text-[10px] text-muted-foreground/40">:{ref.line}</span>
                                            ) : null}
                                          </button>
                                          {canOpen ? (
                                            <button
                                              type="button"
                                              onClick={() => onRevealReference?.({ path: refPath })}
                                              className="rounded border border-border/30 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground/70 hover:border-primary/50 hover:text-primary"
                                            >
                                              Reveal
                                            </button>
                                          ) : null}
                                      </div>
                                  </div>
                                );
                              })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

