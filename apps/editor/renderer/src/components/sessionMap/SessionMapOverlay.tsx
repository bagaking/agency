import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Map as MapIcon, X } from 'lucide-react';
import { SessionCreateMenu } from '../SessionMenus';
import { AvatarPickerMenu } from '../ui/AvatarPickerMenu';
import { resolveSessionAvatarId } from '../../utils/agentAvatar';
import { DEBUG_FLAGS, getDebugFlag } from '../../utils/debugFlags';
import { SessionMapDockLayout } from './SessionMapDockLayout';
import { SessionMapGridLayout } from './SessionMapGridLayout';
import { SessionMapHoverCard } from './SessionMapHoverCard';
import { SessionMapOfflineMenu } from './SessionMapOfflineMenu';
import {
  HUD_FIXED_HEIGHT,
  HOVER_CLOSE_DELAY,
  HOVER_OPEN_DELAY,
  ROW_TOP_TOLERANCE,
} from './sessionMapConstants';
import { hashSeed } from './sessionMapUtils';
import { logRuntime } from '../../services/agencyBridge';

export function SessionMapOverlay({
  open,
  model,
  onSelectSession,
  onClose,
  resolveFontSize,
  terminusProfiles,
  onCreateSession,
  onDispatchCommand,
  onRenameSession,
  onUpdateSessionAvatar,
  onOpenFileShortcut,
  onRevealFileShortcut,
  harnessRuns,
  sessionError,
  onClearSessionError,
  onCancelHarnessRun,
  mode = 'popover',
}: any) {
  const [hovered, setHovered] = useState(null);
  const [hoveredCellId, setHoveredCellId] = useState(null);
  const lastHoveredRef = useRef(null);
  const [offlineMenu, setOfflineMenu] = useState(null);
  const [createMenu, setCreateMenu] = useState(null);
  const [avatarMenu, setAvatarMenu] = useState(null);
  const hoverLockRef = useRef(false);
  const clearTimerRef = useRef(null);
  const openTimerRef = useRef(null);
  const overlayRef = useRef(null);
  const hoverCardRef = useRef(null);
  const clusterRefs = useRef({});
  const offlineMenuRef = useRef(null);
  const createMenuRef = useRef(null);
  const avatarMenuRef = useRef(null);
  const isDocked = mode === 'dock';
  const isDebugEnabled = useCallback(() => getDebugFlag(DEBUG_FLAGS.sessionMapPreview), []);
  const logDebug = useCallback(
    (label, payload = {}) => {
      if (!isDebugEnabled()) {
        return;
      }
      console.log(`[SessionMapHover] ${label}`, payload);
      logRuntime({
        level: 'info',
        message: `SessionMapHover:${label}`,
        meta: payload,
      });
    },
    [isDebugEnabled]
  );

  const activeAvatarIds = useMemo(() => {
    const ids = new Set();
    if (!model?.clusters?.length) {
      return ids;
    }
    model.clusters.forEach((cluster) => {
      cluster.sessions.forEach((session) => {
        if (!session || !['active', 'detached'].includes(session.status)) {
          return;
        }
        const resolved = resolveSessionAvatarId(session, cluster.cell);
        if (resolved) {
          ids.add(resolved);
        }
      });
    });
    return ids;
  }, [model]);

  const hudTokens = useMemo(() => {
    if (!model?.clusters?.length) {
      return [];
    }
    const tokens = [];
    model.clusters.forEach((cluster) => {
      cluster.sessions.forEach((session) => {
        tokens.push({
          cell: cluster.cell,
          session,
          color: cluster.color,
          typeLabel: cluster.typeLabel,
        });
      });
    });
    return tokens;
  }, [model]);

  const defaultFocus = useMemo(() => {
    if (!hudTokens.length) {
      return null;
    }
    const active = hudTokens.find((item) => item.session?.isActive);
    if (active) {
      return active;
    }
    const online = hudTokens.find((item) => !item.session?.isOffline);
    return online || hudTokens[0];
  }, [hudTokens]);

  const radarPoints = useMemo(() => {
    if (!model?.clusters?.length) {
      return [];
    }
    return model.clusters.map((cluster, index) => {
      const seed = hashSeed(cluster.cell?.id || cluster.cell?.name || index);
      const angle = (seed % 360) * (Math.PI / 180);
      const radius = 10 + (seed % 38);
      const x = 50 + radius * Math.cos(angle);
      const y = 50 + radius * Math.sin(angle);
      return {
        id: cluster.cell?.id || String(index),
        x,
        y,
        color: cluster.color,
      };
    });
  }, [model]);

  const focusData = hovered || defaultFocus;
  const canCreateSession = Boolean(
    onCreateSession || (onDispatchCommand && (terminusProfiles || []).length > 0)
  );

  const registerClusterRef = useCallback((clusterId, node) => {
    if (!clusterId) {
      return;
    }
    if (node) {
      clusterRefs.current[clusterId] = node;
    } else {
      delete clusterRefs.current[clusterId];
    }
  }, []);

  useEffect(() => {
    if (!hovered || !model?.clusters?.length) {
      return;
    }
    const cellId = hovered.cell?.id;
    const sessionId = hovered.session?.id;
    if (!cellId || !sessionId) {
      return;
    }
    const cluster = model.clusters.find((item) => item.cell?.id === cellId);
    const nextSession = cluster?.sessions?.find((item) => item.id === sessionId);
    if (!cluster || !nextSession) {
      return;
    }
    const needsRefresh =
      hovered.session?.name !== nextSession.name ||
      hovered.session?.status !== nextSession.status ||
      hovered.session?.avatar !== nextSession.avatar ||
      hovered.session?.isOffline !== nextSession.isOffline ||
      hovered.session?.lastActivityAt !== nextSession.lastActivityAt ||
      hovered.session?.lastVisitedAt !== nextSession.lastVisitedAt ||
      hovered.cell?.name !== cluster.cell?.name;
    if (!needsRefresh) {
      return;
    }
    setHovered((current) => {
      if (!current) {
        return current;
      }
      return {
        ...current,
        cell: cluster.cell,
        session: nextSession,
      };
    });
  }, [hovered, model]);

  const clearHover = useCallback(() => {
    if (clearTimerRef.current) {
      clearTimeout(clearTimerRef.current);
    }
    if (openTimerRef.current) {
      clearTimeout(openTimerRef.current);
    }
    clearTimerRef.current = null;
    openTimerRef.current = null;
    setHovered(null);
  }, []);

  const focusClusterCard = useCallback((clusterId) => {
    if (!clusterId) {
      return;
    }
    setHoveredCellId(clusterId);
    const target = clusterRefs.current?.[clusterId];
    if (target?.scrollIntoView) {
      target.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
    }
  }, []);

  const scheduleClear = useCallback(() => {
    if (clearTimerRef.current) {
      clearTimeout(clearTimerRef.current);
    }
    if (openTimerRef.current) {
      clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
    logDebug('schedule-clear', {
      cellId: hovered?.cell?.id,
      sessionId: hovered?.session?.id,
    });
    clearTimerRef.current = setTimeout(() => {
      if (!hoverLockRef.current) {
        logDebug('clear-timeout', {
          cellId: hovered?.cell?.id,
          sessionId: hovered?.session?.id,
        });
        setHovered(null);
      }
    }, HOVER_CLOSE_DELAY);
  }, [hovered, logDebug]);

  useEffect(() => () => clearHover(), [clearHover]);

  useEffect(() => {
    if (open) {
      return;
    }
    setHovered(null);
    setAvatarMenu(null);
    setCreateMenu(null);
    setOfflineMenu(null);
  }, [open]);

  useEffect(() => {
    if (!createMenu) {
      return undefined;
    }
    const handlePointer = (event) => {
      if (createMenuRef.current?.contains(event.target)) {
        return;
      }
      if (event.target?.closest?.('[data-session-create-anchor="true"]')) {
        return;
      }
      setCreateMenu(null);
    };
    window.addEventListener('mousedown', handlePointer);
    return () => window.removeEventListener('mousedown', handlePointer);
  }, [createMenu]);

  useEffect(() => {
    if (!avatarMenu) {
      return undefined;
    }
    const handlePointer = (event) => {
      if (avatarMenuRef.current?.contains(event.target)) {
        return;
      }
      if (event.target?.closest?.('[data-session-avatar-anchor="true"]')) {
        return;
      }
      setAvatarMenu(null);
    };
    window.addEventListener('mousedown', handlePointer);
    return () => window.removeEventListener('mousedown', handlePointer);
  }, [avatarMenu]);

  useEffect(() => {
    if (!avatarMenu) {
      hoverLockRef.current = false;
    }
  }, [avatarMenu]);

  useEffect(() => {
    if (!open) {
      setOfflineMenu(null);
      setHoveredCellId(null);
    }
  }, [open]);

  useEffect(() => {
    if (!offlineMenu) {
      return undefined;
    }
    const handlePointerDown = (event) => {
      if (offlineMenuRef.current?.contains(event.target)) {
        return;
      }
      if (event.target.closest?.('[data-session-map-offline-trigger="true"]')) {
        return;
      }
      setOfflineMenu(null);
    };
    window.addEventListener('mousedown', handlePointerDown);
    return () => window.removeEventListener('mousedown', handlePointerDown);
  }, [offlineMenu]);

  const handleTokenEnter = useCallback((event, payload, { immediate = false }: any = {}) => {
    if (!event?.currentTarget) {
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    if (clearTimerRef.current) {
      clearTimeout(clearTimerRef.current);
    }
    if (openTimerRef.current) {
      clearTimeout(openTimerRef.current);
    }
    const next = { ...payload, anchorRect: rect, anchorEl: event.currentTarget };
    if (immediate) {
      logDebug('enter-immediate', {
        cellId: payload?.cell?.id,
        sessionId: payload?.session?.id,
      });
      setHovered(next);
      return;
    }
    openTimerRef.current = setTimeout(() => {
      logDebug('enter-delayed', {
        cellId: payload?.cell?.id,
        sessionId: payload?.session?.id,
      });
      setHovered(next);
      openTimerRef.current = null;
    }, HOVER_OPEN_DELAY);
  }, [logDebug]);

  const handleTokenLeave = useCallback(() => {
    if (openTimerRef.current) {
      clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
    if (!hoverLockRef.current) {
      logDebug('leave', {
        cellId: hovered?.cell?.id,
        sessionId: hovered?.session?.id,
      });
      scheduleClear();
    }
  }, [hovered, logDebug, scheduleClear]);

  const handleCardEnter = useCallback(() => {
    hoverLockRef.current = true;
    if (clearTimerRef.current) {
      clearTimeout(clearTimerRef.current);
    }
    logDebug('card-enter', {
      cellId: hovered?.cell?.id,
      sessionId: hovered?.session?.id,
    });
  }, [hovered, logDebug]);

  const handleCardLeave = useCallback(() => {
    if (avatarMenu) {
      return;
    }
    hoverLockRef.current = false;
    logDebug('card-leave', {
      cellId: hovered?.cell?.id,
      sessionId: hovered?.session?.id,
    });
    clearHover();
  }, [avatarMenu, clearHover, hovered, logDebug]);

  const handleSelectAndClose = useCallback(
    (cellId, sessionId) => {
      onSelectSession?.(cellId, sessionId, { focusView: true });
      onClose?.();
    },
    [onClose, onSelectSession]
  );

  const handleSelectSession = useCallback(
    (cellId, sessionId) => {
      onSelectSession?.(cellId, sessionId);
    },
    [onSelectSession]
  );

  const handleOpenAvatarMenu = useCallback((anchor, cell, session) => {
    if (!anchor || !cell || !session) {
      return;
    }
    hoverLockRef.current = true;
    const rect = anchor.getBoundingClientRect();
    setAvatarMenu({
      x: rect.left,
      y: rect.bottom + 6,
      cell,
      session,
    });
  }, []);

  const handleOpenCreateMenu = useCallback((anchor, cell) => {
    if (!anchor || !cell) {
      return;
    }
    const rect = anchor.getBoundingClientRect();
    setCreateMenu({
      x: rect.left,
      y: rect.bottom + 6,
      cell,
    });
  }, []);

  const handleOpenOfflineMenu = useCallback((anchor, cell, sessions) => {
    if (!anchor || !cell || !sessions?.length) {
      return;
    }
    const rect = anchor.getBoundingClientRect();
    setOfflineMenu({
      cellId: cell.id,
      cell,
      sessions,
      anchorRect: rect,
      x: rect.left,
      y: rect.bottom + 4,
    });
  }, []);

  useEffect(() => {
    if (!open || !onClose || isDocked) {
      return undefined;
    }
    const handlePointerDown = (event) => {
      const target = event.target;
      if (overlayRef.current?.contains(target)) {
        return;
      }
      if (hoverCardRef.current?.contains(target)) {
        return;
      }
      if (target?.closest?.('[data-session-map-toggle="true"]')) {
        return;
      }
      onClose();
    };
    window.addEventListener('pointerdown', handlePointerDown);
    return () => window.removeEventListener('pointerdown', handlePointerDown);
  }, [isDocked, onClose, open]);

  useEffect(() => {
    if (!open || !onClose) {
      return undefined;
    }
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) {
        return;
      }
      const activeElement = document.activeElement as HTMLElement | null;
      if (
        !overlayRef.current?.contains(activeElement) &&
        !hoverCardRef.current?.contains(activeElement)
      ) {
        return;
      }
      if (
        activeElement &&
        (activeElement.tagName === 'INPUT' ||
          activeElement.tagName === 'TEXTAREA' ||
          activeElement.isContentEditable)
      ) {
        return;
      }
      const container = overlayRef.current;
      if (!container) {
        return;
      }
      const tokens = Array.from(container.querySelectorAll('[data-session-token="true"]')) as HTMLElement[];
      if (!tokens.length) {
        return;
      }
      const activeIndex = tokens.indexOf(document.activeElement as HTMLElement);
      if (event.key === 'Home') {
        event.preventDefault();
        tokens[0]?.focus();
        return;
      }
      if (event.key === 'End') {
        event.preventDefault();
        tokens[tokens.length - 1]?.focus();
        return;
      }
      const resolvedIndex = activeIndex === -1 ? 0 : activeIndex;
      const rects = tokens.map((node) => ({
        node,
        rect: node.getBoundingClientRect(),
      }));
      const rows = [];
      rects.forEach((item) => {
        const top = Math.round(item.rect.top);
        const existing = rows.find((row) => Math.abs(row.top - top) <= ROW_TOP_TOLERANCE);
        if (existing) {
          existing.items.push(item);
        } else {
          rows.push({ top, items: [item] });
        }
      });
      rows.sort((a, b) => a.top - b.top);
      rows.forEach((row) => row.items.sort((a, b) => a.rect.left - b.rect.left));

      const activeNode = tokens[resolvedIndex];
      const activeRect = rects[resolvedIndex]?.rect;
      const rowIndex = rows.findIndex((row) => row.items.some((item) => item.node === activeNode));
      const currentRow = rowIndex >= 0 ? rows[rowIndex] : null;

      const focusNode = (node) => {
        if (node?.focus) {
          node.focus();
        }
      };

      const moveHorizontal = (delta) => {
        const nextIndex = Math.max(0, Math.min(tokens.length - 1, resolvedIndex + delta));
        focusNode(tokens[nextIndex]);
      };

      const moveVertical = (deltaRow) => {
        if (!currentRow || !activeRect) {
          moveHorizontal(deltaRow > 0 ? 1 : -1);
          return;
        }
        const targetRow = rows[rowIndex + deltaRow];
        if (!targetRow) {
          return;
        }
        const targetX = activeRect.left + activeRect.width / 2;
        let closest = targetRow.items[0];
        let minDelta = Math.abs(closest.rect.left + closest.rect.width / 2 - targetX);
        targetRow.items.forEach((item) => {
          const center = item.rect.left + item.rect.width / 2;
          const delta = Math.abs(center - targetX);
          if (delta < minDelta) {
            minDelta = delta;
            closest = item;
          }
        });
        focusNode(closest?.node);
      };

      event.preventDefault();
      if (event.key === 'ArrowLeft') {
        moveHorizontal(-1);
      } else if (event.key === 'ArrowRight') {
        moveHorizontal(1);
      } else if (event.key === 'ArrowUp') {
        moveVertical(-1);
      } else if (event.key === 'ArrowDown') {
        moveVertical(1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, open]);

  if (!open || !model) {
    return null;
  }

  const dockHeightStyle = isDocked
    ? {
        height: `${HUD_FIXED_HEIGHT}px`,
        minHeight: `${HUD_FIXED_HEIGHT}px`,
        maxHeight: `${HUD_FIXED_HEIGHT}px`,
        marginBottom: isDocked ? '24px' : undefined,
      }
    : undefined;

  if (hovered) {
    lastHoveredRef.current = hovered;
  }

  const hoverCard = lastHoveredRef.current ? (
    <SessionMapHoverCard
      anchorRect={lastHoveredRef.current.anchorRect}
      anchorEl={lastHoveredRef.current.anchorEl}
      data={lastHoveredRef.current}
      isOpen={Boolean(hovered)}
      onEnter={handleCardEnter}
      onLeave={handleCardLeave}
      onSelectSession={handleSelectAndClose}
      onRenameSession={onRenameSession}
      onOpenAvatarMenu={onUpdateSessionAvatar ? handleOpenAvatarMenu : null}
      onOpenFileShortcut={onOpenFileShortcut}
      onRevealFileShortcut={onRevealFileShortcut}
      cardRef={hoverCardRef}
      resolveFontSize={resolveFontSize}
    />
  ) : null;

  return (
    <div
      className={`${
        isDocked
          ? 'relative z-40 w-full flex-shrink-0'
          : 'pointer-events-none absolute bottom-6 left-1/2 z-40 w-[min(980px,92vw)] -translate-x-1/2'
      }`}
      style={dockHeightStyle}
      role="dialog"
      aria-label="Session map"
    >
      <div
        ref={overlayRef}
        className={`pointer-events-auto relative bg-[linear-gradient(180deg,rgba(20,25,33,0.97),rgba(10,14,19,0.98))] px-3 py-2 shadow-[0_18px_48px_rgba(0,0,0,0.32)] backdrop-blur-md overflow-hidden ${
          isDocked ? 'flex h-full min-h-0 flex-col rounded-none shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]' : 'rounded-2xl shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06),0_18px_48px_rgba(0,0,0,0.32)]'
        }`}
      >
        <div
          className="pointer-events-none absolute inset-0 z-[100] opacity-[0.025]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255, 255, 255, 0) 50%, rgba(125,211,252,0.04) 50%), linear-gradient(90deg, rgba(0, 255, 255, 0.02), rgba(0, 255, 255, 0.005), rgba(0, 255, 255, 0.02))',
            backgroundSize: '100% 2px, 3px 100%',
          }}
        />

        <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 pb-1.5">
          <div className="flex items-center gap-2 text-xs font-bold tracking-tighter text-white">
            <div className="flex h-5 w-5 items-center justify-center rounded-lg bg-cyan-500/12 text-cyan-100 shadow-[inset_0_0_0_1px_rgba(125,211,252,0.16),0_0_12px_rgba(34,211,238,0.12)]">
              <MapIcon size={12} />
            </div>
            <span className="uppercase">Tactical Session Interface</span>
            <div className="ml-2 h-1 w-1 animate-pulse rounded-full bg-cyan-300 shadow-[0_0_4px_#22d3ee]" />
          </div>
          <div className="flex flex-wrap items-center gap-3 text-[9px] font-mono text-white/70">
            <span className="font-bold text-emerald-300/90">ONLINE:{model.stats.online}</span>
            <span className="text-white/60">OFFLINE:{model.stats.offline}</span>
            <span className="text-white/20">|</span>
            <span>CELLS:{model.stats.cells}</span>
            <span>SESSIONS:{model.stats.sessions}</span>
          </div>
          <div className="flex items-center gap-2">
            {onClose ? (
              <button
                type="button"
                className="flex h-5 w-5 items-center justify-center rounded-lg bg-white/[0.04] text-white/55 transition-colors hover:bg-rose-500/18 hover:text-rose-200"
                onClick={onClose}
              >
                <X size={12} />
              </button>
            ) : null}
          </div>
        </div>

        {isDocked ? (
          <SessionMapDockLayout
            model={model}
            radarPoints={radarPoints}
            hoveredCellId={hoveredCellId}
            setHoveredCellId={setHoveredCellId}
            focusClusterCard={focusClusterCard}
            focusData={focusData}
            onTokenEnter={handleTokenEnter}
            onTokenLeave={handleTokenLeave}
            onSelectSession={handleSelectSession}
            onOpenCreateMenu={handleOpenCreateMenu}
            onOpenOfflineMenu={handleOpenOfflineMenu}
            registerClusterRef={registerClusterRef}
            canCreateSession={canCreateSession}
            harnessRuns={harnessRuns}
            sessionError={sessionError}
            onClearSessionError={onClearSessionError}
            onCancelHarnessRun={onCancelHarnessRun}
          />
        ) : (
          <SessionMapGridLayout
            model={model}
            hoveredCellId={hoveredCellId}
            setHoveredCellId={setHoveredCellId}
            registerClusterRef={registerClusterRef}
            onTokenEnter={handleTokenEnter}
            onTokenLeave={handleTokenLeave}
            onSelectSession={handleSelectSession}
            onOpenOfflineMenu={handleOpenOfflineMenu}
            onOpenCreateMenu={handleOpenCreateMenu}
            canCreateSession={canCreateSession}
          />
        )}
      </div>

      <SessionMapOfflineMenu
        isOpen={Boolean(offlineMenu)}
        position={offlineMenu ? { x: offlineMenu.x, y: offlineMenu.y } : { x: 0, y: 0 }}
        anchorRect={offlineMenu?.anchorRect || null}
        containerRef={offlineMenuRef}
        sessions={offlineMenu?.sessions || []}
        cellId={offlineMenu?.cellId}
        cell={offlineMenu?.cell || null}
        onSelectSession={(cellId, sessionId) => {
          setOfflineMenu(null);
          handleSelectSession(cellId, sessionId);
        }}
      />

      <SessionCreateMenu
        isOpen={Boolean(createMenu)}
        position={createMenu || { x: 0, y: 0 }}
        containerRef={createMenuRef}
        profiles={terminusProfiles || []}
        onCreateBase={async () => {
          if (!createMenu?.cell) {
            return;
          }
          setCreateMenu(null);
          await onCreateSession?.(createMenu.cell);
        }}
        onCreateProfile={(profile, action) => {
          const command = String(action?.command || profile?.startCommand || '').trim();
          if (!createMenu?.cell || !command) {
            setCreateMenu(null);
            return;
          }
          setCreateMenu(null);
          const modeLabel = action?.mode === 'resume' ? ' (resume)' : '';
          onDispatchCommand?.({
            command,
            kind: 'start',
            label: `${profile.label || profile.id}${modeLabel}`,
            profileId: profile.id,
            appendEnter: true,
            cellId: createMenu.cell.id,
            worktreePath: createMenu.cell.worktreePath,
          });
        }}
      />

      <AvatarPickerMenu
        isOpen={Boolean(avatarMenu)}
        position={avatarMenu || { x: 0, y: 0 }}
        containerRef={avatarMenuRef}
        selectedId={resolveSessionAvatarId(avatarMenu?.session, avatarMenu?.cell)}
        activeAvatarIds={activeAvatarIds}
        title="Select Session Avatar"
        onSelect={(id) => {
          if (!avatarMenu?.session || !avatarMenu?.cell) {
            setAvatarMenu(null);
            return;
          }
          onUpdateSessionAvatar?.(avatarMenu.session.id, id, avatarMenu.cell.id);
          setAvatarMenu(null);
        }}
      />

      {lastHoveredRef.current && typeof document !== 'undefined'
        ? createPortal(hoverCard, document.body)
        : null}
    </div>
  );
}
