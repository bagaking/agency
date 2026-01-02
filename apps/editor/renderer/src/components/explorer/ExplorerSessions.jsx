import React from 'react';

const formatIdle = (ms) => {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes <= 0) return `${seconds}s`;
  const hours = Math.floor(minutes / 60);
  const remMinutes = minutes % 60;
  if (hours <= 0) return `${remMinutes}m`;
  return `${hours}h ${remMinutes}m`;
};

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
          const fallbackTime = session.updatedAt ? new Date(session.updatedAt).getTime() : now;
          const idleMs = now - (lastActivity || fallbackTime);
          const isActive = session.id === activeSessionId;
          
          const statusLabel =
            session.status === 'detached'
              ? 'Detached'
              : session.status === 'stale'
                ? 'Stale'
                : isActive
                  ? 'Active'
                  : `Idle ${formatIdle(idleMs)}`;

          return (
            <div key={session.id} className="flex items-center justify-between gap-2 group cursor-default">
              <div className="flex items-center gap-2 min-w-0">
                <div className={`h-1 w-1 rounded-full ${isActive ? 'bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]' : 'bg-muted-foreground/20'}`} />
                <span className={`text-[11px] truncate transition-colors ${isActive ? 'text-foreground font-semibold' : 'text-muted-foreground/60'}`}>
                    {session.name || session.id}
                </span>
              </div>
              <span className={`text-[9px] font-bold uppercase tracking-tighter transition-opacity ${isActive ? 'text-emerald-400/80' : 'text-muted-foreground/20 opacity-0 group-hover:opacity-100'}`}>
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
