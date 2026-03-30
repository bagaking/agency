import React from 'react';
import { CircleOff, MoreHorizontal, Plus } from 'lucide-react';
import { AgentAvatarBadge } from '../ui/AgentAvatarBadge';
import { resolveSessionAvatarId } from '../../utils/agentAvatar';
import { TacticalFrame } from './SessionMapFrames';
import { SessionMapRightStation } from './SessionMapRightStation';

const CELL_CARD_MIN_WIDTH = 248;
const CELL_CARD_MAX_WIDTH = 396;

function resolveCellAttentionClass(item: any): string {
  switch (item?.kind) {
    case 'failed':
      return 'ring-1 ring-rose-300/24 shadow-[0_0_0_1px_rgba(251,113,133,0.12),0_14px_28px_rgba(127,29,29,0.18)]';
    case 'pending_confirmation':
      return 'ring-1 ring-amber-300/20 shadow-[0_0_0_1px_rgba(251,191,36,0.1),0_14px_28px_rgba(120,53,15,0.16)]';
    case 'return_required':
      return 'ring-1 ring-cyan-300/20 shadow-[0_0_0_1px_rgba(34,211,238,0.1),0_14px_28px_rgba(8,47,73,0.18)]';
    case 'running':
      return 'ring-1 ring-sky-300/18 shadow-[0_0_0_1px_rgba(56,189,248,0.08),0_14px_28px_rgba(12,74,110,0.16)]';
    case 'unread':
      return 'ring-1 ring-white/[0.08]';
    default:
      return '';
  }
}

function resolveTokenAttentionClass(item: any): string {
  switch (item?.kind) {
    case 'failed':
      return 'shadow-[0_0_0_1px_rgba(251,113,133,0.2),0_0_16px_rgba(244,63,94,0.16)]';
    case 'pending_confirmation':
      return 'shadow-[0_0_0_1px_rgba(251,191,36,0.18),0_0_16px_rgba(251,191,36,0.14)]';
    case 'return_required':
      return 'shadow-[0_0_0_1px_rgba(34,211,238,0.18),0_0_16px_rgba(34,211,238,0.16)]';
    case 'running':
      return 'shadow-[0_0_0_1px_rgba(56,189,248,0.16),0_0_14px_rgba(56,189,248,0.16)]';
    case 'unread':
      return 'shadow-[0_0_0_1px_rgba(255,255,255,0.08)]';
    default:
      return '';
  }
}

