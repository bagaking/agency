import React from 'react';
import { CircleOff, Landmark, MoreHorizontal, Plus } from 'lucide-react';
import { AgentAvatarBadge } from '../ui/AgentAvatarBadge';
import { resolveSessionAvatarId } from '../../utils/agentAvatar';
import { formatRelativeTime } from '../../utils/timeFormat';
import { PanelCorner, TacticalFrame } from './SessionMapFrames';

export function SessionMapDockLayout({
  model,
  radarPoints,
  hoveredCellId,
  setHoveredCellId,
  focusClusterCard,
  focusData,
  onTokenEnter,
  onTokenLeave,
  onSelectSession,
  onOpenCreateMenu,
  onOpenOfflineMenu,
  registerClusterRef,
  canCreateSession,
}: any) {
  return (
    <div className="mt-2 grid flex-1 min-h-0 grid-cols-[140px_minmax(0,1fr)_180px] gap-2">
      {/* Radar Section */}
      <div
        className="group relative flex h-full flex-col rounded bg-white/[0.05] p-2 transition-colors hover:bg-white/[0.08]"
        onMouseLeave={() => setHoveredCellId(null)}
      >
        <PanelCorner position="top-left" color="rgba(255,255,255,0.3)" />
        <PanelCorner position="top-right" color="rgba(255,255,255,0.3)" />
        <PanelCorner position="bottom-left" color="rgba(255,255,255,0.3)" />
        <PanelCorner position="bottom-right" color="rgba(255,255,255,0.3)" />
        <div className="flex items-center justify-between font-mono text-[8px] font-bold uppercase tracking-widest text-white/60">
          <span>Strategic Radar</span>
        </div>
        <div className="relative mt-2 aspect-square flex-1 overflow-hidden rounded-full border border-white/20 bg-black/60 shadow-inner">
          {/* Radar Grid */}
          <div className="absolute inset-0 opacity-30" style={{
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px), repeating-radial-gradient(circle, transparent 0, transparent 20px, rgba(255,255,255,0.1) 20px, rgba(255,255,255,0.1) 21px)',
            backgroundSize: '10px 10px, 100% 100%',
          }} />
          {/* Radar Sweep */}
          <div className="absolute inset-0 animate-spin-slow opacity-30" style={{
            background: 'conic-gradient(from 0deg, transparent 0%, rgba(59,130,246,0.5) 100%)',
          }} />
          {/* Radar Crosshair */}
          <div className="absolute left-1/2 top-0 h-full w-[1px] -translate-x-1/2 bg-white/10" />
          <div className="absolute left-0 top-1/2 h-[1px] w-full -translate-y-1/2 bg-white/10" />

          {radarPoints.map((point) => {
            const isHovered = hoveredCellId === point.id;
            return (
              <button
                key={point.id}
                type="button"
                className={`absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-300 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 ${
                  isHovered ? 'z-20 scale-150' : 'z-10'
                }`}
                style={{
                  left: `${point.x}%`,
                  top: `${point.y}%`,
                  backgroundColor: point.color,
                  boxShadow: isHovered ? `0 0 10px ${point.color}` : `0 0 4px ${point.color}`,
                  border: '1.5px solid rgba(255,255,255,0.3)',
                }}
                onMouseEnter={() => setHoveredCellId(point.id)}
                onMouseLeave={() => setHoveredCellId(null)}
                onClick={() => focusClusterCard(point.id)}
                aria-label="Locate cell in command center"
              />
            );
          })}
        </div>
        <div className="mt-2 flex justify-between font-mono text-[7px] text-white/50 uppercase font-bold">
          <span>Hover: Focus</span>
          <span>Click: Locate</span>
        </div>
      </div>

      {/* Command Center (The SLG Map) */}
      <div className="relative flex h-full flex-col rounded bg-white/[0.02] p-1.5 border border-white/5">
        <PanelCorner position="top-left" color="rgba(255,255,255,0.2)" />
        <PanelCorner position="top-right" color="rgba(255,255,255,0.2)" />
        <PanelCorner position="bottom-left" color="rgba(255,255,255,0.2)" />
        <PanelCorner position="bottom-right" color="rgba(255,255,255,0.2)" />
        <div
          className="grid gap-2 overflow-y-auto pr-1 no-scrollbar"
          style={{
            gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
            alignContent: 'start',
          }}
        >
          {model.clusters.length ? (
            model.clusters.map((cluster) => {
              const activeSessions = cluster.sessions.filter((session) => !session.isOffline);
              const offlineSessions = cluster.sessions.filter((session) => session.isOffline);
              return (
                <TacticalFrame
                  key={cluster.cell.id}
                  title={cluster.cell.name || cluster.cell.id}
                  subTitle={cluster.typeLabel}
                  color={cluster.color}
                  isHovered={hoveredCellId === cluster.cell.id}
                  minHeight={124}
                  actions={
                    canCreateSession ? (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          onOpenCreateMenu(event.currentTarget, cluster.cell);
                        }}
                        className="flex h-5 w-5 items-center justify-center rounded border border-white/20 bg-black/40 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
                        title="Create session"
                        data-session-create-anchor="true"
                      >
                        <Plus size={12} />
                      </button>
                    ) : null
                  }
                >
                  <div
                    ref={(node) => registerClusterRef(cluster.cell.id, node)}
                    onMouseEnter={() => setHoveredCellId(cluster.cell.id)}
                    onMouseLeave={() => setHoveredCellId(null)}
                    className={`flex w-full flex-wrap gap-1.5 ${cluster.isOffline ? 'opacity-60' : ''}`}
                  >
                    {activeSessions.length ? (
                      activeSessions.map((session) => {
                        const isActive = session.isActive;
                        const isClosed = session.isOffline;
                        return (
                          <button
                            key={session.id}
                            type="button"
                            className={`group/token relative flex h-10 w-10 items-center justify-center rounded transition-all duration-300 shadow-lg ${
                              isActive
                                ? 'bg-primary/40 ring-1 ring-primary/60 scale-110 z-10 shadow-primary/20'
                                : 'bg-white/5 border border-white/5 hover:bg-white/15 hover:border-white/20 hover:scale-105'
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
                              size={32}
                              lastActivityAt={session.lastActivityAt}
                              isClosed={isClosed}
                            />
                            {isActive && (
                              <div className="absolute -inset-1 rounded border border-primary/30 animate-pulse pointer-events-none" />
                            )}
                          </button>
                        );
                      })
                    ) : (
                      <div className="flex w-full flex-col items-center justify-center py-4 opacity-20 text-white gap-1 font-mono text-[7px] tracking-tighter">
                        <CircleOff size={12} />
                        <span>OFFLINE</span>
                      </div>
                    )}
                    {offlineSessions.length ? (
                      <button
                        type="button"
                        className="flex h-8.5 w-8.5 items-center justify-center rounded bg-white/5 border border-dashed border-white/10 text-[9px] text-white/30 transition-all hover:bg-white/10 hover:text-white/70 hover:border-white/20"
                        onClick={(event) =>
                          onOpenOfflineMenu(event.currentTarget, cluster.cell, offlineSessions)
                        }
                        data-session-map-offline-trigger="true"
                      >
                        <MoreHorizontal size={14} />
                      </button>
                    ) : null}
                  </div>
                </TacticalFrame>
              );
            })
          ) : (
            <div className="flex h-full items-center justify-center font-mono text-[10px] text-white/20 font-black tracking-[0.2em] py-24">
              [ SCANNING_FOR_ACTIVE_SECTORS... ]
            </div>
          )}
        </div>
      </div>

      {/* Focus / Info Panel */}
      <div className="relative flex h-full flex-col rounded bg-white/[0.05] p-2">
        <PanelCorner position="top-left" color="rgba(255,255,255,0.3)" />
        <PanelCorner position="bottom-right" color="rgba(255,255,255,0.3)" />
        <div className="font-mono text-[8px] font-bold uppercase tracking-widest text-white/60">
          <span>Unit Details</span>
        </div>
        <div className="mt-3 flex-1 overflow-hidden">
          {focusData ? (
            <div className="flex flex-col h-full">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <AgentAvatarBadge
                    avatarId={resolveSessionAvatarId(focusData.session, focusData.cell)}
                    size={48}
                    lastActivityAt={focusData.session?.lastActivityAt}
                    isClosed={focusData.session?.isOffline}
                  />
                </div>
                <div className="min-w-0">
                  <div className="truncate font-mono text-[11px] font-bold text-white">
                    {focusData.session?.name || focusData.session?.id || 'UNTITLED'}
                  </div>
                  <div className="truncate text-[9px] text-white/60 font-bold uppercase">
                    {focusData.cell?.name || focusData.cell?.id || 'UNKNOWN'} // {focusData.typeLabel}
                  </div>
                </div>
              </div>
              <div className="mt-3 space-y-1.5 border-t border-white/10 pt-2 font-mono text-[8px]">
                <div className="flex justify-between">
                  <span className="text-white/40 font-bold">STATUS</span>
                  <span className="text-white/80 font-bold">{focusData.session?.status?.toUpperCase() || 'UNKNOWN'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/40 font-bold">LAST_ACT</span>
                  <span className="text-white/80 font-bold">
                    {focusData.session?.lastActivityAt ? formatRelativeTime(focusData.session.lastActivityAt).toUpperCase() : 'NONE'}
                  </span>
                </div>
              </div>
              <div className="mt-auto rounded border border-white/10 bg-black/40 p-2 text-[7px] leading-tight text-white/50 font-medium">
                SYSTEM READY. HOVER TOKEN TO PREVIEW TERMINAL STREAM. CLICK TO ESTABLISH CONNECTION.
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center font-mono text-[8px] text-white/20 uppercase font-bold">
              No unit in focus
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
