import React from 'react';
import { CircleOff, MoreHorizontal, Plus } from 'lucide-react';
import { AgentAvatarBadge } from '../ui/AgentAvatarBadge';
import { resolveSessionAvatarId } from '../../utils/agentAvatar';
import { TacticalFrame } from './SessionMapFrames';
import { SessionMapOperationsRail } from './SessionMapOperationsRail';

const radarGridAsset = new URL('../../assets/session-map-radar-grid.svg', import.meta.url).href;

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
  focusedRunId = '',
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
  cellAttentionById,
  sessionAttentionByKey,
}: any) {
  const dockGridTemplateColumns = '268px minmax(0,1.48fr) minmax(392px,0.98fr)';
  const [intelPanelId, setIntelPanelId] = React.useState('hover-target');
  const [hoveredIntelId, setHoveredIntelId] = React.useState('');
  const hoveredRadarPoint = radarPoints.find((point: any) => point.id === hoveredCellId) || null;
  const infoCards = [
    {
      id: 'focus-cell',
      title: 'Cell',
      value: focusData?.cell?.name || 'No focus',
      detail: focusData?.cell?.id || 'No focused Cell selected',
      panelTitle: 'Focused Cell',
      panelBody: focusData?.cell?.id
        ? `Current tactical focus is Cell ${focusData.cell.name || focusData.cell.id}. Use the command center to jump into one of its live session lanes.`
        : 'No focused Cell is currently bound to the Session Interface.',
    },
    {
      id: 'focus-session',
      title: 'Session',
      value: focusData?.session?.name || 'No focus',
      detail: focusData?.session?.status || 'No focused session selected',
      panelTitle: 'Focused Session',
      panelBody: focusData?.session?.id
        ? `Focused session ${focusData.session.name || focusData.session.id} is the active tactical lane for hover previews, Ops evidence, and Commander context.`
        : 'No focused session is currently active in the tactical interface.',
    },
    {
      id: 'hover-target',
      title: 'Hover',
      value: hoveredRadarPoint?.cell?.name || 'Radar idle',
      detail: hoveredRadarPoint
        ? hoveredRadarPoint.isGhost
          ? `Ghost · ${hoveredRadarPoint.sessionCount} session${hoveredRadarPoint.sessionCount === 1 ? '' : 's'}`
          : `Live · ${hoveredRadarPoint.activeSessionCount} online`
        : 'Hover a sector for details',
      panelTitle: hoveredRadarPoint?.isGhost ? 'Ghost Sector' : 'Hovered Sector',
      panelBody: hoveredRadarPoint
        ? hoveredRadarPoint.isGhost
          ? `${hoveredRadarPoint.cell?.name || hoveredRadarPoint.id} is preserved only as radar residue. It stays out of the Cells command center while still exposing retained session evidence in radar intel.`
          : `${hoveredRadarPoint.cell?.name || hoveredRadarPoint.id} is live in the command center with ${hoveredRadarPoint.activeSessionCount} active lane(s). Click the radar point to locate the cluster.`
        : 'Hover any radar point to preview whether that sector is live or ghosted.',
    },
    {
      id: 'ops',
      title: 'Ops',
      value: focusData?.session?.name || 'No evidence',
      detail: focusedRunId ? `Focused run ${focusedRunId}` : 'Follow the focused session or evidence rail',
      panelTitle: 'Ops Evidence',
      panelBody: focusedRunId
        ? `Ops is pinned to run ${focusedRunId}. Use the right station for evidence, failure review, and bounded follow-up actions.`
        : 'Ops evidence follows the focused session when no specific run is pinned.',
    },
  ];
  const activeIntelCard = infoCards.find((card) => card.id === (hoveredIntelId || intelPanelId)) || infoCards[0];

  return (
    <div
      className="mt-1.5 grid min-h-0 flex-1 gap-1.5 overflow-hidden"
      style={{
        gridTemplateColumns: dockGridTemplateColumns,
      }}
    >
      {/* Radar Section */}
      <div
        className="group flex h-full min-h-0 flex-col overflow-hidden rounded-2xl bg-[linear-gradient(180deg,rgba(14,20,28,0.9),rgba(8,12,17,0.94))] px-3 py-3 shadow-[inset_0_0_0_1px_rgba(125,211,252,0.05),0_8px_18px_rgba(0,0,0,0.18)] transition-colors hover:bg-[linear-gradient(180deg,rgba(18,25,34,0.94),rgba(8,12,17,0.96))]"
        onMouseLeave={() => setHoveredCellId(null)}
      >
        <div className="flex items-center justify-between font-mono text-[7px] font-bold uppercase tracking-[0.2em] text-cyan-100/54">
          <span>Radar</span>
        </div>
        <div className="mt-2 grid min-h-0 flex-1 grid-cols-[152px_minmax(0,1fr)] gap-3">
          <div className="relative aspect-square overflow-hidden rounded-[24px] bg-[radial-gradient(circle_at_50%_45%,rgba(12,20,28,0.86),rgba(4,7,10,0.98))] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04),inset_0_0_40px_rgba(34,211,238,0.06)]">
            <img
              src={radarGridAsset}
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-55"
            />
            <div
              className="absolute inset-0 animate-spin-slow opacity-[0.18]"
              style={{
                background: 'conic-gradient(from 0deg, transparent 0%, rgba(56,189,248,0.28) 100%)',
              }}
            />

            {radarPoints.map((point: any) => {
              const isHovered = hoveredCellId === point.id;
              const pointSize = point.isGhost ? 7 : 10;
              return (
                <button
                  key={point.id}
                  type="button"
                  className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-300 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 ${
                    isHovered ? 'z-20 scale-150' : 'z-10'
                  }`}
                  style={{
                    left: `${point.x}%`,
                    top: `${point.y}%`,
                    width: `${pointSize}px`,
                    height: `${pointSize}px`,
                    backgroundColor: point.color,
                    opacity: point.isGhost ? 0.4 : 1,
                    boxShadow: isHovered ? `0 0 8px ${point.color}` : `0 0 3px ${point.color}`,
                    border: point.isGhost ? '1px solid rgba(255,255,255,0.12)' : '1.5px solid rgba(255,255,255,0.18)',
                  }}
                  onMouseEnter={() => setHoveredCellId(point.id)}
                  onMouseLeave={() => setHoveredCellId(null)}
                  onClick={() => {
                    if (!point.isGhost) {
                      focusClusterCard(point.id);
                    } else {
                      setHoveredCellId(point.id);
                    }
                  }}
                  aria-label={`Locate ${point.id || 'cell'} in command center`}
                />
              );
            })}
          </div>

          <div className="flex min-h-0 flex-col gap-2">
            <div className="grid grid-cols-2 gap-2">
              {infoCards.map((card) => (
                <button
                  key={card.id}
                  type="button"
                  onMouseEnter={() => setHoveredIntelId(card.id)}
                  onMouseLeave={() => setHoveredIntelId('')}
                  onClick={() => {
                    setIntelPanelId(card.id);
                    if (card.id === 'hover-target' && hoveredRadarPoint && !hoveredRadarPoint.isGhost) {
                      focusClusterCard(hoveredRadarPoint.id);
                    }
                  }}
                  className={`flex aspect-square min-h-[68px] flex-col justify-between rounded-2xl border p-3 text-left transition-colors hover:border-cyan-300/20 hover:bg-cyan-500/[0.05] ${
                    intelPanelId === card.id
                      ? 'border-cyan-300/22 bg-cyan-500/[0.07]'
                      : 'border-white/[0.08] bg-white/[0.035]'
                  }`}
                >
                  <span className="text-[7px] font-bold uppercase tracking-[0.14em] text-cyan-100/54">
                    {card.title}
                  </span>
                  <span className="line-clamp-2 text-[11px] font-semibold leading-snug text-white/88">
                    {card.value}
                  </span>
                </button>
              ))}
            </div>

            <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-white/[0.08] bg-black/18 p-3">
              <div className="text-[7px] font-bold uppercase tracking-[0.14em] text-white/34">
                {activeIntelCard.panelTitle}
              </div>
              <div className="mt-2 text-[12px] font-semibold tracking-[0.01em] text-white/88">
                {activeIntelCard.value}
              </div>
              <div className="mt-1 text-[10px] leading-5 text-white/56">
                {activeIntelCard.panelBody}
              </div>
            </div>
          </div>
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
                    canCreateSession && cluster.cell?.attachedWorktreePath ? (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          onOpenCreateMenu(event.currentTarget, cluster.cell);
                        }}
                        className="flex h-4.5 w-4.5 items-center justify-center rounded border border-white/16 bg-black/36 text-white/55 transition-colors hover:bg-white/10 hover:text-white"
                        title="Create session"
                        aria-label={`Create session in ${cluster.cell?.name || cluster.cell?.id || 'cell'}`}
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
                        aria-label={`Show offline sessions for ${cluster.cell?.name || cluster.cell?.id || 'cell'}`}
                      >
                        <MoreHorizontal size={14} />
                      </button>
                    ) : null}
                  </div>
                </TacticalFrame>
              );
            })
          ) : (
            <div className="flex h-full items-center justify-center py-24 text-center font-mono text-[10px] font-black tracking-[0.18em] text-white/24">
              {model.ghostClusters?.length ? '[ LIVE COMMAND CENTER CLEAR | RADAR GHOSTS RETAINED ]' : '[ SCANNING_FOR_ACTIVE_SECTORS... ]'}
            </div>
          )}
        </div>
      </div>

      {/* Ops Evidence */}
      <SessionMapOperationsRail
        focusData={focusData}
        focusedRunId={focusedRunId}
        harnessRuns={harnessRuns}
        sessionError={sessionError}
        onClearSessionError={onClearSessionError}
        onCancelHarnessRun={onCancelHarnessRun}
        onResumeHarnessRun={onResumeHarnessRun}
      />
    </div>
  );
}
