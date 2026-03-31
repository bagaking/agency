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
import {
  HIL_SURFACE_COPY,
  HilContextChip,
  HilStatusBadge,
  HilSurfaceHeader,
  HilSurfaceSection,
} from '../hilSurfaceSystem';
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
            <header className="border-b border-border/10 px-6 py-5">
                <HilSurfaceHeader
                  eyebrow={HIL_SURFACE_COPY.draftsSubtitle}
                  title={summarizeBody(draft)}
                  subtitle="Inspect the execution state, linked Action Sheet context, and source references before resuming or archiving this draft."
                  meta={
                    <>
                      <HilStatusBadge label={draft.status} tone={draft.status === 'resolved' ? 'success' : 'warning'} />
                      {createdAt ? <HilContextChip label={createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })} /> : null}
                    </>
                  }
                  actions={<div className="flex items-center gap-2">
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
                  </div>}
                />
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
                <HilSurfaceSection
                  eyebrow="Execution"
                  title="Run state"
                  description="Check readiness, linked execution lane, and timestamps before leaving this draft."
                  actions={
                    <div className="flex flex-wrap items-center gap-2">
                      <HilStatusBadge label={executionStatus} tone={executionStatus === 'complete' ? 'success' : executionStatus === 'running' ? 'active' : executionStatus === 'failed' ? 'danger' : 'neutral'} className="px-2 py-0.5" />
                      <HilStatusBadge label={gateReady ? 'Gate ready' : 'Gate waiting'} tone={gateReady ? 'success' : 'warning'} className="px-2 py-0.5" />
                    </div>
                  }
                >
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground/70">
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
                            className="rounded-full border border-border/20 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground hover:border-primary/40 disabled:opacity-40"
                        >
                            View Session
                        </button>
                    </div>
                </HilSurfaceSection>
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
                    <HilSurfaceSection
                      eyebrow="Action Sheet"
                      title="Linked sheet missing"
                      description={`Linked Action Sheet: ${actionSheetId}`}
                      className="mt-4"
                    >
                      <div className="mt-3">
                        <button
                          type="button"
                          onClick={() => onOpenActionSheets?.(actionSheetId)}
                          className="rounded-full border border-border/30 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground"
                        >
                          Open Action Sheets
                        </button>
                      </div>
                    </HilSurfaceSection>
                  )
                ) : (
                  <HilSurfaceSection
                    eyebrow="Action Sheet"
                    title="No linked sheet"
                    description="Create an Action Sheet if this draft needs a durable gated execution wrapper."
                    className="mt-4"
                  >
                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={() => onCreateActionSheet?.(draft)}
                        disabled={!onCreateActionSheet}
                        className="rounded-full border border-primary/40 bg-primary/5 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary hover:bg-primary/10 disabled:opacity-40"
                      >
                        <Plus size={12} className="inline mr-1" />
                        Create Action Sheet
                      </button>
                    </div>
                  </HilSurfaceSection>
                )}
                <HilSurfaceSection
                  eyebrow="Draft"
                  title="Draft body"
                  description="This is the canonical artifact body that the promote flow generated."
                  className="mt-4"
                >
                    <div className="mt-3 text-[13px] leading-relaxed text-foreground/80 whitespace-pre-wrap font-mono">
                        {resolveBody(draft) || 'No content.'}
                    </div>
                </HilSurfaceSection>

                {references.length > 0 && (
                    <div className="mt-6">
                        <HilSurfaceHeader
                          eyebrow="References"
                          title="Source records"
                          subtitle="Open or reveal the records that seeded this draft."
                          compact
                        />
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
