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
import { stateBadge, gateBadge, formatTime, resolveActionSheetLabel } from './actionSheetUi';
import { useModal } from '../modals/ModalSystem';
import { IconButton } from '../ui/IconButton';
import { focusRing } from '../ui/focusRing';

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
}: any) {
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
  const focusRingClass = focusRing.default;

  const handleDelete = async () => {
    if (!sheet.id || !onDeleteSheet || !modal?.confirm) {
      return;
    }
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
          <IconButton
            label="Open action sheet panel"
            tooltip="Open action sheet panel"
            side="left"
            onClick={() => onOpenPanel?.(sheet.id)}
            className="h-7 w-7 rounded-md border border-border/30 text-muted-foreground transition-colors hover:text-foreground hover:border-primary/40"
          >
            <ExternalLink size={12} aria-hidden="true" />
          </IconButton>
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
          <IconButton
            label={`${dispatchLabel} action sheet`}
            tooltip={`${dispatchLabel} action sheet`}
            side="bottom"
            onClick={() => onDispatchSheet?.(sheet.id, currentSessionId)}
            disabled={!canDispatch}
            className="h-7 w-7 rounded-md bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
          >
            <Play size={12} aria-hidden="true" />
          </IconButton>
          <IconButton
            label="View session"
            tooltip="View session"
            side="bottom"
            onClick={() => onViewSession?.(currentSessionId)}
            disabled={!currentSessionId}
            className="h-7 w-7 rounded-md border border-border/30 text-muted-foreground transition-colors hover:text-foreground hover:border-primary/40 disabled:opacity-50"
          >
            <Terminal size={12} aria-hidden="true" />
          </IconButton>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground/70">
          <div className="flex items-center gap-2">
            <Terminal size={12} aria-hidden="true" />
            <span>{currentSessionId || 'No session bound'}</span>
          </div>
          <div className="flex items-center gap-2">
            <IconButton
              label={`${dispatchLabel} action sheet`}
              tooltip={`${dispatchLabel} action sheet`}
              side="bottom"
              onClick={() => onDispatchSheet?.(sheet.id, currentSessionId)}
              disabled={!canDispatch}
              className="h-7 w-7 rounded-md bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
            >
              <Play size={12} aria-hidden="true" />
            </IconButton>
            <IconButton
              label="View session"
              tooltip="View session"
              side="bottom"
              onClick={() => onViewSession?.(currentSessionId)}
              disabled={!currentSessionId}
              className="h-7 w-7 rounded-md border border-border/30 text-muted-foreground transition-colors hover:text-foreground hover:border-primary/40 disabled:opacity-50"
            >
              <Terminal size={12} aria-hidden="true" />
            </IconButton>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        {onRefreshChecks ? (
          <IconButton
            label="Refresh checks"
            tooltip="Refresh checks"
            side="bottom"
            onClick={() => onRefreshChecks?.(sheet.id)}
            className="h-7 w-7 rounded-md border border-border/30 text-muted-foreground transition-colors hover:text-foreground hover:border-primary/40"
          >
            <RefreshCw size={12} aria-hidden="true" />
          </IconButton>
        ) : null}
        <IconButton
          label="Cancel dispatch"
          tooltip="Cancel dispatch"
          side="bottom"
          onClick={() => onCancelSheet?.(sheet.id)}
          disabled={!canCancel}
          className="h-7 w-7 rounded-md border border-border/30 text-muted-foreground transition-colors hover:text-foreground hover:border-primary/40 disabled:opacity-50"
        >
          <PauseCircle size={12} aria-hidden="true" />
        </IconButton>
        {showManagement ? (
          <>
            <IconButton
              label="Archive action sheet"
              tooltip={isArchived ? 'Already archived' : 'Archive action sheet'}
              side="bottom"
              onClick={() => onArchiveSheet?.(sheet.id)}
              disabled={isArchived || !onArchiveSheet}
              className="h-7 w-7 rounded-md border border-border/30 text-muted-foreground transition-colors hover:text-foreground hover:border-primary/40 disabled:opacity-50"
            >
              <Archive size={12} aria-hidden="true" />
            </IconButton>
            <IconButton
              label="Delete action sheet"
              tooltip="Delete action sheet"
              side="bottom"
              onClick={handleDelete}
              disabled={!onDeleteSheet}
              className="h-7 w-7 rounded-md border border-rose-500/40 text-rose-300 transition-colors hover:text-rose-200 hover:border-rose-500/60 disabled:opacity-50"
            >
              <Trash2 size={12} aria-hidden="true" />
            </IconButton>
          </>
        ) : null}
      </div>
    </div>
  );
}
