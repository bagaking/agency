import React from 'react';
import { formatIdleShort } from '../../utils/timeFormat.js';

export function ExplorerSessions({
  selectedCell,
  sessions,
  sessionActivityByKey,
  activeSessionId,
  now
}) {
  if (!selectedCell) return null;

  const activeSessions = (sessions || []).filter((s) => s.status !== 'closed');

  return (
    <div className="border-b border-border/50 px-4 py-3 bg-white/[0.01]">
      <div className="mb-2 text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/30">
        Live Sessions
      </div>
      <div className="space-y-1.5">
        {activeSessions.map((session) => {
          const key = `${selectedCell.id}:${session.id}`;
          const lastActivity = sessionActivityByKey?.[key];
          const idleMs = lastActivity ? now - lastActivity : null;
          const isActive = session.id === activeSessionId;
          
          const statusLabel =
            session.status === 'detached'
              ? `Detached · Idle ${idleMs ? formatIdleShort(idleMs) : '—'}`
              : session.status === 'stale'
                ? `Stale · Idle ${idleMs ? formatIdleShort(idleMs) : '—'}`
                : `Idle ${idleMs ? formatIdleShort(idleMs) : '—'}`;

          return (
            <div key={session.id} className="flex items-center justify-between gap-2 group cursor-default">
              <div className="flex items-center gap-2 min-w-0">
                <span className={`text-[11px] truncate transition-colors ${isActive ? 'text-foreground font-semibold' : 'text-muted-foreground/60'}`}>
                  {session.name || session.id}
                </span>
              </div>
              <span className={`text-[9px] font-bold uppercase tracking-tighter transition-opacity ${isActive ? 'text-foreground/80' : 'text-muted-foreground/20 opacity-0 group-hover:opacity-100'}`}>
                {statusLabel}
              </span>
            </div>
          );
        })}
        {activeSessions.length === 0 && (
          <div className="text-[10px] text-muted-foreground/20 italic">No Active Sessions</div>
        )}
      </div>
    </div>
  );
}
