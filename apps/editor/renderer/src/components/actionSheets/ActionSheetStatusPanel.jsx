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
          <button
            type="button"
            onClick={() => onOpenPanel?.(sheet.id)}
            className="rounded-md border border-border/30 px-2 py-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground hover:text-foreground"
          >
            <ExternalLink size={12} className="inline mr-1" />
            Open
          </button>
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
            className="flex-1 rounded-md border border-border/20 bg-background px-2 py-1.5 text-[11px] text-foreground focus:border-primary/40 focus:outline-none"
          >
            <option value="">Select session...</option>
            {availableSessions.map((session) => (
              <option key={session.id} value={session.id}>
                {session.name || session.id} · {session.status}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => onDispatchSheet?.(sheet.id, currentSessionId)}
            disabled={!canDispatch}
            className="rounded-md bg-primary px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-primary-foreground hover:bg-primary/90 transition-all disabled:opacity-60"
          >
            <Play size={12} className="inline mr-1" />
            {dispatchLabel}
          </button>
          <button
            type="button"
            onClick={() => onViewSession?.(currentSessionId)}
            disabled={!currentSessionId}
            className="rounded-md border border-border/30 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            <Terminal size={12} className="inline mr-1" />
            View
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground/70">
          <div className="flex items-center gap-2">
            <Terminal size={12} />
            <span>{currentSessionId || 'No session bound'}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onDispatchSheet?.(sheet.id, currentSessionId)}
              disabled={!canDispatch}
              className="rounded-md bg-primary px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-primary-foreground hover:bg-primary/90 transition-all disabled:opacity-60"
            >
              <Play size={12} className="inline mr-1" />
              {dispatchLabel}
            </button>
            <button
              type="button"
              onClick={() => onViewSession?.(currentSessionId)}
              disabled={!currentSessionId}
              className="rounded-md border border-border/30 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              <Terminal size={12} className="inline mr-1" />
              View
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        {onRefreshChecks ? (
          <button
            type="button"
            onClick={() => onRefreshChecks?.(sheet.id)}
            className="rounded-md border border-border/30 px-2 py-1 text-[10px] text-muted-foreground hover:text-foreground"
          >
            <RefreshCw size={12} />
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => onCancelSheet?.(sheet.id)}
          disabled={!canCancel}
          className="rounded-md border border-border/30 px-2 py-1 text-[10px] text-muted-foreground hover:text-foreground disabled:opacity-50"
        >
          <PauseCircle size={12} />
        </button>
        {showManagement ? (
          <>
            <button
              type="button"
              onClick={() => onArchiveSheet?.(sheet.id)}
              disabled={isArchived || !onArchiveSheet}
              className="rounded-md border border-border/30 px-2 py-1 text-[10px] text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              <Archive size={12} />
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={!onDeleteSheet}
              className="rounded-md border border-rose-500/40 px-2 py-1 text-[10px] text-rose-300 hover:text-rose-200 disabled:opacity-50"
            >
              <Trash2 size={12} />
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}
