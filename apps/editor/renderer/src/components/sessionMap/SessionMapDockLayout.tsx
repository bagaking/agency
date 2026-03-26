import React from 'react';
import { CircleOff, MoreHorizontal, Plus } from 'lucide-react';
import { AgentAvatarBadge } from '../ui/AgentAvatarBadge';
import { resolveSessionAvatarId } from '../../utils/agentAvatar';
import { TacticalFrame } from './SessionMapFrames';
import { SessionMapCommanderPanel } from './SessionMapCommanderPanel';
import { SessionMapOperationsRail } from './SessionMapOperationsRail';

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
  harnessRuns,
  sessionError,
  onClearSessionError,
  onCancelHarnessRun,
  onOpenCommanderDialog,
  commanderDialogOpen = false,
  commanderTriggerRef,
}: any) {
  return (
    <div
      className="mt-1.5 grid min-h-0 flex-1 gap-1.5 overflow-hidden"
      style={{
        gridTemplateColumns: '104px minmax(340px, 1.55fr) 104px minmax(280px, 0.95fr)',
      }}
    >
      {/* Radar Section */}
      <div
        className="group flex h-full min-h-0 flex-col overflow-hidden rounded-2xl bg-[linear-gradient(180deg,rgba(14,20,28,0.94),rgba(8,12,17,0.96))] px-2.5 py-2 shadow-[inset_0_0_0_1px_rgba(125,211,252,0.08),0_10px_24px_rgba(0,0,0,0.22)] transition-colors hover:bg-[linear-gradient(180deg,rgba(18,25,34,0.96),rgba(8,12,17,0.98))]"
        onMouseLeave={() => setHoveredCellId(null)}
      >
        <div className="flex items-center justify-between font-mono text-[7px] font-bold uppercase tracking-[0.2em] text-cyan-100/54">
          <span>Radar</span>
        </div>
        <div className="relative mt-1.5 aspect-square flex-1 overflow-hidden rounded-[22px] bg-[radial-gradient(circle_at_50%_45%,rgba(12,20,28,0.86),rgba(4,7,10,0.98))] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04),inset_0_0_40px_rgba(34,211,238,0.06)]">
          {/* Radar Grid */}
          <div className="absolute inset-0 opacity-30" style={{
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.08) 1px, transparent 1px), repeating-radial-gradient(circle, transparent 0, transparent 20px, rgba(125,211,252,0.08) 20px, rgba(125,211,252,0.08) 21px)',
            backgroundSize: '10px 10px, 100% 100%',
          }} />
          {/* Radar Sweep */}
          <div className="absolute inset-0 animate-spin-slow opacity-30" style={{
            background: 'conic-gradient(from 0deg, transparent 0%, rgba(56,189,248,0.44) 100%)',
          }} />
          {/* Radar Crosshair */}
          <div className="absolute left-1/2 top-3 bottom-3 w-px -translate-x-1/2 bg-cyan-100/8" />
          <div className="absolute left-3 right-3 top-1/2 h-px -translate-y-1/2 bg-cyan-100/8" />

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
                  boxShadow: isHovered ? `0 0 12px ${point.color}` : `0 0 5px ${point.color}`,
                  border: '1.5px solid rgba(255,255,255,0.18)',
                }}
                onMouseEnter={() => setHoveredCellId(point.id)}
                onMouseLeave={() => setHoveredCellId(null)}
                onClick={() => focusClusterCard(point.id)}
                aria-label="Locate cell in command center"
              />
            );
          })}
        </div>
        <div className="mt-1.5 flex justify-between font-mono text-[6px] font-bold uppercase text-cyan-100/28">
          <span>Focus</span>
          <span>Locate</span>
        </div>
      </div>

      {/* Command Center (Cells) */}
      <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl bg-[linear-gradient(180deg,rgba(18,23,31,0.95),rgba(9,12,18,0.96))] px-2.5 py-2 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.045),0_10px_24px_rgba(0,0,0,0.22)]">
        <div className="mb-1.5 font-mono text-[7px] font-bold uppercase tracking-[0.2em] text-white/48">
          Cells
        </div>
        <div
          className="grid min-h-0 flex-1 gap-1.5 overflow-y-auto pr-1 no-scrollbar"
          style={{
            gridTemplateColumns: '1fr',
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
                  minHeight={110}
                  actions={
                    canCreateSession ? (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          onOpenCreateMenu(event.currentTarget, cluster.cell);
                        }}
                        className="flex h-4.5 w-4.5 items-center justify-center rounded border border-white/16 bg-black/36 text-white/55 transition-colors hover:bg-white/10 hover:text-white"
                        title="Create session"
                        data-session-create-anchor="true"
                      >
                        <Plus size={11} />
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
                            className={`group/token relative flex h-9 w-9 items-center justify-center rounded-lg transition-all duration-300 shadow-lg ${
                              isActive
                                ? 'bg-primary/32 ring-1 ring-primary/45 scale-110 z-10 shadow-primary/20'
                                : 'bg-white/[0.04] border border-white/8 hover:bg-white/[0.12] hover:border-white/20 hover:scale-105'
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
                              size={28}
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
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-dashed border-white/10 bg-white/[0.04] text-[8px] text-white/28 transition-all hover:bg-white/[0.1] hover:text-white/70 hover:border-white/18"
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

      {/* Commander */}
      <SessionMapCommanderPanel
        harnessRuns={harnessRuns}
        dialogOpen={commanderDialogOpen}
        onOpenDialog={onOpenCommanderDialog}
        buttonRef={commanderTriggerRef}
      />

      {/* Functional Area */}
      <SessionMapOperationsRail
        focusData={focusData}
        harnessRuns={harnessRuns}
        sessionError={sessionError}
        onClearSessionError={onClearSessionError}
        onCancelHarnessRun={onCancelHarnessRun}
      />
    </div>
  );
}