function SessionTokenButton({
  session,
  cluster,
  onSelectSession,
  onTokenEnter,
  onTokenLeave,
  attentionItem,
}: any) {
  const isActive = session.isActive;
  const isClosed = session.isOffline;

  return (
    <button
      type="button"
      className={`group/token relative flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/55 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b1118] ${
        isActive
          ? 'z-10 scale-[1.08] bg-[linear-gradient(180deg,rgba(34,211,238,0.24),rgba(24,36,50,0.92))] shadow-[0_0_0_1px_rgba(34,211,238,0.58),0_0_18px_rgba(34,211,238,0.28)]'
          : `bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(9,13,18,0.96))] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)] hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(15,20,28,0.98))] hover:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)] ${resolveTokenAttentionClass(attentionItem)}`
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
      onFocus={(event) =>
        onTokenEnter(
          event,
          {
            cell: cluster.cell,
            session,
            color: cluster.color,
            typeLabel: cluster.typeLabel,
          },
          { immediate: true }
        )
      }
      onBlur={onTokenLeave}
      aria-pressed={isActive}
      aria-label={`Session ${session.name || session.id}`}
      data-session-token="true"
      data-session-attention={attentionItem ? attentionItem.kind : ''}
    >
      <AgentAvatarBadge
        avatarId={resolveSessionAvatarId(session, cluster.cell)}
        size={24}
        ringSize={isActive ? 30 : 28}
        lastActivityAt={session.lastActivityAt}
        isClosed={isClosed}
        ringClassName={isActive ? 'shadow-[0_0_10px_rgba(34,211,238,0.25)]' : ''}
      />
      {isActive ? (
        <>
          <div className="pointer-events-none absolute -inset-1 rounded-[14px] border border-cyan-300/55" />
          <div className="pointer-events-none absolute -bottom-1 h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_8px_rgba(34,211,238,0.75)]" />
        </>
      ) : null}
      {attentionItem && !isActive ? (
        <div className="pointer-events-none absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full border border-[#0b1118] bg-white/80" />
      ) : null}
    </button>
  );
}

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
  onResumeHarnessRun,
  onOpenCommanderBriefing,
  onCloseCommanderBriefing,
  commanderBriefingOpen = false,
  commanderTriggerRef,
  attentionItems,
  cellAttentionById,
  sessionAttentionByKey,
  onSelectAttention,
}: any) {
  const dockGridTemplateColumns = '92px minmax(0,1.58fr) minmax(400px,1.02fr)';

  return (
    <div
      className="mt-1.5 grid min-h-0 flex-1 gap-1.5 overflow-hidden"
      style={{
        gridTemplateColumns: dockGridTemplateColumns,
      }}
    >
      {/* Radar Section */}
      <div
        className="group flex h-full min-h-0 flex-col overflow-hidden rounded-2xl bg-[linear-gradient(180deg,rgba(14,20,28,0.9),rgba(8,12,17,0.94))] px-2.5 py-2 shadow-[inset_0_0_0_1px_rgba(125,211,252,0.05),0_8px_18px_rgba(0,0,0,0.18)] transition-colors hover:bg-[linear-gradient(180deg,rgba(18,25,34,0.94),rgba(8,12,17,0.96))]"
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
          <div className="absolute inset-0 animate-spin-slow opacity-[0.18]" style={{
            background: 'conic-gradient(from 0deg, transparent 0%, rgba(56,189,248,0.28) 100%)',
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
                  boxShadow: isHovered ? `0 0 8px ${point.color}` : `0 0 3px ${point.color}`,
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
          className="flex min-h-0 flex-1 flex-wrap content-start gap-1.5 overflow-y-auto pr-1 no-scrollbar"
          style={{
            alignContent: 'flex-start',
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
                  minHeight={96}
                  className={`min-w-[248px] max-w-[396px] flex-[1_1_320px] ${resolveCellAttentionClass(cellAttentionById?.[cluster.cell.id]?.strongest)}`}
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
                    className={`flex w-full flex-wrap items-start gap-1.5 ${cluster.isOffline ? 'opacity-60' : ''}`}
                    style={{
                      minWidth: `${CELL_CARD_MIN_WIDTH}px`,
                      maxWidth: `${CELL_CARD_MAX_WIDTH}px`,
                    }}
                  >
                    {activeSessions.length ? (
                      activeSessions.map((session) => {
                        const sessionAttention =
                          sessionAttentionByKey?.[`${cluster.cell.id}:${session.id}`] || null;
                        return (
                          <SessionTokenButton
                            key={session.id}
                            session={session}
                            cluster={cluster}
                            onSelectSession={onSelectSession}
                            onTokenEnter={onTokenEnter}
                            onTokenLeave={onTokenLeave}
                            attentionItem={sessionAttention}
                          />
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
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/[0.03] text-[8px] text-white/28 transition-all hover:bg-white/[0.08] hover:text-white/70 hover:border-white/18"
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

      {/* Right Station */}
        <SessionMapRightStation
          focusData={focusData}
          attentionItems={attentionItems}
          harnessRuns={harnessRuns}
        sessionError={sessionError}
        onClearSessionError={onClearSessionError}
        onCancelHarnessRun={onCancelHarnessRun}
        onResumeHarnessRun={onResumeHarnessRun}
          onSelectAttention={onSelectAttention}
          commanderBriefingOpen={commanderBriefingOpen}
          onOpenCommanderBriefing={onOpenCommanderBriefing}
          onCloseCommanderBriefing={onCloseCommanderBriefing}
          commanderTriggerRef={commanderTriggerRef}
      />
    </div>
  );
}
