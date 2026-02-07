import React from 'react';
import { CircleOff, Landmark, MoreHorizontal, Plus } from 'lucide-react';
import { AgentAvatarBadge } from '../ui/AgentAvatarBadge';
import { resolveSessionAvatarId } from '../../utils/agentAvatar';

export function SessionMapGridLayout({
  model,
  hoveredCellId,
  setHoveredCellId,
  registerClusterRef,
  onTokenEnter,
  onTokenLeave,
  onSelectSession,
  onOpenOfflineMenu,
  onOpenCreateMenu,
  canCreateSession,
}: any) {
  return (
    <div className="mt-2 grid gap-2 overflow-y-auto pr-1 sm:grid-cols-2 xl:grid-cols-3">
      {model.clusters.length ? (
        model.clusters.map((cluster) => (
          <div
            key={cluster.cell.id}
            ref={(node) => registerClusterRef(cluster.cell.id, node)}
            onMouseEnter={() => setHoveredCellId(cluster.cell.id)}
            onMouseLeave={() => setHoveredCellId(null)}
            className={`relative rounded-xl border border-white/20 bg-[#1c2128] p-2 transition-colors hover:bg-[#22272e] ${
              hoveredCellId === cluster.cell.id
                ? 'ring-1 ring-primary/50 shadow-[0_0_12px_rgba(59,130,246,0.3)]'
                : ''
            } ${cluster.isOffline ? 'opacity-60' : ''}`}
            style={{ borderLeft: `3px solid ${cluster.color}` }}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-[11px] font-bold text-white uppercase tracking-tight">
                <Landmark size={12} className="text-white/50" />
                <span className="truncate">{cluster.cell.name || cluster.cell.id || 'UNKNOWN'}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="rounded bg-black/60 px-1.5 py-0.5 text-[7px] font-mono text-white/60 border border-white/10 font-bold">
                  {cluster.typeLabel.toUpperCase()}
                </span>
                {canCreateSession ? (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onOpenCreateMenu?.(event.currentTarget, cluster.cell);
                    }}
                    className="flex h-5 w-5 items-center justify-center rounded border border-white/20 bg-black/40 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
                    title="Create session"
                    data-session-create-anchor="true"
                  >
                    <Plus size={12} />
                  </button>
                ) : null}
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {cluster.sessions.length ? (
                (() => {
                  const activeSessions = cluster.sessions.filter((session) => !session.isOffline);
                  const offlineSessions = cluster.sessions.filter((session) => session.isOffline);
                  const hasActive = activeSessions.length > 0;
                  return (
                    <>
                      {hasActive ? (
                        activeSessions.map((session) => {
                          const isClosed = session.isOffline;
                          return (
                            <button
                              key={session.id}
                              type="button"
                              className={`group relative flex h-12 w-12 items-center justify-center rounded-sm transition-all shadow-sm ${
                                session.isActive
                                  ? 'bg-primary/40 ring-1 ring-primary/60'
                                  : 'bg-black/60 border border-white/10 hover:bg-white/10'
                              }`}
                              onClick={() => onSelectSession(cluster.cell.id, session.id)}
                              onMouseEnter={(event) =>
                                onTokenEnter(event, {
                                  cell: cluster.cell,
                                  session,
                                  color: cluster.color,
                                  typeLabel: cluster.typeLabel,
                                })
                              }
                              onMouseLeave={onTokenLeave}
                              aria-label={`Session ${session.name || session.id}`}
                              data-session-token="true"
                            >
                              <AgentAvatarBadge
                                avatarId={resolveSessionAvatarId(session, cluster.cell)}
                                size={40}
                                lastActivityAt={session.lastActivityAt}
                                isClosed={isClosed}
                              />
                            </button>
                          );
                        })
                      ) : (
                        <div className="flex items-center gap-1.5 py-1 text-[9px] text-white/40 font-mono font-bold">
                          <CircleOff size={10} />
                          <span>NO ACTIVE SESSIONS</span>
                        </div>
                      )}
                      {offlineSessions.length ? (
                        <button
                          type="button"
                          className="flex h-12 items-center gap-1 rounded-sm border border-dashed border-white/20 bg-black/40 px-2 text-[8px] font-bold text-white/40 transition-colors hover:bg-white/10 hover:text-white/70"
                          onClick={(event) =>
                            onOpenOfflineMenu(event.currentTarget, cluster.cell, offlineSessions)
                          }
                          data-session-map-offline-trigger="true"
                        >
                          <MoreHorizontal size={16} />
                          <span>{offlineSessions.length}</span>
                        </button>
                      ) : null}
                    </>
                  );
                })()
              ) : (
                <div className="flex items-center gap-1.5 py-1 text-[9px] text-white/30 font-mono font-bold">
                  <CircleOff size={10} />
                  <span>NO DATA</span>
                </div>
              )}
            </div>
          </div>
        ))
      ) : (
        <div className="col-span-full rounded-xl border border-dashed border-white/10 bg-white/[0.04] p-6 text-center text-xs font-mono text-white/30 font-bold">
          INITIALIZING... NO SECTORS DETECTED.
        </div>
      )}
    </div>
  );
}
