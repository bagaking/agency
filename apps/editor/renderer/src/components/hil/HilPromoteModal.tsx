import React, { useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Camera, FileCode, Quote, StickyNote, Terminal, X } from 'lucide-react';

import { ActionSheetStatusPanel } from '../actionSheets/ActionSheetStatusPanel';
import {
  HilContextChip,
  HIL_SURFACE_COPY,
  HilStatusBadge,
  HilSurfaceHeader,
  HilSurfaceSection,
} from './hilSurfaceSystem';
import { IconButton } from '../ui/IconButton';
import { focusRing } from '../ui/focusRing';

const memoTypeMeta: Record<string, { label: string; icon: any }> = {
  flash: { label: 'Flash', icon: StickyNote },
  excerpt: { label: 'Excerpt', icon: Quote },
  screenshot: { label: 'Screenshot', icon: Camera },
};

const focusRingClass = focusRing.default;

const toTitle = (value: string) =>
  value ? value.slice(0, 1).toUpperCase() + value.slice(1) : '';

const resolvePromoteType = (item: any) => {
  if (item.kind === 'comment') {
    return { id: 'comment', label: 'Comments', icon: Terminal };
  }
  if (item.kind === 'memo') {
    const noteType = item.meta?.noteType;
    const meta = memoTypeMeta[noteType] || {
      label: noteType ? toTitle(noteType) : 'Memo',
      icon: StickyNote,
    };
    return { id: `memo:${noteType || 'memo'}`, label: meta.label, icon: meta.icon };
  }
  return {
    id: item.kind || 'unknown',
    label: toTitle(item.kind || 'Item'),
    icon: FileCode,
  };
};

const resolvePromoteSource = (item: any) => {
  if (item.anchor?.file) {
    return { id: item.anchor.file, label: item.anchor.file };
  }
  return { id: 'unlinked', label: 'Unlinked' };
};

