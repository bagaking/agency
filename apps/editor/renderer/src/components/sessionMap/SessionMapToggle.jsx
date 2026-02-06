import React from 'react';
import { Map as MapIcon } from 'lucide-react';
import { Tooltip } from '../ui/Tooltip.jsx';
import { AgentAvatarBadge } from '../ui/AgentAvatarBadge.jsx';
import { resolveSessionAvatarId } from '../../utils/agentAvatar.js';
import { BASELINE_PROFILE_ID } from '../../utils/terminusSettings.js';

export function SessionMapToggle({ open, stats, onToggle, disabled, focusCell, focusSession }) {
  const sessionLabel = focusSession?.name || focusSession?.id || '';
  const isDefaultSession =
    focusSession?.id === 'default' || focusSession?.profileId === BASELINE_PROFILE_ID;
  const sessionAvatar = resolveSessionAvatarId(focusSession, focusCell);
  const sessionOffline =
    focusCell?.state === 'archived' ||
    focusCell?.state === 'closed' ||
    ['closed', 'stale', 'archived'].includes(focusSession?.status);
  const summary = stats
    ? `Cells ${stats.cells} · Sessions ${stats.sessions} · Online ${stats.online} · Offline ${stats.offline}${
        focusCell && sessionLabel
          ? ` · 当前通信: ${focusCell.name || focusCell.id} / ${sessionLabel}${
              isDefaultSession ? ' (默认通信 Session)' : ''
            }`
          : ''
      }`
    : 'Session map';
  const focusName = focusCell?.name || '';
  return (
    <Tooltip label={summary} side="top">
      <button
        type="button"
        className={`flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 ${
          disabled
            ? 'cursor-not-allowed opacity-50'
            : open
              ? 'bg-primary/20 text-primary'
              : 'bg-white/5 text-status-bar-foreground hover:bg-white/10'
        }`}
        onClick={disabled ? undefined : onToggle}
        aria-pressed={open}
        aria-label={open ? 'Close session map' : 'Open session map'}
        disabled={disabled}
        data-session-map-toggle="true"
      >
        <MapIcon size={14} />
        <span>Session Map</span>
        {focusCell ? (
          <span className="flex items-center gap-1 rounded-full border border-white/10 bg-black/20 px-2 py-0.5 text-[10px] font-medium text-status-bar-foreground/80">
            <AgentAvatarBadge
              avatarId={sessionAvatar}
              size={18} 
              lastActivityAt={focusSession?.lastActivityAt}
              isClosed={sessionOffline}
            />
            <span className="max-w-[80px] truncate">{focusName}</span>
            {sessionLabel ? (
              <span className="max-w-[90px] truncate text-status-bar-foreground/70">· {sessionLabel}</span>
            ) : null}
            {isDefaultSession ? (
              <span className="ml-1 rounded-full border border-white/10 px-1 text-[8px] uppercase tracking-wide text-status-bar-foreground/70">
                Default
              </span>
            ) : null}
          </span>
        ) : null}
        {stats ? (
          <span className="flex items-center gap-1 text-[10px] font-medium text-status-bar-foreground/80">
            <span>{stats.cells}C</span>
            <span>•</span>
            <span>{stats.sessions}S</span>
            <span className="pl-2 text-emerald-300/90">ON:{stats.online}</span>
            <span className="text-slate-300/80">OFF:{stats.offline}</span>
          </span>
        ) : null}
      </button>
    </Tooltip>
  );
}
