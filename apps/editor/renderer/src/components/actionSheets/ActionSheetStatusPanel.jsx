import React from 'react';
import {
  AlertTriangle,
  Play,
  PauseCircle,
  RefreshCw,
  Terminal,
  ExternalLink,
  Archive,
  Trash2,
} from 'lucide-react';
import { stateBadge, gateBadge, formatTime, resolveActionSheetLabel } from './actionSheetUi.js';
import { useModal } from '../modals/ModalSystem.jsx';
import { Tooltip } from '../ui/Tooltip.jsx';

const resolveDispatchLabel = (state) => {
  if (state === 'failed' || state === 'completed' || state === 'canceled') {
    return 'Re-dispatch';
  }
  return 'Dispatch';
};

export function ActionSheetStatusPanel({
  sheet,
  sessions = [],
  sessionId,
  onSelectSession,
  onDispatchSheet,
  onCancelSheet,
  onRefreshChecks,
  onViewSession,
  onOpenPanel,
  compact = false,
  showSessionSelect = true,
  showManagement = true,
  onArchiveSheet,
  onDeleteSheet,
}) {
  if (!sheet) {
    return (
      <div className="rounded-xl border border-border/10 bg-muted/5 p-4 text-[11px] text-muted-foreground/50">
        No Action Sheet linked.
      </div>
    );
  }
  const availableSessions = (sessions || []).filter((session) => session.status !== 'closed');
  const currentSessionId = sessionId || sheet.sessionId || '';
  const dispatchLabel = resolveDispatchLabel(sheet.state);
  const canDispatch = Boolean(currentSessionId) && sheet.state !== 'running' && sheet.state !== 'waiting_gate';
  const canCancel = sheet.state === 'running' || sheet.state === 'waiting_gate';
  const statusClass = stateBadge(sheet.state);
  const gateStatus = sheet.gateStatus || 'idle';
  const title = resolveActionSheetLabel(sheet);
  const isArchived = Boolean(sheet.archived);
  const modal = useModal();
  const focusRingClass =
    'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40 focus-visible:ring-offset-1 focus-visible:ring-offset-background';

  const handleDelete = async () => {
    if (!sheet.id || !onDeleteSheet) {
      return;
    }
    if (modal?.confirm) {
      const confirmed = await modal.confirm({
        title: 'Delete Action Sheet',
        description: 'This Action Sheet will be removed from disk and cannot be restored.',
        confirmLabel: 'Delete',
        cancelLabel: 'Cancel',
        tone: 'danger',
        icon: Trash2,
      });
      if (!confirmed) {
        return;
      }
    } else if (!window.confirm('Delete this Action Sheet? This cannot be undone.')) {
      return;
    }
    await onDeleteSheet(sheet.id);
  };

  return (
    <div className={`rounded-xl border border-border/10 bg-muted/5 ${compact ? 'p-3' : 'p-4'} space-y-3`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/60">
            Action Sheet
          </div>
          <div className="text-[12px] font-semibold text-foreground">{title}</div>
          <div className="text-[10px] text-muted-foreground/50">
            {sheet.id}
          </div>
        </div>
        {onOpenPanel ? (
          <Tooltip label="Open action sheet panel" side="left">
            <button
              type="button"
              onClick={() => onOpenPanel?.(sheet.id)}
              aria-label="Open action sheet panel"
              className={`inline-flex h-7 w-7 items-center justify-center rounded-md border border-border/30 text-muted-foreground transition-colors hover:text-foreground hover:border-primary/40 ${focusRingClass}`}
            >
              <ExternalLink size={12} aria-hidden="true" />
            </button>
          </Tooltip>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground/70">
        <span className={`inline-flex items-center gap-2 rounded-full border px-2 py-0.5 text-[9px] uppercase ${statusClass}`}>
          {sheet.state || 'idle'}
        </span>
        {isArchived ? (
          <span className="inline-flex items-center gap-2 rounded-full border border-border/30 px-2 py-0.5 text-[9px] uppercase text-muted-foreground">
            Archived
          </span>
        ) : null}
        <span>
          Gate: <span className={gateBadge(gateStatus)}>{gateStatus}</span>
        </span>
        <span>Attempts: {sheet.attempts || 0}</span>
        <span>Last dispatch: {formatTime(sheet.lastRunAt) || '—'}</span>
        {sheet.nextRunAt ? <span>Next: {formatTime(sheet.nextRunAt)}</span> : null}
      </div>

      {sheet.lastError ? (
        <div className="rounded-md border border-rose-500/20 bg-rose-500/5 px-3 py-2 text-[10px] text-rose-300">
          <AlertTriangle size={12} className="inline mr-1" /> {sheet.lastError}
        </div>
      ) : null}

      {showSessionSelect ? (
        <div className="flex items-center gap-2">
          <select
            value={currentSessionId}
            onChange={(event) => onSelectSession?.(event.target.value)}
            className={`flex-1 rounded-md border border-border/20 bg-background px-2 py-1.5 text-[11px] text-foreground transition-colors hover:border-border/40 focus:border-primary/40 focus:outline-none ${focusRingClass}`}
          >
            <option value="">Select session...</option>
            {availableSessions.map((session) => (
              <option key={session.id} value={session.id}>
                {session.name || session.id} · {session.status}
              </option>
            ))}
          </select>
          <Tooltip label={`${dispatchLabel} action sheet`} side="bottom">
            <button
              type="button"
              onClick={() => onDispatchSheet?.(sheet.id, currentSessionId)}
              disabled={!canDispatch}
              aria-label={`${dispatchLabel} action sheet`}
              className={`inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60 ${focusRingClass}`}
            >
              <Play size={12} aria-hidden="true" />
            </button>
          </Tooltip>
          <Tooltip label="View session" side="bottom">
            <button
              type="button"
              onClick={() => onViewSession?.(currentSessionId)}
              disabled={!currentSessionId}
              aria-label="View session"
              className={`inline-flex h-7 w-7 items-center justify-center rounded-md border border-border/30 text-muted-foreground transition-colors hover:text-foreground hover:border-primary/40 disabled:opacity-50 ${focusRingClass}`}
            >
              <Terminal size={12} aria-hidden="true" />
            </button>
          </Tooltip>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground/70">
          <div className="flex items-center gap-2">
            <Terminal size={12} aria-hidden="true" />
            <span>{currentSessionId || 'No session bound'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Tooltip label={`${dispatchLabel} action sheet`} side="bottom">
              <button
                type="button"
                onClick={() => onDispatchSheet?.(sheet.id, currentSessionId)}
                disabled={!canDispatch}
                aria-label={`${dispatchLabel} action sheet`}
                className={`inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60 ${focusRingClass}`}
              >
                <Play size={12} aria-hidden="true" />
              </button>
            </Tooltip>
            <Tooltip label="View session" side="bottom">
              <button
                type="button"
                onClick={() => onViewSession?.(currentSessionId)}
                disabled={!currentSessionId}
                aria-label="View session"
                className={`inline-flex h-7 w-7 items-center justify-center rounded-md border border-border/30 text-muted-foreground transition-colors hover:text-foreground hover:border-primary/40 disabled:opacity-50 ${focusRingClass}`}
              >
                <Terminal size={12} aria-hidden="true" />
              </button>
            </Tooltip>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        {onRefreshChecks ? (
          <Tooltip label="Refresh checks" side="bottom">
            <button
              type="button"
              onClick={() => onRefreshChecks?.(sheet.id)}
              aria-label="Refresh checks"
              className={`inline-flex h-7 w-7 items-center justify-center rounded-md border border-border/30 text-muted-foreground transition-colors hover:text-foreground hover:border-primary/40 ${focusRingClass}`}
            >
              <RefreshCw size={12} aria-hidden="true" />
            </button>
          </Tooltip>
        ) : null}
        <Tooltip label="Cancel dispatch" side="bottom">
          <button
            type="button"
            onClick={() => onCancelSheet?.(sheet.id)}
            disabled={!canCancel}
            aria-label="Cancel dispatch"
            className={`inline-flex h-7 w-7 items-center justify-center rounded-md border border-border/30 text-muted-foreground transition-colors hover:text-foreground hover:border-primary/40 disabled:opacity-50 ${focusRingClass}`}
          >
            <PauseCircle size={12} aria-hidden="true" />
          </button>
        </Tooltip>
        {showManagement ? (
          <>
            <Tooltip label={isArchived ? 'Already archived' : 'Archive action sheet'} side="bottom">
              <button
                type="button"
                onClick={() => onArchiveSheet?.(sheet.id)}
                disabled={isArchived || !onArchiveSheet}
                aria-label="Archive action sheet"
                className={`inline-flex h-7 w-7 items-center justify-center rounded-md border border-border/30 text-muted-foreground transition-colors hover:text-foreground hover:border-primary/40 disabled:opacity-50 ${focusRingClass}`}
              >
                <Archive size={12} aria-hidden="true" />
              </button>
            </Tooltip>
            <Tooltip label="Delete action sheet" side="bottom">
              <button
                type="button"
                onClick={handleDelete}
                disabled={!onDeleteSheet}
                aria-label="Delete action sheet"
                className={`inline-flex h-7 w-7 items-center justify-center rounded-md border border-rose-500/40 text-rose-300 transition-colors hover:text-rose-200 hover:border-rose-500/60 disabled:opacity-50 ${focusRingClass}`}
              >
                <Trash2 size={12} aria-hidden="true" />
              </button>
            </Tooltip>
          </>
        ) : null}
      </div>
    </div>
  );
}