export function PromoteModal({
  open,
  loading,
  error,
  description,
  items,
  selectedIds,
  previewById,
  promoteStep,
  promoteDraft,
  promoteMode,
  promoteActionSheet,
  promoteGateStatus,
  promoteExecutionStatus,
  promoteSessionId,
  sessions,
  sessionActivityByKey,
  selectedCellId,
  onChangeDescription,
  onToggleItem,
  onToggleGroup,
  onPreviewItem,
  onSelectSession,
  onSelectMode,
  onCreateSession,
  onFocusSession,
  onClose,
  onDispatch,
  onConfirm,
  onOpenTimeline,
  onDispatchActionSheet,
  onCancelActionSheet,
  onArchiveActionSheet,
  onDeleteActionSheet,
  onOpenActionSheets,
}: any) {
  if (!open) {
    return null;
  }
  const isWaiting = promoteStep === 'waiting';
  const gateStatus = isWaiting ? promoteGateStatus : 'idle';
  const gateReady = gateStatus === 'ready';
  const gateMissing = gateStatus === 'missing';
  const executionStatus = promoteExecutionStatus || (isWaiting ? 'waiting' : 'idle');
  const deliveryMode = promoteMode === 'gated' ? 'gated' : 'quick';
  const availableSessions = sessions.filter((session) => session.status !== 'closed');
  const activeSession = availableSessions.find((session) => session.id === promoteSessionId) || null;
  const activityKey = selectedCellId && promoteSessionId ? `${selectedCellId}:${promoteSessionId}` : '';
  const lastActivity = activityKey ? sessionActivityByKey[activityKey] : null;
  const lastActivityLabel = lastActivity
    ? new Date(lastActivity).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
    : '—';
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const promoteTree = useMemo(() => buildPromoteTree(items), [items]);
  const selectedCount = selectedIds.length;

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-[1100px] rounded-[28px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(23,28,36,0.98),rgba(12,15,21,0.99))] p-6 shadow-[0_20px_70px_rgba(0,0,0,0.42)]">
        <div className="flex items-start justify-between gap-4">
          <HilSurfaceHeader
            eyebrow={HIL_SURFACE_COPY.promoteSubtitle}
            title={HIL_SURFACE_COPY.promoteTitle}
            subtitle={
              deliveryMode === 'gated'
                ? 'Review the selected records, choose the execution lane, then confirm only when the draft gate is truly ready.'
                : 'Review the selected records, choose the execution lane, and dispatch once the destination is right.'
            }
            meta={
              <>
                <HilStatusBadge label={`${selectedCount} selected`} tone="active" />
                <HilStatusBadge label={deliveryMode} tone={deliveryMode === 'gated' ? 'warning' : 'neutral'} />
                {promoteSessionId ? <HilContextChip label={promoteSessionId} /> : null}
              </>
            }
          />
          <IconButton
            label="Close promote dialog"
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground/50 hover:text-foreground hover:bg-muted/10 transition-colors"
          >
            <X size={14} aria-hidden="true" />
          </IconButton>
        </div>

        <div className="mt-4 grid grid-cols-[1.25fr_0.95fr] gap-4">
          <div className="space-y-3">
            <HilSurfaceSection
              eyebrow="Records"
              title="Selected context"
              description="The draft summary is the instruction spine. The tree below is the evidence that will travel with it."
              tone="active"
            >
              <textarea
                value={description}
                onChange={(event) => onChangeDescription?.(event.target.value)}
                rows={4}
                disabled={isWaiting}
                name="promote-description"
                autoComplete="off"
                aria-label="Draft description"
                className="w-full resize-none rounded-xl border border-white/[0.08] bg-background/80 px-3.5 py-3 text-sm text-foreground placeholder:text-muted-foreground/30 focus:border-primary/30 focus:ring-1 focus:ring-primary/10 focus:outline-none transition-colors disabled:opacity-60"
                placeholder="Describe the draft you want to create from selected records…"
              />
            </HilSurfaceSection>

            <HilSurfaceSection
              eyebrow="Delivery"
              title="Execution lane"
              description="Set the destination session and whether this should run as a quick send or a gated draft handoff."
            >
              <div className="mt-2 flex items-center gap-2">
                <div className="inline-flex rounded bg-background/60 p-0.5">
                  <button
                    type="button"
                    disabled={isWaiting}
                    onClick={() => onSelectMode?.('quick')}
                    className={`rounded px-2 py-1 text-[9px] font-semibold uppercase tracking-widest transition-colors disabled:opacity-60 ${focusRingClass} ${
                      deliveryMode === 'quick'
                        ? 'bg-primary/15 text-primary'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                    title="Quick: dispatch and consume items immediately"
                  >
                    Quick
                  </button>
                  <button
                    type="button"
                    disabled={isWaiting}
                    onClick={() => onSelectMode?.('gated')}
                    className={`rounded px-2 py-1 text-[9px] font-semibold uppercase tracking-widest transition-colors disabled:opacity-60 ${focusRingClass} ${
                      deliveryMode === 'gated'
                        ? 'bg-primary/15 text-primary'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                    title="Gated: link to Action Sheet and wait for completion gate"
                  >
                    Gated
                  </button>
                </div>

                <select
                  value={promoteSessionId}
                  onChange={(event) => onSelectSession?.(event.target.value)}
                  disabled={isWaiting}
                  className="flex-1 rounded-md border border-border/20 bg-background px-2 py-1.5 text-[11px] text-foreground focus:border-primary/40 focus:outline-none disabled:opacity-60"
                >
                  <option value="">Select session…</option>
                  {availableSessions.map((session) => (
                    <option key={session.id} value={session.id}>
                      {session.name || session.id} · {session.status}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={onCreateSession}
                  disabled={isWaiting}
                  className={`rounded-md border border-border/20 px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors disabled:opacity-60 ${focusRingClass}`}
                >
                  New
                </button>
                <button
                  type="button"
                  onClick={onFocusSession}
                  disabled={!activeSession}
                  className={`rounded-md border border-border/20 px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors disabled:opacity-40 ${focusRingClass}`}
                >
                  View
                </button>
                <button
                  type="button"
                  onClick={onOpenTimeline}
                  disabled={!promoteDraft && !(deliveryMode === 'gated' && promoteActionSheet)}
                  className={`rounded-md border border-border/20 px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors disabled:opacity-40 ${focusRingClass}`}
                  title={promoteDraft ? 'Open created draft in Memo view' : 'Open linked Action Sheet'}
                >
                  Timeline
                </button>
              </div>
              <div className="mt-2 text-[10px] text-muted-foreground/50">
                {activeSession
                  ? `Using ${activeSession.name || activeSession.id} · ${activeSession.status} · idle at ${lastActivityLabel}`
                  : 'No session selected yet.'}
              </div>
            </HilSurfaceSection>
          </div>

          <div className="space-y-3">
            <HilSurfaceSection
              eyebrow="Readiness"
              title="Draft gate"
              description="The gate answers whether it is actually safe to consume the source records."
              actions={<PromoteGateBadge status={gateStatus} />}
            >
              <div className="mt-2 text-[11px] text-muted-foreground/70 leading-relaxed">
                {!isWaiting
                  ? deliveryMode === 'gated'
                    ? 'Dispatch promote to create a draft and begin the gate.'
                    : 'Dispatch promote to create a draft and send it immediately.'
                  : gateReady && promoteDraft
                    ? deliveryMode === 'quick'
                      ? 'Quick run acknowledged. Items were consumed after ACK.'
                      : 'Draft marked complete. You can confirm and consume items.'
                    : gateMissing
                      ? 'Draft not found. Ensure the draft exists in .agency/hil.'
                      : 'Waiting for the agent to complete the draft and mark it promoted.'}
              </div>
              {promoteDraft ? (
                <div className="mt-2 text-[10px] text-muted-foreground/50">
                  Draft ID: <span className="font-mono">{promoteDraft.id}</span>
                </div>
              ) : null}
            </HilSurfaceSection>

            <HilSurfaceSection
              eyebrow="Execution"
              title="Dispatch state"
              description="Use this to see whether the selected session has acknowledged the current promote run."
              actions={<ExecutionStatusBadge status={executionStatus} />}
            >
              <div className="mt-2 text-[11px] text-muted-foreground/70 leading-relaxed">
              {executionStatus === 'running'
                ? 'Dispatch sent. Track progress in the selected session.'
                : executionStatus === 'complete'
                  ? 'Execution completed. Awaiting final confirm.'
                  : executionStatus === 'failed'
                    ? 'Execution failed. Retry by re-dispatching promote.'
                    : executionStatus === 'queued'
                      ? 'Queued for dispatch.'
                      : executionStatus === 'canceled'
                        ? 'Execution canceled. Restart to retry.'
                        : executionStatus === 'missing'
                          ? 'Draft metadata missing. Refresh and retry.'
                          : 'Execution status idle.'}
              </div>
            </HilSurfaceSection>

            {promoteActionSheet ? (
              <ActionSheetStatusPanel
                sheet={promoteActionSheet}
                sessions={availableSessions}
                sessionId={promoteSessionId}
                onDispatchSheet={onDispatchActionSheet}
                onCancelSheet={onCancelActionSheet}
                onArchiveSheet={onArchiveActionSheet}
                onDeleteSheet={onDeleteActionSheet}
                onViewSession={onFocusSession}
                onOpenPanel={onOpenActionSheets}
                compact
                showSessionSelect={false}
              />
            ) : deliveryMode === 'gated' && isWaiting ? (
              <div className="rounded-xl border border-border/10 bg-muted/5 px-3 py-3 text-[11px] text-muted-foreground/60">
                Action Sheet not available yet. Retry dispatch if needed.
              </div>
            ) : null}
          </div>
        </div>

        <HilSurfaceSection
          eyebrow="Records map"
          title="Included records"
          description="Review the exact comments and memo captures that will be attached to this draft."
          className="mt-4"
        >
        <div className="max-h-64 overflow-y-auto custom-scrollbar pr-1 space-y-3">
          {items.length === 0 ? (
            <div className="text-[11px] text-muted-foreground/40 py-6 text-center italic">
              No pending items.
            </div>
          ) : (
            promoteTree.map((typeGroup) => {
              const typeIds = typeGroup.items.map((item) => item.id);
              const typeState = resolveSelectionState(typeIds, selectedSet);
              const TypeIcon = typeGroup.icon;
              return (
                <div key={typeGroup.id} className="rounded-2xl border border-white/[0.05] bg-white/[0.025] px-4 py-3">
                  <div className="flex items-center gap-2 text-[11px] font-semibold text-foreground/80">
                    <TreeCheckbox
                      state={typeState}
                      disabled={isWaiting}
                      onChange={() => onToggleGroup?.(typeIds)}
                    />
                    <TypeIcon size={13} className="text-primary/60" />
                    <span className="tracking-[0.01em] text-[11px] text-foreground/74">
                      {typeGroup.label}
                    </span>
                    <HilStatusBadge label={`${typeIds.length}`} tone="neutral" className="px-2 py-0.5" />
                  </div>
                  <div className="mt-2 space-y-2 pl-5">
                    {typeGroup.sources.map((sourceGroup) => {
                      const sourceIds = sourceGroup.items.map((item) => item.id);
                      const sourceState = resolveSelectionState(sourceIds, selectedSet);
                      return (
                        <div key={sourceGroup.id} className="rounded-xl border border-white/[0.04] bg-black/18 px-3 py-2.5">
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground/60">
                            <TreeCheckbox
                              state={sourceState}
                              disabled={isWaiting}
                              onChange={() => onToggleGroup?.(sourceIds)}
                            />
                            <HilContextChip label={sourceGroup.label} className="max-w-[260px]" />
                            <span className="ml-auto"><HilStatusBadge label={`${sourceIds.length}`} tone="neutral" className="px-2 py-0.5" /></span>
                          </div>
                          <div className="mt-2 space-y-2">
                            {sourceGroup.items.map((item) => {
                              const checked = selectedSet.has(item.id);
                              const preview = previewById[item.id];
                              return (
                                <div
                                  key={item.id}
                                  className="rounded-xl border border-white/[0.04] bg-white/[0.025] px-3 py-2.5 transition-colors hover:bg-white/[0.04] group/item select-none"
                                  onMouseEnter={() => onPreviewItem?.(item)}
                                >
                                  <label className="flex items-start gap-3 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() => onToggleItem?.(item.id)}
                                      disabled={isWaiting}
                                      className="mt-0.5 h-3.5 w-3.5 rounded border-border/60 bg-transparent text-primary focus:ring-offset-0 focus:ring-1 focus:ring-primary/20 transition-colors disabled:opacity-60"
                                    />
                                    <div className="flex flex-1 flex-col gap-1 min-w-0">
                                      <div className="flex items-center justify-between">
                                        <span className="font-semibold text-foreground/84 truncate mr-2 text-[11px]">
                                          {item.body || item.message}
                                        </span>
                                        {item.anchor?.line ? (
                                          <span className="text-[10px] text-muted-foreground/40 tabular-nums shrink-0 font-medium">
                                            Ln {item.anchor?.line || 1}
                                          </span>
                                        ) : null}
                                      </div>
                                      {preview ? (
                                        preview.error ? (
                                          <div className="mt-1 text-[10px] text-rose-400 opacity-80">{preview.error}</div>
                                        ) : (
                                          <div className="mt-1 rounded-xl border border-white/[0.04] bg-black/16 px-2.5 py-2 font-mono text-[10px] text-muted-foreground/66 overflow-hidden">
                                            {preview.snippet?.map((line) => (
                                              <div key={`${item.id}-${line.line}`} className="flex gap-3">
                                                <span className="w-7 text-right opacity-30 select-none tabular-nums shrink-0">
                                                  {line.line}
                                                </span>
                                                <span className="truncate">{line.text || ' '}</span>
                                              </div>
                                            ))}
                                          </div>
                                        )
                                      ) : (
                                        <div className="mt-1 text-[10px] text-muted-foreground/30 italic group-hover/item:text-muted-foreground/50 transition-colors">
                                          Hover to preview context.
                                        </div>
                                      )}
                                    </div>
                                  </label>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
        </HilSurfaceSection>

        {error ? (
          <div role="status" aria-live="polite" className="mt-3 text-[11px] font-medium text-rose-400 bg-rose-500/5 p-2 rounded border border-rose-500/10">
            {error}
          </div>
        ) : null}

        <div className="mt-5 flex items-center justify-end gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.025] px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className={`rounded-md px-3 py-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/10 transition-colors ${focusRingClass}`}
          >
            Cancel
          </button>
          {isWaiting ? (
            <button
              type="button"
              onClick={onConfirm}
              disabled={(deliveryMode === 'gated' && !gateReady) || loading}
            className={`rounded-full bg-primary hover:bg-primary/90 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary-foreground shadow-sm transition-colors transition-transform active:scale-95 disabled:opacity-50 ${focusRingClass}`}
          >
              {loading
                ? 'Updating…'
                : deliveryMode === 'gated'
                  ? 'Confirm Draft'
                  : 'Done'}
            </button>
          ) : (
            <button
              type="button"
              onClick={onDispatch}
              disabled={loading}
            className={`rounded-full bg-primary hover:bg-primary/90 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary-foreground shadow-sm transition-colors transition-transform active:scale-95 disabled:opacity-50 ${focusRingClass}`}
          >
              {loading
                ? 'Dispatching…'
                : deliveryMode === 'gated'
                  ? 'Dispatch Gated'
                  : 'Dispatch Quick'}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

function PromoteGateBadge({ status }: any) {
  const label =
    status === 'ready'
      ? 'Ready'
      : status === 'missing'
        ? 'Missing'
        : status === 'idle'
          ? 'Idle'
          : 'Waiting';
  return <HilStatusBadge label={label} tone={status === 'ready' ? 'success' : status === 'missing' ? 'danger' : status === 'idle' ? 'neutral' : 'warning'} className="px-2 py-0.5" />;
}

function ExecutionStatusBadge({ status }: any) {
  const label =
    status === 'running'
      ? 'Running'
      : status === 'complete'
        ? 'Complete'
        : status === 'failed'
          ? 'Failed'
          : status === 'queued'
            ? 'Queued'
            : status === 'canceled'
              ? 'Canceled'
            : status === 'missing'
              ? 'Missing'
              : 'Idle';
  return <HilStatusBadge label={label} tone={status === 'complete' ? 'success' : status === 'running' ? 'active' : status === 'failed' || status === 'missing' ? 'danger' : status === 'queued' ? 'warning' : 'neutral'} className="px-2 py-0.5" />;
}

function buildPromoteTree(items = []) {
  const typeMap = new Map();
  items.forEach((item) => {
    if (!item?.id) {
      return;
    }
    const typeMeta = resolvePromoteType(item);
    if (!typeMap.has(typeMeta.id)) {
      typeMap.set(typeMeta.id, { ...typeMeta, sources: new Map(), items: [] });
    }
    const typeGroup = typeMap.get(typeMeta.id);
    typeGroup.items.push(item);
    const sourceMeta = resolvePromoteSource(item);
    if (!typeGroup.sources.has(sourceMeta.id)) {
      typeGroup.sources.set(sourceMeta.id, { ...sourceMeta, items: [] });
    }
    typeGroup.sources.get(sourceMeta.id).items.push(item);
  });
  return Array.from(typeMap.values()).map((typeGroup) => ({
    ...typeGroup,
    sources: Array.from(typeGroup.sources.values()),
  }));
}

function resolveSelectionState(ids, selectedSet) {
  if (!ids.length) {
    return 'none';
  }
  let selectedCount = 0;
  ids.forEach((id) => {
    if (selectedSet.has(id)) {
      selectedCount += 1;
    }
  });
  if (selectedCount === 0) {
    return 'none';
  }
  if (selectedCount === ids.length) {
    return 'all';
  }
  return 'partial';
}

function TreeCheckbox({ state, disabled, onChange }: any) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.indeterminate = state === 'partial';
    }
  }, [state]);
  return (
    <input
      ref={ref}
      type="checkbox"
      disabled={disabled}
      checked={state === 'all'}
      onChange={onChange}
      className="h-3.5 w-3.5 rounded border-border/60 bg-transparent text-primary focus:ring-offset-0 focus:ring-1 focus:ring-primary/20 transition-colors disabled:opacity-60"
    />
  );
}
